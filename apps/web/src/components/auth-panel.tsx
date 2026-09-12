'use client';
import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  Check,
  LockKeyhole,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react';
import { api, supabase } from '@/lib/api';
import {
  parseIdentity,
  safeAuthNext,
  requestSignIn,
  socialSignIn,
  verifyPhoneCode,
  type Identity,
} from '@/lib/auth';
import { usePreferences } from './preferences';
import { Button } from './ui/button';

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.23c1.89-1.74 2.99-4.31 2.99-7.36Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.61-2.41l-3.23-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.07a10 10 0 0 0 0 9.02l3.34-2.59Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.96c1.47 0 2.79.5 3.82 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59A5.99 5.99 0 0 1 12 5.96Z"
      />
    </svg>
  );
}

export function AuthPanel({ signup = false }: { signup?: boolean }) {
  const { tr } = usePreferences();
  const [identifier, setIdentifier] = useState('');
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [demo, setDemo] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [next, setNext] = useState('/bookings');
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const remaining = Math.max(0, Math.ceil((resendAt - now) / 1000));
  useEffect(() => {
    setNext(safeAuthNext(new URLSearchParams(location.search).get('next')));
    let active = true;
    api<{ demo: boolean }>('/health')
      .then((r) => {
        if (active) setDemo(r.demo);
      })
      .catch(() => {});
    const params = new URLSearchParams(window.location.hash.slice(1));
    if (params.has('error'))
      setError(
        'Sign-in was cancelled or could not be completed. Please try again.',
      );
    if (!supabase)
      return () => {
        active = false;
      };
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (active) {
          if (error) setError(error.message);
          setSignedIn(!!data.session);
        }
      })
      .catch(() => {
        if (active)
          setError(
            'Sign-in is temporarily unavailable. Please try again later.',
          );
      });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setSignedIn(!!session);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!resendAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [resendAt]);
  async function send(value: Identity) {
    await requestSignIn(
      supabase?.auth ?? null,
      value,
      signup,
      window.location.origin,
      next,
    );
    setIdentity(value);
    setNow(Date.now());
    setResendAt(Date.now() + 60000);
    setMessage(
      value.kind === 'email'
        ? 'Check your email for a secure sign-in link. Open it to continue.'
        : 'We sent a verification code to your mobile number.',
    );
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy('continue');
    setError('');
    setMessage('');
    try {
      if (identity?.kind === 'phone') {
        await verifyPhoneCode(supabase?.auth ?? null, identity.value, code);
        setSignedIn(true);
      } else await send(parseIdentity(identifier));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  async function oauth(provider: 'google' | 'facebook') {
    setBusy(provider);
    setError('');
    setMessage('');
    try {
      await socialSignIn(
        supabase?.auth ?? null,
        provider,
        window.location.origin,
        next,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  async function resend() {
    if (!identity || remaining || busy) return;
    setBusy('resend');
    setError('');
    try {
      await send(identity);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  return (
    <main id="main" className="auth-page">
      <div className="auth-page-top">
        <Link href="/">
          <ArrowLeft size={15} />
          {tr('Back to home')}
        </Link>
        <span>
          <ShieldCheck size={15} />
          {tr('A secure start to your journey')}
        </span>
      </div>
      <section
        className="auth-scene"
        aria-label={tr(signup ? 'Create Account' : 'Sign in')}
      >
        <Image
          src="/images/signin-journey.jpg"
          alt="A bus travelling through Sri Lankan tea hills at sunset"
          fill
          preload
          sizes="(max-width: 1280px) 100vw, 1240px"
          className="auth-scene-photo"
        />
        <div className="auth-scene-shade" aria-hidden="true" />
        <div className="signin-card">
          <span className="auth-welcome">
            <span className="live-dot" />
            {tr(signup ? 'YOUR NEXT CHAPTER' : 'WELCOME HOME')}
          </span>
          <h1>
            {tr(
              signedIn
                ? 'You’re all set.'
                : identity?.kind === 'phone'
                  ? 'Check your phone.'
                  : signup
                    ? 'Create your account.'
                    : "What's your phone number or email?",
            )}
          </h1>
          <p className="auth-description">
            {tr(
              signedIn
                ? 'Your next journey is waiting for you.'
                : signup
                  ? 'Join Way To Home and make your next journey a happy one.'
                  : 'Sign in to your Way To Home account to continue.',
            )}
          </p>
          {error && (
            <p className="error-message" role="alert">
              {tr(error)}
            </p>
          )}
          {message && !signedIn && (
            <p className="success-message" role="status">
              {tr(message)}
            </p>
          )}
          {signedIn ? (
            <div className="auth-success">
              <span className="auth-check">
                <Check size={24} />
              </span>
              <Button asChild>
                <Link href={next}>
                  {tr('My bookings')}
                  <ArrowRight />
                </Link>
              </Button>
              <Button
                variant="ghost"
                disabled={!!busy}
                onClick={async () => {
                  setBusy('signout');
                  setError('');
                  try {
                    const result = await supabase?.auth.signOut();
                    if (result?.error) throw result.error;
                    setSignedIn(false);
                    setIdentity(null);
                    setCode('');
                    setMessage('');
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                {tr('Sign out')}
              </Button>
            </div>
          ) : (
            <>
              <form onSubmit={submit} className="signin-form">
                {identity?.kind === 'phone' ? (
                  <>
                    <label htmlFor="auth-code">
                      {tr('Verification code')}
                      <span className="auth-sent-to">{identity.value}</span>
                    </label>
                    <input
                      id="auth-code"
                      name="code"
                      className="auth-code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      minLength={6}
                      required
                      value={code}
                      onChange={(e) =>
                        setCode(e.target.value.replace(/\D/g, ''))
                      }
                      placeholder="000000"
                      aria-describedby="auth-code-hint"
                    />
                    <small id="auth-code-hint">
                      {tr('Enter the 6-digit code from your SMS.')}
                    </small>
                  </>
                ) : (
                  <>
                    <label htmlFor="auth-identifier">
                      {tr('Phone number or email')}
                    </label>
                    <div className="auth-input">
                      <AtSign size={19} />
                      <input
                        id="auth-identifier"
                        name="identifier"
                        type="text"
                        autoComplete="username"
                        maxLength={200}
                        required
                        value={identifier}
                        onChange={(e) => {
                          setIdentifier(e.target.value);
                          setIdentity(null);
                          setMessage('');
                          setError('');
                        }}
                        placeholder={tr('Email address or 077 123 4567')}
                      />
                    </div>
                  </>
                )}
                <Button
                  type="submit"
                  className="auth-continue"
                  disabled={
                    !!busy || (identity?.kind === 'email' && remaining > 0)
                  }
                >
                  {busy === 'continue' ? (
                    <LoaderCircle className="animate-spin" />
                  ) : null}
                  {tr(
                    identity?.kind === 'phone'
                      ? 'Verify & continue'
                      : 'Continue',
                  )}
                  <ArrowRight />
                </Button>
              </form>
              {identity && (
                <div className="auth-code-actions">
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => {
                      setIdentity(null);
                      setCode('');
                      setMessage('');
                      setError('');
                    }}
                  >
                    {tr('Use a different phone number or email')}
                  </button>
                  <button
                    type="button"
                    disabled={!!busy || remaining > 0}
                    onClick={resend}
                  >
                    {tr('Resend')}
                    {remaining > 0 ? ` (${remaining}s)` : ''}
                  </button>
                </div>
              )}
              <div className="auth-divider">
                <span>{tr('or')}</span>
              </div>
              <div className="auth-socials">
                <Button
                  variant="outline"
                  disabled={!!busy}
                  onClick={() => oauth('google')}
                >
                  {busy === 'google' ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <GoogleMark />
                  )}
                  {tr('Continue with Google')}
                </Button>
                <Button
                  variant="outline"
                  disabled={!!busy}
                  onClick={() => oauth('facebook')}
                >
                  {busy === 'facebook' ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <span className="facebook-mark" aria-hidden="true">
                      f
                    </span>
                  )}
                  {tr('Continue with Facebook')}
                </Button>
              </div>
              <p className="auth-switch">
                {tr(
                  signup
                    ? 'Already have an account?'
                    : "Don't have an account?",
                )}{' '}
                <Link href={signup ? '/login' : '/signup'}>
                  {tr(signup ? 'Sign in' : 'Create Account')}
                </Link>
                .
              </p>
            </>
          )}
          {demo && !signedIn && (
            <div className="auth-demo">
              <span>{tr('Just exploring?')}</span>
              <Link href="/">
                {tr('Try a demo journey')}
                <ArrowRight size={13} />
              </Link>
            </div>
          )}
          <div className="auth-private">
            <LockKeyhole size={13} />
            {tr('Your details stay private and secure.')}
          </div>
        </div>
        <div className="auth-photo-caption">
          <span>{tr('MORE THAN A DESTINATION')}</span>
          <h2>{tr('Your happy moments waiting for you')}</h2>
          <p>{tr('Good journeys. Great memories. A little closer to home.')}</p>
        </div>
      </section>
    </main>
  );
}
