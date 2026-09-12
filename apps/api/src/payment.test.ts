import test from 'node:test';
import assert from 'node:assert/strict';
import { refundPayment } from './payment';
test('refund adapter uses sandbox OAuth and only accepts a confirmed refund reference', async () => {
  process.env.PAYHERE_APP_ID = 'test-app';
  process.env.PAYHERE_APP_SECRET = 'test-secret';
  process.env.PAYHERE_SANDBOX = 'true';
  const calls: { url: string; options: RequestInit | undefined }[] = [];
  const request: typeof fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return new Response(
      JSON.stringify(
        calls.length === 1
          ? { access_token: 'test-token' }
          : { status: 1, data: 12345 },
      ),
      { status: 200 },
    );
  };
  assert.equal(
    await refundPayment('payment-1', 'Cancellation', request),
    '12345',
  );
  assert.equal(
    calls[0].url,
    'https://sandbox.payhere.lk/merchant/v1/oauth/token',
  );
  assert.deepEqual(JSON.parse(String(calls[1].options?.body)), {
    payment_id: 'payment-1',
    description: 'Cancellation',
  });
  let n = 0;
  await assert.rejects(
    refundPayment(
      'payment-1',
      'Cancellation',
      async () =>
        new Response(
          JSON.stringify(
            ++n === 1 ? { access_token: 'token' } : { status: -1, data: null },
          ),
          { status: 200 },
        ),
    ),
    /not confirmed/,
  );
});
