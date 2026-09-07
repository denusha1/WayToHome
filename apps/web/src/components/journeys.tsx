'use client';
import { FormEvent, useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  ArrowDownUp,
  BusFront,
  Clock3,
  MapPin,
  Moon,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { api, Trip } from '@/lib/api';
import { today, time, dateLabel, money } from '@/lib/utils';
import { BookingDialog } from './booking-dialog';
import { Button } from './ui/button';
import { Text, usePreferences } from './preferences';
const fallbackCities = [
  'Colombo',
  'Ella',
  'Galle',
  'Jaffna',
  'Kandy',
  'Kilinochchi',
  'Puthukudiyiruppu',
  'Vavuniya',
];
function addDays(date: string, amount: number) {
  return new Date(Date.parse(`${date}T12:00:00Z`) + amount * 86400000)
    .toISOString()
    .slice(0, 10);
}
function dateValid(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date));
}
export function Journeys() {
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();
  const params = useSearchParams();
  const { tr, language } = usePreferences();
  const start = today();
  const selectedDate = params.get('date') || start;
  const origin = params.get('from') || '';
  const destination = params.get('to') || '';
  const [from, setFrom] = useState(origin);
  const [to, setTo] = useState(destination);
  const [date, setDate] = useState(selectedDate);
  const [cities, setCities] = useState(fallbackCities);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [demo, setDemo] = useState(false);
  const [departure, setDeparture] = useState('');
  const [via, setVia] = useState('');
  const [operator, setOperator] = useState('');
  const [page, setPage] = useState(1);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    api<string[]>('/cities')
      .then(setCities)
      .catch(() => {});
    api<{ demo: boolean }>('/health')
      .then((r) => setDemo(r.demo))
      .catch(() => {});
  }, []);
  useEffect(() => {
    setFrom(origin);
    setTo(destination);
    setDate(selectedDate);
    setPage(1);
    setDeparture('');
    setVia('');
    setOperator('');
  }, [origin, destination, selectedDate]);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError('');
    setTrips([]);
    if (!dateValid(selectedDate)) {
      setError('Choose a valid travel date.');
      setBusy(false);
      return;
    }
    api<Trip[]>(
      `/trips?${new URLSearchParams({ from: origin, to: destination, date: selectedDate })}`,
      { signal: controller.signal },
    )
      .then(setTrips)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [origin, destination, selectedDate, refresh]);
  function navigate(nextDate: string, nextFrom = origin, nextTo = destination) {
    startNavigation(() => {
      router.push(
        `/journeys?${new URLSearchParams({ from: nextFrom, to: nextTo, date: nextDate })}`,
        { scroll: false },
      );
    });
  }
  function search(e: FormEvent) {
    e.preventDefault();
    if (from && from === to) {
      setError('Choose a different destination to start your journey.');
      return;
    }
    if (from === origin && to === destination && date === selectedDate)
      setRefresh((n) => n + 1);
    else navigate(date, from, to);
  }
  const filtered = useMemo(
    () =>
      trips
        .filter((t) => {
          const hour = Number(time(t.departure).slice(0, 2));
          return (
            (!operator || t.bus === operator) &&
            (!via || [t.boarding, t.dropping].includes(via)) &&
            (!departure ||
              (departure === 'morning' && hour >= 5 && hour < 12) ||
              (departure === 'afternoon' && hour >= 12 && hour < 18) ||
              (departure === 'night' && (hour >= 18 || hour < 5)))
          );
        })
        .sort((a, b) => Date.parse(a.departure) - Date.parse(b.departure)),
    [trips, operator, via, departure],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 6));
  const current = Math.min(page, pages);
  const locale =
    language === 'ta' ? 'ta-LK' : language === 'si' ? 'si-LK' : 'en-GB';
  return (
    <main id="main" className="journeys-page">
      <section className="journeys-search-band">
        <div className="section-container">
          <span className="journeys-kicker">
            WAY TO HOME / <Text text="Journeys" />
          </span>
          <h1>
            <Text text="Your next happy journey." />
          </h1>
          <div className="journey-steps" aria-label="Booking steps">
            {['Search Buses', 'Select seats', 'View e-ticket'].map(
              (label, index) => (
                <span key={label}>
                  <b>0{index + 1}</b>
                  <Text text={label} />
                  {index < 2 && <ArrowRight size={14} aria-hidden="true" />}
                </span>
              ),
            )}
          </div>
          <form className="journeys-search" onSubmit={search}>
            <label>
              <span>
                <MapPin size={15} />
                <Text text="From" />
              </span>
              <select
                aria-label="From"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              >
                <option value="">{tr('All origins')}</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {tr(c)}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="journeys-swap"
              type="button"
              aria-label="Swap origin and destination"
              onClick={() => {
                setFrom(to);
                setTo(from);
              }}
            >
              <ArrowDownUp size={19} />
            </button>
            <label>
              <span>
                <MapPin size={15} />
                <Text text="To" />
              </span>
              <select
                aria-label="To"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              >
                <option value="">{tr('All destinations')}</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {tr(c)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>
                <Clock3 size={15} />
                <Text text="Travel Date" />
              </span>
              <input
                aria-label="Travel date"
                type="date"
                required
                min={start}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <Button type="submit">
              <Search size={18} />
              <Text text="Search Buses" />
            </Button>
          </form>
        </div>
      </section>
      <div className="section-container journeys-body">
        <nav className="journey-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span>/</span>
          <span>
            <Text text="Journeys" />
          </span>
        </nav>
        <div className="journeys-layout">
          <aside className="journey-filters">
            <h2>
              <SlidersHorizontal size={18} />
              <Text text="Filters" />
            </h2>
            <label>
              <Text text="Departure time" />
              <select
                disabled={busy || navigating}
                aria-label={tr('Departure time')}
                value={departure}
                onChange={(e) => {
                  setDeparture(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">{tr('Any time')}</option>
                <option value="morning">05:00 – 12:00</option>
                <option value="afternoon">12:00 – 18:00</option>
                <option value="night">18:00 – 05:00</option>
              </select>
            </label>
            <label>
              <Text text="Via" />
              <select
                disabled={busy || navigating}
                aria-label={tr('Via')}
                value={via}
                onChange={(e) => {
                  setVia(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">{tr('All stops')}</option>
                {[...new Set(trips.flatMap((t) => [t.boarding, t.dropping]))]
                  .sort()
                  .map((s) => (
                    <option key={s}>{s}</option>
                  ))}
              </select>
              <small>
                <Text text="Boarding and arrival stops" />
              </small>
            </label>
            <label>
              <Text text="Operator" />
              <select
                disabled={busy || navigating}
                aria-label={tr('Operator')}
                value={operator}
                onChange={(e) => {
                  setOperator(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">{tr('All operators')}</option>
                {[...new Set(trips.map((t) => t.bus))].sort().map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <button
              className="clear-filters"
              onClick={() => {
                setDeparture('');
                setVia('');
                setOperator('');
                setPage(1);
              }}
            >
              <Text text="Remove filters" />
            </button>
            <div className="journey-filter-note">
              <BusFront />
              <p>
                <Text text="A seat for your next story." />
              </p>
              <small>
                <Text text="Choose your journey. We’ll help you get there." />
              </small>
            </div>
          </aside>
          <section className="journey-list" aria-label="Available journeys">
            <div className="journey-date-strip" aria-label="Choose travel date">
              {Array.from({ length: 30 }, (_, i) => addDays(start, i)).map(
                (d) => (
                  <button
                    key={d}
                    aria-pressed={d === selectedDate}
                    onClick={() => navigate(d)}
                  >
                    <small>
                      {new Date(d + 'T12:00:00Z').toLocaleDateString(locale, {
                        weekday: 'short',
                      })}
                    </small>
                    <strong>
                      {new Date(d + 'T12:00:00Z').toLocaleDateString(locale, {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </strong>
                  </button>
                ),
              )}
            </div>
            <div className="journey-list-heading">
              <div>
                <h2>
                  {origin ? tr(origin) : tr('All origins')}{' '}
                  <ArrowRight size={18} />{' '}
                  {destination ? tr(destination) : tr('All destinations')}
                </h2>
                <p>
                  {dateValid(selectedDate)
                    ? dateLabel(selectedDate + 'T12:00:00+05:30')
                    : selectedDate}{' '}
                  · {filtered.length} <Text text="journeys found" />
                </p>
              </div>
              {demo && (
                <span className="demo-label">
                  <Text text="Demo preview" />
                </span>
              )}
            </div>
            {busy || navigating ? (
              <div className="journey-empty" role="status">
                <Text text="Finding your next journey…" />
              </div>
            ) : error ? (
              <div className="journey-empty" role="alert">
                {tr(error)}
                <Button onClick={() => setRefresh((n) => n + 1)}>
                  <Text text="Try again" />
                </Button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="journey-empty">
                <BusFront size={36} />
                <h3>
                  <Text text="No journeys found" />
                </h3>
                <p>
                  <Text text="Try another date, route or remove your filters." />
                </p>
                <Button
                  onClick={() =>
                    navigate(
                      addDays(
                        dateValid(selectedDate) ? selectedDate : start,
                        1,
                      ),
                    )
                  }
                >
                  <Text text="Check next day" />
                </Button>
              </div>
            ) : (
              filtered.slice((current - 1) * 6, current * 6).map((t) => {
                const arrival = new Date(
                  Date.parse(t.departure) + t.duration * 60000,
                ).toISOString();
                const overnight = dateLabel(arrival) !== dateLabel(t.departure);
                return (
                  <article className="journey-card" key={t.id}>
                    <div className="journey-card-title">
                      <div className="journey-bus-icon">
                        <BusFront size={25} />
                      </div>
                      <div>
                        <h3>
                          {tr(t.from)} <span>→</span> {tr(t.to)}
                        </h3>
                        <p>
                          {t.bus} · {t.amenities.join(' · ')}
                        </p>
                      </div>
                      <span className="journey-service">
                        {tr(overnight ? 'Overnight journey' : 'Day journey')}
                      </span>
                    </div>
                    <div className="journey-card-main">
                      <div>
                        <small>
                          <Text text="DEPARTURE" />
                        </small>
                        <strong>{time(t.departure)}</strong>
                        <p>{t.boarding}</p>
                        <span>{dateLabel(t.departure)}</span>
                      </div>
                      <div className="journey-duration">
                        <Clock3 size={15} />
                        <span>
                          {Math.floor(t.duration / 60)}h {t.duration % 60}m
                        </span>
                        <div className="journey-track">
                          <i />
                          <span />
                          <BusFront size={19} />
                          <span />
                          <i />
                        </div>
                      </div>
                      <div>
                        <small>
                          <Text text="ARRIVAL" />
                        </small>
                        <strong>
                          {time(arrival)} {overnight && <em>+1</em>}
                        </strong>
                        <p>{t.dropping}</p>
                        <span>{dateLabel(arrival)}</span>
                      </div>
                      <div className="journey-fare">
                        <small>
                          <Text text="Per seat" />
                        </small>
                        <strong>{money(t.price)}</strong>
                        <span className={t.available < 5 ? 'seats-low' : ''}>
                          {t.available
                            ? `${t.available} ${tr('seats available')}`
                            : tr('Fully booked')}
                        </span>
                      </div>
                    </div>
                    {overnight && (
                      <p className="journey-overnight">
                        <Moon size={15} />
                        <Text text="This journey arrives the next day. Please plan accordingly." />
                      </p>
                    )}
                    <div className="journey-card-actions">
                      <div className="journey-disclosures">
                        <details>
                          <summary>
                            <Text text="Details" />
                          </summary>
                          <p>
                            {t.bus} · {t.capacity} <Text text="seats" />.{' '}
                            {t.amenities.join(' · ')}.{' '}
                            <Text text="Choose your seat before payment." />
                          </p>
                        </details>
                        <details>
                          <summary>
                            <Text text="Timetable" />
                          </summary>
                          <p>
                            {time(t.departure)} · {t.boarding} (
                            {dateLabel(t.departure)})<br />
                            {time(arrival)} · {t.dropping} ({dateLabel(arrival)}
                            )
                          </p>
                        </details>
                      </div>
                      {t.available ? (
                        <Button onClick={() => setTrip(t)}>
                          <Text text="Select seats" />
                          <ArrowRight size={17} />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() =>
                            navigate(addDays(selectedDate, 1), t.from, t.to)
                          }
                        >
                          <Text text="Check next day" />
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })
            )}
            {!busy && !error && pages > 1 && (
              <nav className="journey-pagination" aria-label="Journey pages">
                {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    aria-current={n === current ? 'page' : undefined}
                    onClick={() => {
                      setPage(n);
                      document
                        .querySelector('.journey-list-heading')
                        ?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'start',
                        });
                    }}
                  >
                    {n}
                  </button>
                ))}
              </nav>
            )}
          </section>
        </div>
      </div>
      {trip && (
        <BookingDialog
          trip={trip}
          demo={demo}
          onClose={() => {
            setTrip(null);
            setRefresh((n) => n + 1);
          }}
        />
      )}
    </main>
  );
}
