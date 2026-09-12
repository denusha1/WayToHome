'use client';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BusFront,
  CalendarDays,
  Route,
  Ticket,
  Plus,
  ScanLine,
} from 'lucide-react';
import { api, Booking, Trip } from '@/lib/api';
import { dateLabel, money, time } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LocationForm } from '@/components/location-form';
type Catalog = {
  buses: { id: string; name: string; capacity: number }[];
  routes: { id: string; from: string; to: string }[];
  trips: Trip[];
  bookings: Booking[];
  demo: boolean;
};
export default function Admin() {
  const [data, setData] = useState<Catalog | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('bookings');
  const refresh = useCallback(async () => {
    try {
      setData(await api<Catalog>('/admin'));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  async function submit(e: FormEvent<HTMLFormElement>, path: string) {
    e.preventDefault();
    const form = e.currentTarget;
    const values: Record<string, unknown> = Object.fromEntries(
      new FormData(form),
    );
    for (const key of ['capacity', 'price', 'duration'])
      if (key in values) values[key] = Number(values[key]);
    if ('amenities' in values)
      values.amenities = String(values.amenities)
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
    if ('departure' in values)
      values.departure = new Date(`${values.departure}:00+05:30`).toISOString();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await api<{ name?: string; seats?: number[] }>(
        `/admin/${path}`,
        { method: 'POST', body: JSON.stringify(values) },
      );
      setMessage(
        path === 'check-in'
          ? `Checked in ${result.name}, seats ${result.seats?.join(', ')}.`
          : 'Saved successfully.',
      );
      form.reset();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main" className="inner-page section-container admin-page">
      <div className="eyebrow">WAY TO HOME · OPERATIONS</div>
      <h1>A smooth journey starts here.</h1>
      <p className="text-muted-foreground">
        Manage schedules, buses, routes and passenger bookings.
      </p>
      {error && (
        <p className="error-message" role="alert">
          {error}{' '}
          {!data && <Link href="/login">Sign in with an admin account →</Link>}
        </p>
      )}
      {message && (
        <p className="success-message" role="status">
          {message}
        </p>
      )}
      {data && (
        <>
          {data.demo && (
            <p className="demo-box">
              Demo dashboard · changes reset when the server restarts. All demo
              sessions can access this dashboard.
            </p>
          )}
          <div className="stats-grid">
            {[
              {
                icon: Ticket,
                label: 'Confirmed bookings',
                value: data.bookings.filter((b) => b.status === 'CONFIRMED')
                  .length,
              },
              { icon: BusFront, label: 'Buses', value: data.buses.length },
              { icon: Route, label: 'Routes', value: data.routes.length },
              {
                icon: CalendarDays,
                label: 'Confirmed revenue',
                value: money(
                  data.bookings
                    .filter((b) => b.status === 'CONFIRMED')
                    .reduce((s, b) => s + b.amount, 0),
                ),
              },
            ].map(({ icon: Icon, label, value }) => (
              <div className="stat-card" key={label}>
                <Icon size={22} />
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="admin-tabs">
            {[
              'bookings',
              'schedule',
              'buses',
              'routes',
              'check-in',
              'tracking',
            ].map((t) => (
              <Button
                key={t}
                aria-pressed={tab === t}
                variant={tab === t ? 'default' : 'outline'}
                onClick={() => setTab(t)}
              >
                {t.replace('-', ' ')}
              </Button>
            ))}
          </div>
          {tab === 'bookings' && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Passenger</th>
                    <th>Seats</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Notifications / Refunds</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bookings
                    .filter((b) => b.status !== 'HELD')
                    .map((b) => (
                      <tr key={b.id}>
                        <td>{b.id.slice(0, 8)}</td>
                        <td>
                          {b.name || '—'}
                          <small>{b.email}</small>
                        </td>
                        <td>{b.seats.join(', ')}</td>
                        <td>{money(b.amount)}</td>
                        <td>
                          <span className="status-pill">
                            {b.status === 'PENDING' &&
                            Date.parse(b.expiresAt) <= Date.now()
                              ? 'EXPIRED'
                              : b.status}
                          </span>
                        </td>
                        <td>
                          {b.refundRequestedAt &&
                            ['CONFIRMED', 'PAYMENT_REVIEW'].includes(
                              b.status,
                            ) && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={busy}
                                onClick={async () => {
                                  if (
                                    !window.confirm(
                                      `Approve a full ${data.demo ? 'DEMO ' : ''}refund of ${money(b.amount)} for ${b.id}? This voids the ticket.`,
                                    )
                                  )
                                    return;
                                  setBusy(true);
                                  setError('');
                                  try {
                                    await api(
                                      `/admin/bookings/${b.id}/refund`,
                                      { method: 'POST' },
                                    );
                                    setMessage('Refund processed.');
                                    await refresh();
                                  } catch (e) {
                                    setError((e as Error).message);
                                    await refresh();
                                  } finally {
                                    setBusy(false);
                                  }
                                }}
                              >
                                Approve full refund
                              </Button>
                            )}
                          {b.status === 'REFUND_PENDING' && (
                            <small>
                              Reconcile this payment in PayHere before any
                              manual refund. Do not retry automatically.
                            </small>
                          )}
                          {b.refundReason && <small>{b.refundReason}</small>}
                          {b.refundReference && (
                            <small>Refund: {b.refundReference}</small>
                          )}
                          {b.status === 'CONFIRMED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await api(
                                    `/admin/bookings/${b.id}/notifications`,
                                    { method: 'POST' },
                                  );
                                  setMessage(
                                    'Notification retry processed. Check provider delivery logs.',
                                  );
                                } catch (e) {
                                  setError((e as Error).message);
                                }
                              }}
                            >
                              Retry delivery
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {!data.bookings.length && (
                <p className="p-6 text-muted-foreground">
                  Bookings will appear here when travellers reserve seats.
                </p>
              )}
            </div>
          )}
          {tab === 'schedule' && (
            <>
              <form
                className="admin-form passenger-form"
                onSubmit={(e) => submit(e, 'trips')}
              >
                <h2>Add a departure</h2>
                <div className="form-pair">
                  <label>
                    Bus
                    <select name="busId" required>
                      {data.buses.map((b) => (
                        <option value={b.id} key={b.id}>
                          {b.name} · {b.id}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Route
                    <select name="routeId" required>
                      {data.routes.map((r) => (
                        <option value={r.id} key={r.id}>
                          {r.from} → {r.to}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="form-pair">
                  <label>
                    Departure (Sri Lanka time)
                    <input name="departure" type="datetime-local" required />
                  </label>
                  <label>
                    Fare per seat (LKR)
                    <input
                      name="price"
                      type="number"
                      min="100"
                      max="100000"
                      required
                    />
                  </label>
                </div>
                <Button disabled={busy}>
                  <Plus /> Add departure
                </Button>
              </form>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Route</th>
                      <th>Bus</th>
                      <th>Departure (SL)</th>
                      <th>Fare</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.trips
                      .filter((t) => Date.parse(t.departure) > Date.now())
                      .slice(0, 50)
                      .map((t) => (
                        <tr key={t.id}>
                          <td>
                            {t.from} → {t.to}
                          </td>
                          <td>{t.bus}</td>
                          <td>
                            {dateLabel(t.departure)} {time(t.departure)}
                          </td>
                          <td>{money(t.price)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                <p className="p-4 text-sm text-muted-foreground">
                  Showing up to 50 upcoming departures.
                </p>
              </div>
            </>
          )}
          {tab === 'buses' && (
            <>
              <form
                className="admin-form passenger-form"
                onSubmit={(e) => submit(e, 'buses')}
              >
                <h2>Add a bus</h2>
                <div className="form-pair">
                  <label>
                    Bus name
                    <input name="name" required minLength={2} />
                  </label>
                  <label>
                    Registration plate
                    <input name="plate" required minLength={3} />
                  </label>
                </div>
                <div className="form-pair">
                  <label>
                    Seats
                    <input
                      name="capacity"
                      type="number"
                      min="4"
                      max="60"
                      required
                    />
                  </label>
                  <label>
                    Amenities (comma separated)
                    <input name="amenities" placeholder="AC, USB charging" />
                  </label>
                </div>
                <Button disabled={busy}>
                  <Plus /> Add bus
                </Button>
              </form>
              <div className="catalog-grid">
                {data.buses.map((b) => (
                  <article key={b.id}>
                    <BusFront />
                    <h3>{b.name}</h3>
                    <p>{b.capacity} seats</p>
                    <small>{b.id}</small>
                  </article>
                ))}
              </div>
            </>
          )}
          {tab === 'routes' && (
            <>
              <form
                className="admin-form passenger-form"
                onSubmit={(e) => submit(e, 'routes')}
              >
                <h2>Add a route</h2>
                <div className="form-pair">
                  <label>
                    From
                    <input name="from" required minLength={2} />
                  </label>
                  <label>
                    To
                    <input name="to" required minLength={2} />
                  </label>
                </div>
                <div className="form-pair">
                  <label>
                    Boarding point
                    <input name="boarding" required minLength={3} />
                  </label>
                  <label>
                    Drop-off point
                    <input name="dropping" required minLength={3} />
                  </label>
                </div>
                <label>
                  Duration (minutes)
                  <input
                    name="duration"
                    type="number"
                    min="10"
                    max="1440"
                    required
                  />
                </label>
                <Button disabled={busy}>
                  <Plus /> Add route
                </Button>
              </form>
              <div className="catalog-grid">
                {data.routes.map((r) => (
                  <article key={r.id}>
                    <Route />
                    <h3>
                      {r.from} → {r.to}
                    </h3>
                  </article>
                ))}
              </div>
            </>
          )}
          {tab === 'tracking' && <LocationForm trips={data.trips} />}{' '}
          {tab === 'check-in' && (
            <form
              className="admin-form passenger-form"
              onSubmit={(e) => submit(e, 'check-in')}
            >
              <ScanLine size={32} />
              <h2>Welcome your passenger.</h2>
              <p>
                Scan the ticket with a QR reader and paste the decoded token
                below. Each ticket can be checked in once.
              </p>
              <label>
                Ticket token
                <input
                  name="token"
                  required
                  placeholder="booking-id.signature"
                  autoComplete="off"
                />
              </label>
              <Button disabled={busy}>Validate & check in</Button>
            </form>
          )}
        </>
      )}
    </main>
  );
}
