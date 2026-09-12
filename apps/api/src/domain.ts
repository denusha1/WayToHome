import { BadRequestException, ConflictException } from '@nestjs/common';
export type Trip = {
  id: string;
  busId: string;
  routeId: string;
  from: string;
  to: string;
  duration: number;
  boarding: string;
  dropping: string;
  bus: string;
  capacity: number;
  amenities: string[];
  departure: string;
  price: number;
};
export type Booking = {
  id: string;
  tripId: string;
  userId: string;
  seats: number[];
  amount: number;
  status:
    | 'HELD'
    | 'PENDING'
    | 'CONFIRMED'
    | 'EXPIRED'
    | 'FAILED'
    | 'PAYMENT_REVIEW'
    | 'CANCELLED'
    | 'REFUND_PENDING'
    | 'REFUNDED';
  expiresAt: string;
  createdAt: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  paymentId: string | null;
  refundRequestedAt?: string | null;
  refundReason?: string | null;
  refundReference?: string | null;
  refundedAt?: string | null;
  refundApprovedBy?: string | null;
  checkedInAt: string | null;
  emailSent: boolean;
  smsSent: boolean;
};
export const active = (b: Booking, now = Date.now()) =>
  b.status === 'CONFIRMED' ||
  (['HELD', 'PENDING'].includes(b.status) && Date.parse(b.expiresAt) > now);
export function assertSeats(
  trip: Trip,
  bookings: Booking[],
  seats: number[],
  now = Date.now(),
) {
  if (Date.parse(trip.departure) <= now)
    throw new BadRequestException('This bus has already departed.');
  if (
    !seats.length ||
    seats.length > 6 ||
    new Set(seats).size !== seats.length ||
    seats.some((s) => !Number.isInteger(s) || s < 1 || s > trip.capacity)
  )
    throw new BadRequestException(
      'Choose between 1 and 6 valid, unique seats.',
    );
  if (
    bookings.some(
      (b) => active(b, now) && b.seats.some((s) => seats.includes(s)),
    )
  )
    throw new ConflictException(
      'One of those seats was just taken. Please choose again.',
    );
}
export function demoTrips(): Trip[] {
  const routes = [
    ['Colombo', 'Kandy', 195, 1450],
    ['Colombo', 'Jaffna', 480, 3200],
    ['Colombo', 'Galle', 150, 1200],
    ['Colombo', 'Ella', 390, 2400],
    ['Kandy', 'Colombo', 195, 1450],
    ['Jaffna', 'Colombo', 480, 3200],
    ['Galle', 'Colombo', 150, 1200],
    ['Ella', 'Colombo', 390, 2400],
  ] as const;
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return Array.from({ length: 30 }, (_, day) =>
    routes.flatMap(([from, to, duration, price], route) =>
      [8, 14, 22].map((hour, service) => {
        const date = new Date(`${today}T00:00:00+05:30`);
        date.setUTCDate(date.getUTCDate() + day);
        date.setUTCHours(date.getUTCHours() + hour);
        return {
          id: `trip-${day}-${route}-${service}`,
          busId: `bus-${route}-${service}`,
          routeId: `route-${route}`,
          from,
          to,
          duration,
          price: price + service * 150,
          departure: date.toISOString(),
          bus: ['Homebound Express', 'Lanka Comfort', 'Island Nightliner'][
            service
          ],
          capacity: 40,
          amenities: ['AC', 'Reclining seats', 'USB charging'],
          boarding: `${from} Central Bus Station`,
          dropping: `${to} Central Bus Station`,
        };
      }),
    ),
  ).flat();
}
