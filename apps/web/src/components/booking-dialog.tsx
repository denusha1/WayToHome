'use client';
import { Text, usePreferences } from '@/components/preferences';

import { FormEvent, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import {
  Armchair,
  ArrowRight,
  Clock3,
  LoaderCircle,
  ShieldCheck,
  CircleGauge,
} from 'lucide-react';
import { API, api, Booking, Trip } from '@/lib/api';
import { money, time } from '@/lib/utils';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from './ui/dialog';
export function BookingDialog({
  trip,
  demo,
  onClose,
}: {
  trip: Trip;
  demo: boolean;
  onClose: () => void;
}) {
  const { tr } = usePreferences();
  const [seats, setSeats] = useState<{ number: number; status: string }[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [hold, setHold] = useState<Booking | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let mounted = true;
    const refresh = () =>
      api<{ seats: typeof seats }>(`/trips/${trip.id}/seats`)
        .then((r) => {
          if (mounted) setSeats(r.seats);
        })
        .catch((e) => {
          if (mounted) setError(e.message);
        });
    refresh();
    const socket = io(API);
    socket.on('seats:changed', ({ tripId }) => {
      if (tripId === trip.id) refresh();
    });
    const poll = setInterval(refresh, 10000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      mounted = false;
      socket.disconnect();
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [trip.id]);
  const remaining = hold
    ? Math.max(0, Math.ceil((Date.parse(hold.expiresAt) - now) / 1000))
    : 0;
  async function reserve() {
    setBusy(true);
    setError('');
    try {
      setHold(
        await api<Booking>('/holds', {
          method: 'POST',
          body: JSON.stringify({ tripId: trip.id, seats: selected }),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
      if ((e as Error).message.includes('just taken')) setSelected([]);
    } finally {
      setBusy(false);
    }
  }
  async function checkout(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!hold) return;
    setBusy(true);
    setError('');
    try {
      const fields = Object.fromEntries(new FormData(e.currentTarget));
      const result = await api<{
        booking: Booking;
        demo: boolean;
        payment: { action: string; fields: Record<string, string> } | null;
      }>(`/bookings/${hold.id}/checkout`, {
        method: 'POST',
        body: JSON.stringify(fields),
      });
      if (result.demo) {
        await api(`/bookings/${hold.id}/demo-payment`, { method: 'POST' });
        window.location.assign(`/bookings?booking=${hold.id}`);
      } else if (result.payment) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = result.payment.action;
        for (const [key, value] of Object.entries(result.payment.fields)) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = value;
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
      } else window.location.assign('/bookings');
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  async function close() {
    if (busy) return;
    if (hold) {
      try {
        await api(`/holds/${hold.id}`, { method: 'DELETE' });
      } catch {
        /* Server expiry releases abandoned holds. */
      }
    }
    onClose();
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) void close();
      }}
    >
      <DialogContent>
        <div className="eyebrow">
          <Text text={'MAKE YOURSELF COMFORTABLE'} />
        </div>
        <DialogTitle className="dialog-title">
          {tr(hold ? 'One step closer to home.' : 'Your journey. Your seat.')}
        </DialogTitle>
        <DialogDescription className="text-muted-foreground">
          {trip.from} → {trip.to} · {time(trip.departure)} · {trip.bus}
        </DialogDescription>
        {error && (
          <p className="error-message" role="alert">
            {error}{' '}
            {error.includes('sign in') && <a href="/login">Sign in →</a>}
          </p>
        )}
        <div className="booking-grid">
          <div className="seat-panel">
            <div className="bus-front">
              <span>
                <Text text={'FRONT OF BUS'} />
              </span>
              <CircleGauge size={23} />
            </div>
            <div className="seat-grid">
              {seats.map((seat) => (
                <button
                  key={seat.number}
                  className={`seat ${selected.includes(seat.number) ? 'selected' : ''}`}
                  disabled={
                    !!hold ||
                    (seat.status !== 'available' &&
                      !selected.includes(seat.number))
                  }
                  aria-label={`Seat ${seat.number}, ${seat.status}`}
                  aria-pressed={selected.includes(seat.number)}
                  onClick={() => {
                    setError('');
                    setSelected((s) =>
                      s.includes(seat.number)
                        ? s.filter((n) => n !== seat.number)
                        : s.length < 6
                          ? [...s, seat.number]
                          : s,
                    );
                  }}
                >
                  <Armchair size={23} />
                  <span>{seat.number}</span>
                </button>
              ))}
            </div>
            {!seats.length && <p>Loading seats…</p>}
            <div className="seat-legend">
              <span>
                <i />
                <Text text={'Available'} />
              </span>
              <span>
                <i className="chosen" />
                <Text text={'Selected'} />
              </span>
              <span>
                <i className="taken" />
                <Text text={'Taken'} />
              </span>
            </div>
          </div>
          <div>
            <div className="journey-summary">
              <span className="eyebrow">
                <Text text={'YOUR JOURNEY'} />
              </span>
              <h3>
                {trip.from} <ArrowRight size={16} /> {trip.to}
              </h3>
              <p>Board at {trip.boarding}</p>
              <p>Drop off at {trip.dropping}</p>
              <hr />
              <div className="summary-row">
                <span>
                  <Text text={'Seats'} />
                </span>
                <strong>
                  {[...selected].sort((a, b) => a - b).join(', ') ||
                    'Pick your favourite'}
                </strong>
              </div>
              <div className="summary-row">
                <span>
                  <Text text={'Total'} />
                </span>
                <strong>{money(selected.length * trip.price)}</strong>
              </div>
              <small>
                <Text text={'No extra booking fees.'} />
              </small>
            </div>
            {!hold ? (
              <>
                <p className="helper">
                  Choose up to 6 seats. We’ll hold them for 5 minutes while you
                  fill in your details.
                </p>
                <Button
                  className="w-full"
                  disabled={!selected.length || busy}
                  onClick={reserve}
                >
                  {busy ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <Armchair />
                  )}{' '}
                  Continue with {selected.length || 'your'} seat
                  {selected.length === 1 ? '' : 's'}
                </Button>
              </>
            ) : (
              <form onSubmit={checkout} className="passenger-form">
                <p className={remaining ? 'hold-timer' : 'error-message'}>
                  <Clock3 size={15} />{' '}
                  {remaining
                    ? `Seats held for ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`
                    : 'Hold expired. Close and select your seats again.'}
                </p>
                <label>
                  <Text text={'Full name'} />
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={100}
                    autoComplete="name"
                    placeholder="Your full name"
                  />
                </label>
                <div className="form-pair">
                  <label>
                    <Text text={'Email'} />
                    <input
                      name="email"
                      type="email"
                      required
                      maxLength={200}
                      autoComplete="email"
                      placeholder="you@example.com"
                    />
                  </label>
                  <label>
                    <Text text={'Mobile number'} />
                    <input
                      name="phone"
                      type="tel"
                      required
                      pattern="(\+94|0)7[0-9]{8}"
                      autoComplete="tel"
                      placeholder="0771234567"
                    />
                  </label>
                </div>
                <label>
                  <Text text={'Billing address'} />
                  <input
                    name="address"
                    required
                    minLength={3}
                    maxLength={200}
                    autoComplete="street-address"
                    placeholder="Street address"
                  />
                </label>
                <label>
                  <Text text={'City'} />
                  <input
                    name="city"
                    required
                    minLength={2}
                    maxLength={80}
                    autoComplete="address-level2"
                    placeholder="Your city"
                  />
                </label>
                <Button
                  className="w-full"
                  variant="orange"
                  disabled={busy || !remaining}
                >
                  {busy ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <ShieldCheck />
                  )}
                  {tr(
                    demo ? 'Confirm demo booking' : 'Pay securely with PayHere',
                  )}
                </Button>
                {demo && (
                  <small className="text-muted-foreground">
                    <Text text={'Demo only. No money will be charged.'} />
                  </small>
                )}
              </form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
