import type { SupabaseClient } from '@supabase/supabase-js';
export type Identity = { kind: 'email' | 'phone'; value: string };
export type AuthClient = Pick<
  SupabaseClient['auth'],
  'signInWithOtp' | 'verifyOtp' | 'signInWithOAuth'
>;
export function parseIdentity(input: string): Identity {
  const value = input.trim();
  if (value.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    return { kind: 'email', value };
  const phone = value.replace(/[\s()-]/g, '');
  if (/^(?:0|\+94)7\d{8}$/.test(phone))
    return {
      kind: 'phone',
      value: phone.startsWith('0') ? '+94' + phone.slice(1) : phone,
    };
  throw new Error('Enter a valid email address or Sri Lankan mobile number.');
}
function requireAuth(client: AuthClient | null): AuthClient {
  if (!client)
    throw new Error(
      'Sign-in is temporarily unavailable. Please try again later.',
    );
  return client;
}
export async function requestSignIn(
  client: AuthClient | null,
  identity: Identity,
  signup: boolean,
  origin: string,
  next?: string,
) {
  const auth = requireAuth(client);
  const result =
    identity.kind === 'email'
      ? await auth.signInWithOtp({
          email: identity.value,
          options: {
            shouldCreateUser: signup,
            emailRedirectTo: authCallback(origin, next),
          },
        })
      : await auth.signInWithOtp({
          phone: identity.value,
          options: { shouldCreateUser: signup, channel: 'sms' },
        });
  if (result.error) throw result.error;
}
export async function verifyPhoneCode(
  client: AuthClient | null,
  phone: string,
  code: string,
) {
  if (!/^\d{6}$/.test(code))
    throw new Error('Enter the 6-digit code from your SMS.');
  const { data, error } = await requireAuth(client).verifyOtp({
    phone,
    token: code,
    type: 'sms',
  });
  if (error) throw error;
  if (!data.session)
    throw new Error(
      'We could not verify your session. Please request a new code.',
    );
}
export async function socialSignIn(
  client: AuthClient | null,
  provider: 'google' | 'facebook',
  origin: string,
  next?: string,
) {
  const { error } = await requireAuth(client).signInWithOAuth({
    provider,
    options: { redirectTo: authCallback(origin, next) },
  });
  if (error) throw error;
}

export function safeAuthNext(value: string | null | undefined) {
  if (!value?.startsWith('/') || value.startsWith('//')) return '/bookings';
  try {
    const url = new URL(value, 'https://waytohome.invalid');
    if (
      url.origin !== 'https://waytohome.invalid' ||
      !['/bookings', '/admin', '/journeys'].includes(url.pathname)
    )
      return '/bookings';
    return url.pathname + url.search;
  } catch {
    return '/bookings';
  }
}
function authCallback(origin: string, next?: string) {
  return `${origin}/login${next ? `?next=${encodeURIComponent(safeAuthNext(next))}` : ''}`;
}
