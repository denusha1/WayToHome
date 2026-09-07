'use client';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { api, ApiError, supabase } from '@/lib/api';
import { Button } from './ui/button';
export function AuthBoundary({
  children,
  admin = false,
}: {
  children: ReactNode;
  admin?: boolean;
}) {
  const [state, setState] = useState<
    'loading' | 'allowed' | 'login' | 'denied' | 'error'
  >('loading');
  const [attempt, setAttempt] = useState(0);
  const [next, setNext] = useState('/bookings');
  useEffect(() => {
    let active = true;
    setState('loading');
    setNext(location.pathname + location.search);
    async function check() {
      try {
        const health = await api<{ demo: boolean }>('/health');
        if (health.demo) {
          if (active) setState('allowed');
          return;
        }
        const { user } = await api<{ user: { id: string; admin: boolean } }>(
          '/me',
        );
        if (active) setState(admin && !user.admin ? 'denied' : 'allowed');
      } catch (e) {
        if (active)
          setState(
            e instanceof ApiError && e.status === 401 ? 'login' : 'error',
          );
      }
    }
    void check();
    // Unmount private content on session changes before checking the server again.
    const subscription = supabase?.auth.onAuthStateChange((event) => {
      if (
        event === 'SIGNED_OUT' ||
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED'
      ) {
        setState('loading');
        setAttempt((n) => n + 1);
      }
    });
    return () => {
      active = false;
      subscription?.data.subscription.unsubscribe();
    };
  }, [admin, attempt]);
  if (state === 'allowed') return children;
  return (
    <main id="main" className="inner-page section-container">
      <div className="empty-state">
        <h1>
          {state === 'loading'
            ? 'Checking your session…'
            : state === 'login'
              ? 'Sign in to continue'
              : state === 'denied'
                ? 'Admin access required'
                : 'Unable to verify your session'}
        </h1>
        <p>
          {state === 'login'
            ? 'Your bookings and tickets are available after you sign in.'
            : state === 'denied'
              ? 'This account does not have permission to access the admin dashboard.'
              : state === 'error'
                ? 'Please retry when the booking service is available.'
                : ''}
        </p>
        {state === 'login' && (
          <Button asChild>
            <Link href={`/login?next=${encodeURIComponent(next)}`}>
              Sign in
            </Link>
          </Button>
        )}
        {state === 'error' && (
          <Button onClick={() => setAttempt((n) => n + 1)}>Try again</Button>
        )}
        {state === 'denied' && <Link href="/bookings">My bookings →</Link>}
      </div>
    </main>
  );
}
