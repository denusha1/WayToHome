'use client';
import { Text } from '@/components/preferences';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Compass,
  CalendarDays,
  ArrowUpRight,
  Download,
  RefreshCw,
  Ticket as TicketIcon,
} from 'lucide-react';
import { api, Booking, Ticket } from '@/lib/api';
import { dateLabel, money, time } from '@/lib/utils';
import { CancellationControl } from '@/components/cancellation-control';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
export default function Bookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const upcoming = (b: Booking) =>
    b.status === 'CONFIRMED' &&
    !!b.trip &&
    Date.parse(b.trip.departure) > Date.now();
  const visible = bookings.filter(
    (b) =>
      (filter === 'all' ||
        (filter === 'upcoming' && upcoming(b)) ||
        (filter === 'past' &&
          b.status === 'CONFIRMED' &&
          !!b.trip &&
          Date.parse(b.trip.departure) <= Date.now()) ||
        (filter === 'payment' &&
          ['HELD', 'PENDING', 'PAYMENT_REVIEW'].includes(b.status))) &&
      `${b.id} ${b.trip?.from} ${b.trip?.to} ${b.name}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const refresh = useCallback(async () => {
    try {
      setBookings(await api<Booking[]>('/bookings'));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);
  async function openTicket(id: string) {
    try {
      setTicket(await api<Ticket>(`/bookings/${id}/ticket`));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function resume(b: Booking) {
    try {
      const { name, email, phone, address, city } = b;
      const r = await api<{
        demo: boolean;
        payment: { action: string; fields: Record<string, string> } | null;
      }>(`/bookings/${b.id}/checkout`, {
        method: 'POST',
        body: JSON.stringify({ name, email, phone, address, city }),
      });
      if (r.demo) {
        await api(`/bookings/${b.id}/demo-payment`, { method: 'POST' });
        await refresh();
      } else if (r.payment) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = r.payment.action;
        Object.entries(r.payment.fields).forEach(([name, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = name;
          input.value = value;
          form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <main id="main" className="inner-page section-container bookings-page">
      <div className="section-heading bookings-masthead">
        <div>
          <div className="eyebrow">
            <Text text={'YOUR NEXT CHAPTER'} />
          </div>
          <h1>
            <Text text={'My journeys.'} />
          </h1>
          <p>
            <Text text={'All your plans. One little place.'} />
          </p>
        </div>
        <div className="bookings-masthead-actions">
          <Button asChild>
            <Link href="/journeys">
              <Text text="Book a journey" />
              <ArrowUpRight />
            </Link>
          </Button>
          <Button variant="outline" onClick={refresh}>
            <RefreshCw /> <Text text={'Refresh'} />
          </Button>
        </div>
      </div>
      <div className="booking-overview">
        {[
          ['Total bookings', bookings.length],
          ['Upcoming journeys', bookings.filter(upcoming).length],
          [
            'Confirmed tickets',
            bookings.filter((b) => b.status === 'CONFIRMED').length,
          ],
        ].map(([label, value], index) => (
          <div key={label}>
            <div className="booking-stat-icon" aria-hidden="true">
              {index === 0 ? (
                <Compass size={22} />
              ) : index === 1 ? (
                <CalendarDays size={22} />
              ) : (
                <TicketIcon size={22} />
              )}
            </div>
            <span>
              <Text text={String(label)} />
            </span>
            <strong>{busy ? '—' : value}</strong>
          </div>
        ))}
      </div>
      <div className="booking-toolbar">
        <div role="group" aria-label="Filter bookings">
          {[
            ['all', 'All bookings'],
            ['upcoming', 'Upcoming'],
            ['past', 'Past journeys'],
            ['payment', 'Payment & holds'],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              <Text text={label} />
            </button>
          ))}
        </div>
        <input
          aria-label="Search bookings"
          placeholder="Search reference, route or passenger"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {error && (
        <p className="error-message" role="alert">
          {error} <Link href="/login">Sign in →</Link>
        </p>
      )}
      {busy ? (
        <p role="status">Finding your journeys…</p>
      ) : !bookings.length && !error ? (
        <div className="empty-state">
          <TicketIcon size={42} />
          <h2>Your next adventure is waiting.</h2>
          <p>Book your first journey and your e-ticket will appear here.</p>
          <Button asChild>
            <Link href="/journeys">
              <Text text={'Find a bus'} /> <ArrowRight />
            </Link>
          </Button>
        </div>
      ) : (
        <>
          {!visible.length && (
            <p className="empty-state">
              <Text text="No bookings match these filters." />
            </p>
          )}
          {visible.map((b) => (
            <article key={b.id} className="booking-card">
              <div>
                <span className={`status-pill ${b.status.toLowerCase()}`}>
                  {b.status.replace('_', ' ')}
                </span>
                <h2>
                  {b.trip?.from} → {b.trip?.to}
                </h2>
                <p>
                  {b.trip &&
                    `${dateLabel(b.trip.departure)} · ${time(b.trip.departure)}`}{' '}
                  · Seats {b.seats.join(', ')}
                </p>
                <small>Booking {b.id.slice(0, 8).toUpperCase()}</small>
                <div className="booking-trip-details">
                  <div>
                    <span>
                      <Text text="Operator" />
                    </span>
                    <strong>{b.trip?.bus || '—'}</strong>
                  </div>
                  <div>
                    <span>
                      <Text text="Boarding point" />
                    </span>
                    <strong>{b.trip?.boarding || '—'}</strong>
                  </div>
                  <div>
                    <span>
                      <Text text="Arrival point" />
                    </span>
                    <strong>{b.trip?.dropping || '—'}</strong>
                  </div>
                  <div>
                    <span>
                      <Text text="Arrival" />
                    </span>
                    <strong>
                      {b.trip
                        ? `${dateLabel(new Date(Date.parse(b.trip.departure) + b.trip.duration * 60000).toISOString())} · ${time(new Date(Date.parse(b.trip.departure) + b.trip.duration * 60000).toISOString())}`
                        : '—'}
                    </strong>
                  </div>
                </div>
                <details className="booking-more">
                  <summary>
                    <Text text="Passenger & payment details" />
                  </summary>
                  <dl>
                    <dt>
                      <Text text="Passenger" />
                    </dt>
                    <dd>{b.name || 'Not provided'}</dd>
                    <dt>
                      <Text text="Email" />
                    </dt>
                    <dd>{b.email || 'Not provided'}</dd>
                    <dt>
                      <Text text="Phone" />
                    </dt>
                    <dd>{b.phone || 'Not provided'}</dd>
                    <dt>
                      <Text text="Booking reference" />
                    </dt>
                    <dd>{b.id}</dd>
                    <dt>
                      <Text text="Total fare" />
                    </dt>
                    <dd>
                      {money(b.amount)} · {b.seats.length} <Text text="seats" />
                    </dd>
                    <dt>
                      <Text text="Payment status" />
                    </dt>
                    <dd>
                      {b.status === 'REFUNDED'
                        ? 'Refund processed'
                        : b.status === 'REFUND_PENDING'
                          ? 'Refund pending reconciliation'
                          : b.status === 'CANCELLED'
                            ? 'Cancelled — payment not confirmed'
                            : b.status === 'CONFIRMED'
                              ? 'Payment verified'
                              : b.status === 'PAYMENT_REVIEW'
                                ? 'Under review'
                                : b.status === 'FAILED'
                                  ? 'Payment failed'
                                  : b.status === 'EXPIRED'
                                    ? 'Reservation expired'
                                    : 'Awaiting payment'}
                    </dd>
                    <dt>
                      <Text text="Boarding status" />
                    </dt>
                    <dd>
                      {b.checkedInAt
                        ? `Checked in · ${dateLabel(b.checkedInAt)} ${time(b.checkedInAt)}`
                        : 'Not checked in'}
                    </dd>
                  </dl>
                </details>
                {['EXPIRED', 'FAILED'].includes(b.status) && (
                  <p className="helper">
                    <Text text="This reservation is not valid for travel. Search for a new journey." />
                  </p>
                )}

                {b.status === 'PENDING' && (
                  <p className="helper">
                    Waiting for verified payment. This page refreshes
                    automatically. Seats are held until {time(b.expiresAt)}.
                  </p>
                )}
                {b.status === 'PAYMENT_REVIEW' && (
                  <p className="error-message">
                    Payment needs review by the booking team. This is not a
                    valid travel ticket.
                  </p>
                )}
              </div>
              <div className="booking-actions">
                <strong>{money(b.amount)}</strong>
                <CancellationControl booking={b} onChange={refresh} />
                {b.status === 'CONFIRMED' && (
                  <Button onClick={() => openTicket(b.id)}>
                    <TicketIcon /> <Text text={'View e-ticket'} />
                  </Button>
                )}
                {b.status === 'CONFIRMED' && (
                  <Button variant="outline" asChild>
                    <Link href={`/track/${b.tripId}`}>
                      <Text text={'Track bus'} />
                    </Link>
                  </Button>
                )}
                {b.status === 'PENDING' &&
                  Date.parse(b.expiresAt) > Date.now() && (
                    <Button variant="outline" onClick={() => resume(b)}>
                      <Text text={'Continue payment'} />
                    </Button>
                  )}
              </div>
            </article>
          ))}
        </>
      )}
      <section className="booking-help">
        <div>
          <TicketIcon />
          <h2>
            <Text text="Before you set off" />
          </h2>
          <p>
            <Text text="Check your boarding point, departure date and seat numbers. Keep your confirmed QR ticket ready to show when boarding." />
          </p>
        </div>
        <div>
          <h2>
            <Text text="Need a hand?" />
          </h2>
          <p>
            <Text text="For payment or ticket questions, include your booking reference when contacting support." />
          </p>
          <Link href="/contact">
            <Text text="Contact & booking help" /> →
          </Link>
        </div>
      </section>
      <Dialog
        open={!!ticket}
        onOpenChange={(open) => {
          if (!open) setTicket(null);
        }}
      >
        <DialogContent className="max-w-lg ticket-dialog">
          <DialogTitle className="dialog-title">
            Your ticket to a good journey.
          </DialogTitle>
          <DialogDescription>
            <Text text={'Show this QR code when you board.'} />
          </DialogDescription>
          {ticket && (
            <div className="ticket-content">
              {ticket.demo && (
                <p className="demo-label">DEMO TICKET · NOT VALID FOR TRAVEL</p>
              )}
              <h2>
                {ticket.trip.from} → {ticket.trip.to}
              </h2>
              <p>
                {dateLabel(ticket.trip.departure)} ·{' '}
                {time(ticket.trip.departure)}
              </p>
              <img
                src={ticket.qr}
                width={230}
                height={230}
                alt="Your booking QR code"
              />
              <strong>{ticket.booking.name}</strong>
              <p>
                <Text text={'Seats'} /> {ticket.booking.seats.join(', ')} ·{' '}
                {ticket.trip.bus}
              </p>
              <p className="helper">Boarding: {ticket.trip.boarding}</p>
              <p className="helper">Drop-off: {ticket.trip.dropping}</p>
              <code>{ticket.booking.id.slice(0, 8).toUpperCase()}</code>
              <div className="ticket-buttons">
                <Button onClick={() => window.print()}>
                  <Download /> <Text text={'Print / Save PDF'} />
                </Button>
              </div>
              {process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY && (
                <iframe
                  title="Boarding point map"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  width="100%"
                  height="220"
                  src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&q=${encodeURIComponent(ticket.trip.boarding + ', Sri Lanka')}`}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
