'use client';
import { Text } from '@/components/preferences';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowUpRight,
  BusFront,
  Menu,
  X,
  Moon,
  Sun,
  Languages,
} from 'lucide-react';
import { Button } from './ui/button';
import { usePreferences, type Language } from './preferences';
export function Header() {
  const [open, setOpen] = useState(false);
  const { dark, toggleTheme, language, setLanguage, tr } = usePreferences();
  return (
    <>
      <div className="utility-bar">
        <span>
          <Text text={'Your next journey, a little closer to home.'} />
        </span>
        <Link href="/#how-it-works">
          <Text text={'Need help booking?'} />{' '}
          <u>
            <Text text={'See how it works'} />
          </u>
        </Link>
        <div className="utility-controls">
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={tr(dark ? 'Day mode' : 'Night mode')}
            aria-pressed={dark}
            title={tr(dark ? 'Day mode' : 'Night mode')}
          >
            {dark ? <Sun size={17} /> : <Moon size={17} />}
            <span>{tr(dark ? 'Day mode' : 'Night mode')}</span>
          </button>
          <span className="utility-locale">LKR · Sri Lanka</span>
          <label className="language-control">
            <Languages size={16} aria-hidden="true" />
            <select
              aria-label="Language"
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
            >
              <option value="en" lang="en">
                English
              </option>
              <option value="ta" lang="ta">
                தமிழ்
              </option>
              <option value="si" lang="si">
                සිංහල
              </option>
            </select>
          </label>
        </div>
      </div>
      <header className="site-header">
        <Link href="/" className="brand" aria-label="Way To Home homepage">
          <span className="brand-icon" aria-hidden="true">
            <svg viewBox="0 0 48 48" className="brand-symbol" fill="none">
              <path
                d="M8 23 24 9l16 14"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M13 22v16h22V22"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M21 39c-5-8 12-10 6-18"
                stroke="#edc784"
                strokeWidth="6"
                strokeLinecap="round"
              />
              <path
                d="M21 39c-5-8 12-10 6-18"
                stroke="#19374f"
                strokeWidth="1.4"
                strokeDasharray="2 4"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span>
            <span className="brand-name">
              <span className="brand-letter">W</span>ay{' '}
              <span className="brand-connector">To</span>{' '}
              <span className="brand-home">
                Home<span className="brand-dot">.</span>
              </span>
            </span>
            <small>
              <Text text={'Your happy moments waiting for you'} />
            </small>
          </span>
        </Link>
        <nav
          className={open ? 'nav-links open' : 'nav-links'}
          aria-label="Main navigation"
        >
          <Link href="/journeys" onClick={() => setOpen(false)}>
            <Text text={'Book a journey'} />
          </Link>
          <Link href="/bookings" onClick={() => setOpen(false)}>
            <Text text={'My bookings'} />
          </Link>
          <Link href="/contact" onClick={() => setOpen(false)}>
            <Text text={'Contact'} />
          </Link>
        </nav>
        <Button asChild variant="outline" className="header-signin">
          <Link href="/login">
            <Text text={'Sign in'} /> <ArrowUpRight />
          </Link>
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="mobile-menu"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </Button>
      </header>
    </>
  );
}
