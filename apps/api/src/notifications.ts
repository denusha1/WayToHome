import { Injectable, Logger } from '@nestjs/common';
import { Store } from './store';
import { Booking } from './domain';
import { config } from './config';
@Injectable()
export class Notifications {
  private logger = new Logger('Notifications');
  constructor(private store: Store) {}
  async send(b: Booking) {
    if (config.demo || b.status !== 'CONFIRMED') return;
    const text = `Your Way to Home booking ${b.id} is confirmed. Seats: ${b.seats.join(', ')}. Open your QR e-ticket: ${config.webUrl}/bookings?booking=${b.id}`;
    const channels: {
      key: 'emailSent' | 'smsSent';
      url: string;
      token: string;
      payload: object;
    }[] = [];
    if (process.env.RESEND_API_KEY && !b.emailSent)
      channels.push({
        key: 'emailSent',
        url: 'https://api.resend.com/emails',
        token: process.env.RESEND_API_KEY,
        payload: {
          from: process.env.EMAIL_FROM,
          to: [b.email],
          subject: 'Your journey is booked · Way to Home',
          text,
        },
      });
    if (process.env.SMS_API_URL && process.env.SMS_API_TOKEN && !b.smsSent)
      channels.push({
        key: 'smsSent',
        url: process.env.SMS_API_URL,
        token: process.env.SMS_API_TOKEN,
        payload: { to: b.phone, message: text },
      });
    for (const channel of channels) {
      try {
        const response = await fetch(channel.url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${channel.token}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': `ticket-${b.id}-${channel.key}`,
          },
          body: JSON.stringify(channel.payload),
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error(`Provider status ${response.status}`);
        await this.store.mutate(b.tripId, (_, bookings) => {
          const current = bookings.find((x) => x.id === b.id);
          if (current) current[channel.key] = true;
        });
      } catch {
        this.logger.warn(
          `Delivery pending: ${channel.key}, booking ${b.id}. Admin can retry.`,
        );
      }
    }
  }
}
