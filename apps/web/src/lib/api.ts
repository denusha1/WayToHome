import { createClient } from '@supabase/supabase-js';
export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
export const supabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      )
    : null;
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (typeof window !== 'undefined') {
    let demoId = localStorage.getItem('wth-demo-user');
    if (!demoId) {
      demoId = crypto.randomUUID();
      localStorage.setItem('wth-demo-user', demoId);
    }
    headers.set('x-demo-user', demoId);
    const session = supabase
      ? (await supabase.auth.getSession()).data.session
      : null;
    if (session) headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  let response: Response;
  try {
    response = await fetch(`${API}/api${path}`, {
      ...options,
      headers,
      signal: options.signal || AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error(
      'Unable to reach the booking service. Please try again shortly.',
    );
  }
  const body = await response.json().catch(() => ({
    message:
      response.status === 429
        ? 'Too many requests. Please wait a minute and try again.'
        : 'The booking service returned an unexpected response.',
  }));
  if (!response.ok)
    throw new ApiError(
      Array.isArray(body.message)
        ? body.message.join('. ')
        : body.message || 'Something went wrong. Please try again.',
      response.status,
    );
  return body;
}
export type Trip = {
  id: string;
  from: string;
  to: string;
  duration: number;
  boarding: string;
  dropping: string;
  bus: string;
  capacity: number;
  amenities: string[];
  departure: string;
  price: number;
  available: number;
};
export type Booking = {
  id: string;
  tripId: string;
  seats: number[];
  amount: number;
  status: string;
  expiresAt: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  trip?: Trip;
  checkedInAt: string | null;
  refundRequestedAt?: string | null;
  refundReason?: string | null;
  refundReference?: string | null;
  refundedAt?: string | null;
};
export type Ticket = {
  booking: Booking;
  trip: Trip;
  qr: string;
  token: string;
  demo: boolean;
};
