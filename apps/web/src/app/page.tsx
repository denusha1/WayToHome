'use client';
import { Text, usePreferences } from '@/components/preferences';

import { FormEvent, useEffect, useState, useTransition } from 'react';
import {
  ArrowDownUp,
  ArrowRight,
  ArrowUpRight,
  Armchair,
  BusFront,
  CalendarDays,
  MapPin,
  Search,
  ShieldCheck,
  Ticket,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api';
import { today } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
export default function Home() {
  const { tr } = usePreferences();
  const router = useRouter();
  const [from, setFrom] = useState('Colombo');
  const [to, setTo] = useState('Kandy');
  const [date, setDate] = useState('');
  const [cities, setCities] = useState([
    'Colombo',
    'Kandy',
    'Jaffna',
    'Kilinochchi',
    'Vavuniya',
    'Puthukudiyiruppu',
    'Galle',
    'Ella',
  ]);
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState('');
  const [busy, startNavigation] = useTransition();
  useEffect(() => {
    setDate(today());
    api<{ demo: boolean }>('/health')
      .then((r) => setDemo(r.demo))
      .catch(() => {});
    api<string[]>('/cities')
      .then(setCities)
      .catch(() => {});
  }, []);
  async function search(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (from === to) {
      setError('Choose a different destination to start your journey.');
      return;
    }
    startNavigation(() =>
      router.push(`/journeys?${new URLSearchParams({ from, to, date })}`),
    );
  }
  return (
    <main id="main">
      <div className="photo-hero" id="journey">
        <Image
          src="/images/journey-bus.avif"
          alt="A coach travelling on a desert road beside the Egyptian pyramids"
          fill
          preload
          unoptimized
          sizes="100vw"
          className="hero-background"
        />
        <div className="hero-shade" aria-hidden="true" />
        <section className="hero">
          <div className="hero-copy">
            <div className="hero-badge">
              <span className="live-dot" />{' '}
              <Text text={'EVERY JOURNEY HAS A HOMECOMING'} />
            </div>
            <h1>
              <Text text={'Your journey home'} />
              <br />
              <Text text={'starts'} />{' '}
              <span>
                <Text text={'here.'} />
              </span>
            </h1>
            <h2>
              <Text text={'Book your bus. Pick your seat.'} />
              <br className="desktop-break" />{' '}
              <Text text={'Enjoy the journey.'} />
            </h2>
            <p>
              <Text
                text={
                  'Travel across Sri Lanka with ease. Find your route, choose your preferred seat, book securely, and get ready to ride — all in just a few clicks.'
                }
              />
            </p>
          </div>
        </section>
        <section className="search-wrap" aria-label="Find a bus">
          <div className="search-tab">
            <BusFront size={17} /> <Text text={'Let’s find your way home'} />
          </div>
          <form className="search-form" onSubmit={search}>
            <label className="search-field">
              <MapPin />
              <span>
                <b>
                  <Text text={'From'} />
                </b>
                <select
                  aria-label="From"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  required
                >
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {tr(city)}
                    </option>
                  ))}
                </select>
                <small>
                  <Text text={'Where are you starting?'} />
                </small>
              </span>
            </label>
            <button
              type="button"
              className="swap-button"
              aria-label="Swap origin and destination"
              onClick={() => {
                setFrom(to);
                setTo(from);
              }}
            >
              <ArrowDownUp size={18} />
            </button>
            <label className="search-field">
              <MapPin />
              <span>
                <b>
                  <Text text={'To'} />
                </b>
                <select
                  aria-label="To"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  required
                >
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {tr(city)}
                    </option>
                  ))}
                </select>
                <small>
                  <Text text={'Where are you heading?'} />
                </small>
              </span>
            </label>
            <label className="search-field date-field">
              <CalendarDays />
              <span>
                <b>
                  <Text text={'Travel date'} />
                </b>
                <input
                  aria-label="Travel date"
                  type="date"
                  value={date}
                  min={today()}
                  required
                  onChange={(e) => setDate(e.target.value)}
                />
                <small>
                  <Text text={'Choose your journey date'} />
                </small>
              </span>
            </label>
            <Button
              type="submit"
              variant="orange"
              className="search-submit"
              disabled={busy}
            >
              <Search size={19} />
              {tr(busy ? 'Finding buses…' : 'Search Buses')}
              <ArrowRight size={18} />
            </Button>
          </form>
          {error && (
            <p role="alert" className="error-message">
              {error}
            </p>
          )}
          <div className="search-bottom">
            <span>
              <ShieldCheck size={14} />{' '}
              <Text text={'Your next journey is in good hands.'} />
            </span>
            {demo && (
              <span className="demo-label">
                <Text text={'Demo preview · sample schedules & payments'} />
              </span>
            )}
            <span>
              <Text text={'Less planning. More living.'} />{' '}
              <span className="sun-mark">☀</span>
            </span>
          </div>
        </section>
      </div>
      <section className="promise-section section-container" id="how-it-works">
        <div className="eyebrow">
          <Text text={'THE JOY IS IN THE JOURNEY'} />
        </div>
        <h2>
          <Text text={'Simple booking. Comfortable journeys.'} />
          <br />
          <span>
            <Text text={'Closer to home.'} />
          </span>
        </h2>
        <p>
          <Text
            text={
              'Whether you’re heading home, visiting family, travelling for work, or exploring'
            }
          />
          <br className="desktop-break" /> <Text text={'somewhere new,'} />{' '}
          <strong>Way To Home</strong>{' '}
          <Text
            text={'makes every journey simpler from the moment you book.'}
          />
        </p>
        <div className="benefits">
          {[
            {
              icon: Zap,
              title: 'Easy Booking',
              text: 'Your next journey, just a few clicks away.',
              step: '01',
            },
            {
              icon: ShieldCheck,
              title: 'Secure Payments',
              text: 'A little peace of mind with every payment.',
              step: '02',
            },
            {
              icon: Armchair,
              title: 'Real-Time Seats',
              text: 'Window or aisle? The choice is yours.',
              step: '03',
            },
            {
              icon: Ticket,
              title: 'Instant E-Tickets',
              text: 'Book it. Get your ticket. You’re on your way.',
              step: '04',
            },
          ].map(({ icon: Icon, title, text, step }) => (
            <article className="benefit" key={title}>
              <div className="benefit-top">
                <span className="benefit-icon">
                  <Icon size={25} />
                </span>
                <span>{step}</span>
              </div>
              <h3>{tr(title)}</h3>
              <p>{tr(text)}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="destinations section-container">
        <div className="section-heading">
          <div>
            <div className="eyebrow">
              <Text text={'FAMILIAR ROADS. NEW MEMORIES.'} />
            </div>
            <h2>
              <Text text={'Where will you go next?'} />
            </h2>
          </div>
          <span className="text-muted-foreground">
            <Text text={'A few favourite ways home'} />{' '}
            <ArrowUpRight size={18} />
          </span>
        </div>
        <div className="destination-grid">
          {[
            {
              city: 'Kandy',
              tag: 'INTO THE HILL COUNTRY',
              className: 'kandy',
              symbol: '♧',
              text: 'Cool hills. Warm welcomes.',
            },
            {
              city: 'Galle',
              tag: 'TAKE THE COASTAL ROAD',
              className: 'galle',
              symbol: '☀',
              text: 'Salt in the air. Not a care.',
            },
            {
              city: 'Jaffna',
              tag: 'A LITTLE FURTHER NORTH',
              className: 'jaffna',
              symbol: '❋',
              text: 'Rich culture. Lasting memories.',
            },
          ].map((d) => (
            <button
              key={d.city}
              className={`destination ${d.className}`}
              onClick={() => {
                router.push(
                  `/journeys?${new URLSearchParams({ from: 'Colombo', to: d.city, date: date || today() })}`,
                );
              }}
            >
              <span className="destination-art" aria-hidden="true">
                {d.symbol}
                <i />
                <i />
                <i />
              </span>
              <span className="destination-content">
                <small>{tr(d.tag)}</small>
                <strong>
                  <Text text={'Colombo'} /> <ArrowRight size={21} />{' '}
                  {tr(d.city)}
                </strong>
                <span>{tr(d.text)}</span>
              </span>
              <span className="destination-arrow">
                <ArrowUpRight size={20} />
              </span>
            </button>
          ))}
        </div>
      </section>
      <section className="home-banner section-container">
        <div>
          <span className="eyebrow">
            <Text text={'MORE THAN A DESTINATION'} />
          </span>
          <h2>
            <Text text={'There’s no place like home.'} />
            <br />
            <Text text={'Let’s get you there.'} />
          </h2>
          <p>
            <Text
              text={'Your seat is waiting. Your next chapter starts here.'}
            />
          </p>
        </div>
        <Button variant="orange" asChild>
          <Link href="/journeys">
            <Text text={'Find your journey'} /> <ArrowRight />
          </Link>
        </Button>
        <div className="banner-orbit" aria-hidden="true">
          <BusFront size={56} />
        </div>
      </section>
    </main>
  );
}
