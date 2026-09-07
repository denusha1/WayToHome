import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import QRCode from 'qrcode';
import { Store } from './store';
import { active, assertSeats, Booking } from './domain';
import { CheckoutDto, HoldDto } from './dto';
import { config } from './config';
import { Realtime } from './realtime';
import {
  paymentForm,
  verifyPayment,
  refundPayment,
  requireRefundConfig,
} from './payment';
import { Notifications } from './notifications';
@Injectable()
export class BookingService {
  constructor(
    private store: Store,
    private realtime: Realtime,
    private notifications: Notifications,
  ) {}
  async get(id: string, userId?: string) {
    const b = (await this.store.bookings()).find((b) => b.id === id);
    if (!b) throw new NotFoundException('Booking not found.');
    if (userId && b.userId !== userId) throw new ForbiddenException();
    return b;
  }
  async inventory(tripId: string) {
    const trip = (await this.store.trips()).find((t) => t.id === tripId);
    if (!trip) throw new NotFoundException('Journey not found.');
    const bookings = (await this.store.bookings()).filter(
      (b) => b.tripId === tripId && active(b),
    );
    return {
      trip,
      seats: Array.from({ length: trip.capacity }, (_, i) => ({
        number: i + 1,
        status: bookings.some((b) => b.seats.includes(i + 1))
          ? 'unavailable'
          : 'available',
      })),
    };
  }
  async hold(dto: HoldDto, userId: string) {
    const b = await this.store.mutate(dto.tripId, (trip, bookings) => {
      // Replacing a user's unsubmitted selection is atomic with the new hold.
      for (const old of bookings)
        if (old.userId === userId && old.status === 'HELD')
          old.status = 'EXPIRED';
      assertSeats(trip, bookings, dto.seats);
      const booking: Booking = {
        id: randomUUID(),
        tripId: trip.id,
        userId,
        seats: [...dto.seats].sort((a, b) => a - b),
        amount: trip.price * dto.seats.length,
        status: 'HELD',
        expiresAt: new Date(Date.now() + 5 * 60000).toISOString(),
        createdAt: new Date().toISOString(),
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        paymentId: null,
        checkedInAt: null,
        emailSent: false,
        smsSent: false,
      };
      bookings.push(booking);
      return booking;
    });
    this.realtime.changed(dto.tripId);
    return b;
  }
  async release(id: string, userId: string) {
    const b = await this.get(id, userId);
    await this.store.mutate(b.tripId, (_, bookings) => {
      const current = bookings.find((x) => x.id === id)!;
      if (current.status === 'HELD') current.status = 'EXPIRED';
    });
    this.realtime.changed(b.tripId);
    return { ok: true };
  }
  async cancel(id: string, userId: string, reason: string) {
    const existing = await this.get(id, userId);
    const result = await this.store.mutate(
      existing.tripId,
      (trip, bookings) => {
        const b = bookings.find((x) => x.id === id)!;
        if (['CANCELLED', 'REFUNDED', 'REFUND_PENDING'].includes(b.status))
          return b;
        if (b.checkedInAt || Date.parse(trip.departure) <= Date.now())
          throw new ConflictException(
            'Cancellation is unavailable after departure or check-in. Contact support.',
          );
        if (['HELD', 'PENDING'].includes(b.status)) {
          b.status = 'CANCELLED';
          b.refundReason = reason;
        } else if (
          b.status === 'CONFIRMED' ||
          (b.status === 'PAYMENT_REVIEW' && b.paymentId)
        ) {
          b.refundRequestedAt ||= new Date().toISOString();
          b.refundReason ||= reason;
        } else throw new ConflictException('This booking cannot be cancelled.');
        return b;
      },
    );
    this.realtime.changed(existing.tripId);
    return result;
  }
  async refund(id: string, adminId: string) {
    const existing = await this.get(id);
    if (existing.status === 'REFUNDED') return existing;
    if (!config.demo) requireRefundConfig();
    // Persist the claim before calling the provider. Concurrent/repeated requests
    // cannot send a second refund. An ambiguous result stays pending for reconciliation.
    const claimed = await this.store.mutate(existing.tripId, (_, bookings) => {
      const b = bookings.find((x) => x.id === id)!;
      if (
        !['CONFIRMED', 'PAYMENT_REVIEW'].includes(b.status) ||
        !b.paymentId ||
        !b.refundRequestedAt ||
        b.checkedInAt
      )
        throw new ConflictException(
          'Refund requires a requested, unprocessed payment. Pending refunds must be reconciled with PayHere.',
        );
      b.status = 'REFUND_PENDING';
      b.refundApprovedBy = adminId;
      return b;
    });
    this.realtime.changed(existing.tripId);
    let reference: string;
    try {
      reference = config.demo
        ? `demo-refund-${id}`
        : await refundPayment(
            claimed.paymentId!,
            claimed.refundReason || 'Booking cancellation',
          );
    } catch {
      throw new ServiceUnavailableException(
        'Refund outcome needs reconciliation in PayHere. The booking stays REFUND_PENDING; do not submit another refund.',
      );
    }
    return this.store.mutate(existing.tripId, (_, bookings) => {
      const b = bookings.find((x) => x.id === id)!;
      b.status = 'REFUNDED';
      b.refundReference = reference;
      b.refundedAt = new Date().toISOString();
      return b;
    });
  }
  async checkout(id: string, dto: CheckoutDto, userId: string) {
    const existing = await this.get(id, userId);
    const b = await this.store.mutate(existing.tripId, (_, bookings) => {
      const b = bookings.find((x) => x.id === id)!;
      if (b.status === 'CONFIRMED') return b;
      if (!['HELD', 'PENDING'].includes(b.status) || !active(b))
        throw new ConflictException(
          'Seat hold expired. Please select your seats again.',
        );
      Object.assign(b, dto);
      if (b.status === 'HELD')
        b.expiresAt = new Date(Date.now() + 15 * 60000).toISOString();
      b.status = 'PENDING';
      return b;
    });
    return {
      booking: b,
      payment: config.demo || b.status === 'CONFIRMED' ? null : paymentForm(b),
      demo: config.demo,
    };
  }
  async confirmDemo(id: string, userId: string) {
    if (!config.demo)
      throw new ForbiddenException('Demo payments are disabled.');
    const existing = await this.get(id, userId);
    const b = await this.store.mutate(existing.tripId, (_, bookings) => {
      const b = bookings.find((x) => x.id === id)!;
      if (b.status === 'CONFIRMED') return b;
      if (b.status !== 'PENDING' || !active(b))
        throw new ConflictException('This payment session expired.');
      b.status = 'CONFIRMED';
      b.paymentId = `demo-${id}`;
      return b;
    });
    this.realtime.changed(b.tripId);
    return b;
  }
  async notify(body: Record<string, string>) {
    if (config.demo)
      throw new ForbiddenException(
        'Real payment callbacks are disabled in demo mode.',
      );
    const existing = await this.get(body.order_id);
    verifyPayment(body, existing);
    const b = await this.store.mutate(existing.tripId, (_, bookings) => {
      const b = bookings.find((x) => x.id === existing.id)!;
      if (b.paymentId && b.paymentId !== body.payment_id)
        throw new ConflictException('Payment ID does not match.');
      if (['REFUND_PENDING', 'REFUNDED'].includes(b.status)) return b;
      if (b.status === 'CONFIRMED' && body.status_code !== '-3') return b;
      if (body.status_code === '2') {
        // A late payment must never claim a seat released to another traveller.
        b.status =
          b.status === 'PENDING' && active(b) ? 'CONFIRMED' : 'PAYMENT_REVIEW';
        b.paymentId = body.payment_id;
        if (b.status === 'PAYMENT_REVIEW') {
          b.refundRequestedAt ||= new Date().toISOString();
          b.refundReason ||=
            'Payment arrived after the reservation was released';
        }
      } else if (body.status_code === '-3') {
        b.status = 'PAYMENT_REVIEW';
        b.paymentId = body.payment_id;
      } else if (
        ['-1', '-2'].includes(body.status_code) &&
        b.status === 'PENDING'
      )
        b.status = 'FAILED';
      return b;
    });
    this.realtime.changed(b.tripId);
    await this.notifications.send(b);
    return { received: true };
  }
  private sign(id: string) {
    return createHmac('sha256', config.ticketSecret).update(id).digest('hex');
  }
  async ticket(id: string, userId: string) {
    const b = await this.get(id, userId);
    if (b.status !== 'CONFIRMED')
      throw new BadRequestException(
        'Your ticket becomes available after payment confirmation.',
      );
    const token = `${b.id}.${this.sign(b.id)}`;
    return {
      booking: b,
      trip: (await this.store.trips()).find((t) => t.id === b.tripId),
      qr: await QRCode.toDataURL(token, { width: 280, margin: 2 }),
      token,
      demo: config.demo,
    };
  }
  async checkIn(token: string) {
    const [id, signature, extra] = token.split('.');
    if (
      extra ||
      !signature ||
      !/^[a-f0-9]{64}$/.test(signature) ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(this.sign(id)))
    )
      throw new BadRequestException('Invalid ticket signature.');
    const b = await this.get(id);
    return this.store.mutate(b.tripId, (trip, bookings) => {
      const b = bookings.find((x) => x.id === id)!;
      if (b.status !== 'CONFIRMED')
        throw new BadRequestException('Ticket is not valid.');
      if (b.checkedInAt)
        throw new ConflictException('This ticket has already been checked in.');
      if (Math.abs(Date.now() - Date.parse(trip.departure)) > 24 * 3600000)
        throw new BadRequestException(
          'Check-in opens within 24 hours of departure.',
        );
      b.checkedInAt = new Date().toISOString();
      return {
        id: b.id,
        seats: b.seats,
        name: b.name,
        checkedInAt: b.checkedInAt,
      };
    });
  }
}
