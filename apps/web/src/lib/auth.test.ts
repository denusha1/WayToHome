import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseIdentity,
  requestSignIn,
  verifyPhoneCode,
  socialSignIn,
  type AuthClient,
} from './auth';

function mockAuth() {
  const calls: { method: string; input: unknown }[] = [];
  const result = {
    error: null as Error | null,
    data: {
      session: { access_token: 'test-only' } as { access_token: string } | null,
    },
  };
  const client = Object.fromEntries(
    ['signInWithOtp', 'verifyOtp', 'signInWithOAuth'].map((method) => [
      method,
      async (input: unknown) => {
        calls.push({ method, input });
        return result;
      },
    ]),
  ) as unknown as AuthClient;
  return { client, calls, result };
}
test('phone/email validation normalizes Sri Lankan numbers and rejects invalid input', () => {
  assert.deepEqual(parseIdentity(' hello@example.com '), {
    kind: 'email',
    value: 'hello@example.com',
  });
  assert.deepEqual(parseIdentity('077 123 4567'), {
    kind: 'phone',
    value: '+94771234567',
  });
  assert.deepEqual(parseIdentity('+94 (77) 123-4567'), {
    kind: 'phone',
    value: '+94771234567',
  });
  for (const input of ['hello', 'a@', '', '0123', '+94111234567'])
    assert.throws(() => parseIdentity(input));
});
test('email sign-in does not create users; sign-up explicitly permits it', async () => {
  const { client, calls } = mockAuth();
  const email = parseIdentity('hello@example.com');
  await requestSignIn(client, email, false, 'https://waytohome.example');
  await requestSignIn(client, email, true, 'https://waytohome.example');
  assert.deepEqual(calls[0].input, {
    email: email.value,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: 'https://waytohome.example/login',
    },
  });
  assert.deepEqual(calls[1].input, {
    email: email.value,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: 'https://waytohome.example/login',
    },
  });
});
test('phone OTP must return a verified session before success', async () => {
  const { client, calls, result } = mockAuth();
  const phone = parseIdentity('0771234567');
  await requestSignIn(client, phone, false, 'http://localhost:3000');
  assert.deepEqual(calls[0].input, {
    phone: '+94771234567',
    options: { shouldCreateUser: false, channel: 'sms' },
  });
  await assert.rejects(verifyPhoneCode(client, phone.value, '12'), /6-digit/);
  await verifyPhoneCode(client, phone.value, '123456');
  assert.deepEqual(calls[1].input, {
    phone: phone.value,
    token: '123456',
    type: 'sms',
  });
  result.data.session = null;
  await assert.rejects(
    verifyPhoneCode(client, phone.value, '123456'),
    /could not verify/,
  );
});
test('social providers return to this website and surface provider/configuration errors', async () => {
  const { client, calls, result } = mockAuth();
  for (const provider of ['google', 'facebook'] as const)
    await socialSignIn(client, provider, 'https://waytohome.example');
  assert.deepEqual(
    calls.map((c) => c.input),
    ['google', 'facebook'].map((provider) => ({
      provider,
      options: { redirectTo: 'https://waytohome.example/login' },
    })),
  );
  result.error = new Error('Provider unavailable');
  await assert.rejects(
    socialSignIn(client, 'google', 'http://localhost:3000'),
    /Provider unavailable/,
  );
  await assert.rejects(
    requestSignIn(
      null,
      parseIdentity('a@example.com'),
      false,
      'http://localhost:3000',
    ),
    /temporarily unavailable/,
  );
});

test('auth return destinations reject external redirects', async () => {
  const { safeAuthNext } = await import('./auth');
  for (const path of [
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/login',
    'javascript:alert(1)',
  ])
    assert.equal(safeAuthNext(path), '/bookings');
  assert.equal(safeAuthNext('/admin'), '/admin');
  assert.equal(
    safeAuthNext('/journeys?from=Colombo'),
    '/journeys?from=Colombo',
  );
  const { client, calls } = mockAuth();
  await socialSignIn(client, 'google', 'https://waytohome.example', '/admin');
  assert.deepEqual(calls[0].input, {
    provider: 'google',
    options: { redirectTo: 'https://waytohome.example/login?next=%2Fadmin' },
  });
});
