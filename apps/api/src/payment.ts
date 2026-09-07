import { createHash, timingSafeEqual } from 'node:crypto';
import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Booking } from './domain';
import { config } from './config';
export const md5 = (value: string) =>
  createHash('md5').update(value).digest('hex').toUpperCase();
export function paymentForm(b: Booking) {
  const merchant = process.env.PAYHERE_MERCHANT_ID,
    secret = process.env.PAYHERE_MERCHANT_SECRET;
  if (!merchant || !secret)
    throw new ServiceUnavailableException('Payments are not configured.');
  const amount = b.amount.toFixed(2);
  return {
    action:
      process.env.PAYHERE_SANDBOX === 'false'
        ? 'https://www.payhere.lk/pay/checkout'
        : 'https://sandbox.payhere.lk/pay/checkout',
    fields: {
      merchant_id: merchant,
      return_url: `${config.webUrl}/bookings?booking=${b.id}`,
      cancel_url: `${config.webUrl}/bookings?cancelled=${b.id}`,
      notify_url: `${config.apiUrl}/api/payments/notify`,
      order_id: b.id,
      items: `Way to Home · ${b.seats.length} bus seat(s)`,
      amount,
      currency: 'LKR',
      first_name: b.name.split(' ')[0],
      last_name: b.name.split(' ').slice(1).join(' ') || b.name,
      email: b.email,
      phone: b.phone,
      address: b.address,
      city: b.city,
      country: 'Sri Lanka',
      hash: md5(merchant + b.id + amount + 'LKR' + md5(secret)),
    },
  };
}
export function verifyPayment(body: Record<string, string>, b: Booking) {
  const merchant = process.env.PAYHERE_MERCHANT_ID,
    secret = process.env.PAYHERE_MERCHANT_SECRET;
  if (!merchant || !secret)
    throw new ServiceUnavailableException('Payments are not configured.');
  for (const key of [
    'merchant_id',
    'order_id',
    'payhere_amount',
    'payhere_currency',
    'status_code',
    'md5sig',
    'payment_id',
  ])
    if (typeof body[key] !== 'string' || body[key].length > 200)
      throw new BadRequestException('Invalid payment notification.');
  const expected = md5(
    body.merchant_id +
      body.order_id +
      body.payhere_amount +
      body.payhere_currency +
      body.status_code +
      md5(secret),
  );
  if (
    !/^[A-Fa-f0-9]{32}$/.test(body.md5sig) ||
    !timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(body.md5sig.toUpperCase()),
    ) ||
    body.merchant_id !== merchant ||
    body.order_id !== b.id ||
    body.payhere_currency !== 'LKR' ||
    !/^\d+\.\d{2}$/.test(body.payhere_amount) ||
    Number(body.payhere_amount) !== b.amount ||
    !['2', '0', '-1', '-2', '-3'].includes(body.status_code)
  )
    throw new BadRequestException('Payment verification failed.');
}

export function requireRefundConfig() {
  if (!process.env.PAYHERE_APP_ID || !process.env.PAYHERE_APP_SECRET)
    throw new ServiceUnavailableException(
      'PayHere refund API credentials are not configured.',
    );
}
export async function refundPayment(
  paymentId: string,
  reason: string,
  request: typeof fetch = fetch,
) {
  requireRefundConfig();
  const base =
    process.env.PAYHERE_SANDBOX === 'false'
      ? 'https://www.payhere.lk'
      : 'https://sandbox.payhere.lk';
  const tokenResponse = await request(`${base}/merchant/v1/oauth/token`, {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.PAYHERE_APP_ID}:${process.env.PAYHERE_APP_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const token = await tokenResponse.json();
  if (
    !tokenResponse.ok ||
    typeof token.access_token !== 'string' ||
    !token.access_token
  )
    throw new ServiceUnavailableException(
      'Refund authorization failed. Reconcile with PayHere before retrying.',
    );
  const response = await request(`${base}/merchant/v1/payment/refund`, {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ payment_id: paymentId, description: reason }),
  });
  const result = await response.json();
  if (
    !response.ok ||
    result.status !== 1 ||
    !['string', 'number'].includes(typeof result.data) ||
    !String(result.data)
  )
    throw new ServiceUnavailableException(
      'Refund was not confirmed. Reconcile with PayHere before retrying.',
    );
  return String(result.data);
}
