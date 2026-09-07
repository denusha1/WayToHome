import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import { BookingService } from './booking.service';
import { Store } from './store';
import { Realtime } from './realtime';
import { Notifications } from './notifications';
import { active, assertSeats } from './domain';
import { config } from './config';
import { md5, verifyPayment } from './payment';

const passenger = {
  name: 'Test Traveller',
  email: 'traveller@example.com',
  phone: '0771234567',
  address: '10 Lake Road',
  city: 'Colombo',
};
async function setup() {
  config.demo = true;
  const store = new Store();
  const notifications = { send: async () => {} } as unknown as Notifications;
  const service = new BookingService(store, new Realtime(), notifications);
  const trip = (await store.trips()).find(
    (t) =>
      Date.parse(t.departure) > Date.now() &&
      Date.parse(t.departure) - Date.now() < 86400000,
  )!;
  return { store, service, trip };
}
test('only one concurrent request can hold the same seat', async () => {
  const { service, trip } = await setup();
  const results = await Promise.allSettled([
    service.hold({ tripId: trip.id, seats: [1] }, 'alice'),
    service.hold({ tripId: trip.id, seats: [1] }, 'bob'),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(results.filter((r) => r.status === 'rejected').length, 1);
});
test('expired holds release seats and cannot be checked out', async () => {
  const { service, store, trip } = await setup();
  const b = await service.hold({ tripId: trip.id, seats: [2] }, 'alice');
  await store.mutate(trip.id, (_, bookings) => {
    bookings[0].expiresAt = new Date(Date.now() - 1).toISOString();
  });
  await assert.rejects(service.checkout(b.id, passenger, 'alice'), /expired/);
  assert.equal((await service.inventory(trip.id)).seats[1].status, 'available');
  await service.hold({ tripId: trip.id, seats: [2] }, 'bob');
});
test('seats are validated and server computes the fare', async () => {
  const { service, trip } = await setup();
  assert.throws(() => assertSeats(trip, [], [1, 1]));
  assert.throws(() => assertSeats(trip, [], [0]));
  assert.throws(() => assertSeats(trip, [], [trip.capacity + 1]));
  assert.throws(() => assertSeats(trip, [], [1, 2, 3, 4, 5, 6, 7]));
  const b = await service.hold({ tripId: trip.id, seats: [3, 4] }, 'alice');
  assert.equal(b.amount, trip.price * 2);
  await assert.rejects(service.checkout(b.id, passenger, 'bob'));
  await assert.rejects(service.ticket(b.id, 'alice'), /payment confirmation/);
});
test('checkout and demo confirmation are idempotent; QR is owner-only and single use', async () => {
  const { service, trip } = await setup();
  const b = await service.hold({ tripId: trip.id, seats: [5] }, 'alice');
  const first = await service.checkout(b.id, passenger, 'alice');
  const second = await service.checkout(b.id, passenger, 'alice');
  assert.equal(first.booking.expiresAt, second.booking.expiresAt);
  await service.confirmDemo(b.id, 'alice');
  await service.confirmDemo(b.id, 'alice');
  await assert.rejects(service.ticket(b.id, 'bob'));
  const ticket = await service.ticket(b.id, 'alice');
  assert.ok(ticket.qr.startsWith('data:image/png;base64,'));
  await assert.rejects(
    service.checkIn(ticket.token.slice(0, -1) + 'Z'),
    /signature/,
  );
  await service.checkIn(ticket.token);
  await assert.rejects(
    service.checkIn(ticket.token),
    /already been checked in/,
  );
  assert.equal(
    (await service.inventory(trip.id)).seats[4].status,
    'unavailable',
  );
});
test('payment signature rejects forged, wrong amount, and wrong currency callbacks', async () => {
  const { service, trip } = await setup();
  process.env.PAYHERE_MERCHANT_ID = 'test-merchant';
  process.env.PAYHERE_MERCHANT_SECRET = 'test-secret';
  const b = await service.hold({ tripId: trip.id, seats: [6] }, 'alice');
  const body = {
    merchant_id: 'test-merchant',
    order_id: b.id,
    payhere_amount: b.amount.toFixed(2),
    payhere_currency: 'LKR',
    status_code: '2',
    payment_id: 'payment-1',
    md5sig: '',
  };
  body.md5sig = md5(
    body.merchant_id +
      body.order_id +
      body.payhere_amount +
      body.payhere_currency +
      body.status_code +
      md5('test-secret'),
  );
  assert.doesNotThrow(() => verifyPayment(body, b));
  assert.throws(() => verifyPayment({ ...body, md5sig: 'A'.repeat(32) }, b));
  assert.throws(() => verifyPayment({ ...body, payhere_amount: '1.00' }, b));
  assert.throws(() => verifyPayment({ ...body, payhere_currency: 'USD' }, b));
});
test('late successful payment is flagged for review without stealing a resold seat', async () => {
  const { service, store, trip } = await setup();
  const b = await service.hold({ tripId: trip.id, seats: [7] }, 'alice');
  await service.checkout(b.id, passenger, 'alice');
  await store.mutate(trip.id, (_, bookings) => {
    bookings[0].expiresAt = new Date(Date.now() - 1000).toISOString();
  });
  const other = await service.hold({ tripId: trip.id, seats: [7] }, 'bob');
  const body = {
    merchant_id: 'test-merchant',
    order_id: b.id,
    payhere_amount: b.amount.toFixed(2),
    payhere_currency: 'LKR',
    status_code: '2',
    payment_id: 'late-payment',
    md5sig: '',
  };
  body.md5sig = md5(
    body.merchant_id +
      body.order_id +
      body.payhere_amount +
      body.payhere_currency +
      body.status_code +
      md5('test-secret'),
  );
  config.demo = false;
  try {
    await assert.rejects(service.confirmDemo(b.id, 'alice'), /disabled/);
    await service.notify(body);
    await service.notify(body);
    assert.equal((await service.get(b.id)).status, 'PAYMENT_REVIEW');
    assert.ok(active(await service.get(other.id)));
  } finally {
    config.demo = true;
  }
});
test('admin can create buses and routes, then schedule a bus without overlap', async () => {
  const { store } = await setup();
  const bus = await store.addBus({
    name: 'New Express',
    plate: 'WP-NEW-1',
    capacity: 32,
    amenities: ['AC'],
  });
  const route = await store.addRoute({
    from: 'Matara',
    to: 'Colombo',
    boarding: 'Matara Central',
    dropping: 'Colombo Central',
    duration: 180,
  });
  const dto = {
    busId: bus.id,
    routeId: route.id,
    departure: new Date(Date.now() + 86400000).toISOString(),
    price: 1800,
  };
  await store.addTrip(dto);
  await assert.rejects(store.addTrip(dto), /already has a journey/);
});
test('verified payment confirms exactly once and a later failure cannot downgrade it', async () => {
  const { service, trip } = await setup();
  const b = await service.hold({ tripId: trip.id, seats: [9] }, 'alice');
  await service.checkout(b.id, passenger, 'alice');
  const body = {
    merchant_id: 'test-merchant',
    order_id: b.id,
    payhere_amount: b.amount.toFixed(2),
    payhere_currency: 'LKR',
    status_code: '2',
    payment_id: 'success-payment',
    md5sig: '',
  };
  const sign = () => {
    body.md5sig = md5(
      body.merchant_id +
        body.order_id +
        body.payhere_amount +
        body.payhere_currency +
        body.status_code +
        md5('test-secret'),
    );
  };
  config.demo = false;
  try {
    sign();
    await service.notify(body);
    await service.notify(body);
    assert.equal((await service.get(b.id)).status, 'CONFIRMED');
    body.status_code = '-2';
    sign();
    await service.notify(body);
    assert.equal((await service.get(b.id)).status, 'CONFIRMED');
    await assert.rejects(
      service.hold({ tripId: trip.id, seats: [9] }, 'bob'),
      /just taken/,
    );
  } finally {
    config.demo = true;
  }
});

test('unpaid cancellation releases seats, enforces ownership and blocks checkout', async () => {
  const { service, trip } = await setup();
  const b = await service.hold({ tripId: trip.id, seats: [12] }, 'alice');
  await service.checkout(b.id, passenger, 'alice');
  await assert.rejects(service.cancel(b.id, 'bob', 'Changed my plans'));
  await service.cancel(b.id, 'alice', 'Changed my plans');
  assert.equal((await service.get(b.id)).status, 'CANCELLED');
  assert.equal(
    (await service.inventory(trip.id)).seats[11].status,
    'available',
  );
  await assert.rejects(service.checkout(b.id, passenger, 'alice'), /expired/);
});
test('refund request preserves the ticket until approval; concurrent approvals refund once', async () => {
  const { service, trip } = await setup();
  const b = await service.hold({ tripId: trip.id, seats: [13] }, 'alice');
  await service.checkout(b.id, passenger, 'alice');
  await service.confirmDemo(b.id, 'alice');
  await service.cancel(b.id, 'alice', 'Changed my plans');
  assert.equal((await service.get(b.id)).status, 'CONFIRMED');
  assert.equal(
    (await service.inventory(trip.id)).seats[12].status,
    'unavailable',
  );
  const results = await Promise.allSettled([
    service.refund(b.id, 'admin'),
    service.refund(b.id, 'admin'),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  const refunded = await service.get(b.id);
  assert.equal(refunded.status, 'REFUNDED');
  assert.ok(refunded.refundReference);
  assert.equal(refunded.refundApprovedBy, 'admin');
  assert.equal(
    (await service.refund(b.id, 'admin')).refundReference,
    refunded.refundReference,
  );
  await assert.rejects(service.ticket(b.id, 'alice'), /payment confirmation/);
  assert.equal(
    (await service.inventory(trip.id)).seats[12].status,
    'available',
  );
});
test('ambiguous refund remains pending and cannot be sent again', async () => {
  const { service, trip } = await setup();
  const b = await service.hold({ tripId: trip.id, seats: [14] }, 'alice');
  await service.checkout(b.id, passenger, 'alice');
  await service.confirmDemo(b.id, 'alice');
  await service.cancel(b.id, 'alice', 'Changed my plans');
  const original = globalThis.fetch;
  let calls = 0;
  process.env.PAYHERE_APP_ID = 'test-app';
  process.env.PAYHERE_APP_SECRET = 'test-secret';
  config.demo = false;
  globalThis.fetch = async () => {
    calls++;
    throw new Error('timeout');
  };
  try {
    await assert.rejects(service.refund(b.id, 'admin'), /reconciliation/);
    assert.equal((await service.get(b.id)).status, 'REFUND_PENDING');
    await assert.rejects(service.refund(b.id, 'admin'), /Pending refunds/);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
    config.demo = true;
  }
});

test('late payment after cancellation goes to refund review without reclaiming seats', async () => {
  const { service, trip } = await setup();
  const b = await service.hold({ tripId: trip.id, seats: [15] }, 'alice');
  await service.checkout(b.id, passenger, 'alice');
  await service.cancel(b.id, 'alice', 'Changed my plans');
  await service.hold({ tripId: trip.id, seats: [15] }, 'bob');
  process.env.PAYHERE_MERCHANT_ID = 'test-merchant';
  process.env.PAYHERE_MERCHANT_SECRET = 'test-secret';
  const body = {
    merchant_id: 'test-merchant',
    order_id: b.id,
    payhere_amount: b.amount.toFixed(2),
    payhere_currency: 'LKR',
    status_code: '2',
    payment_id: 'late-cancel-payment',
    md5sig: '',
  };
  body.md5sig = md5(
    body.merchant_id +
      body.order_id +
      body.payhere_amount +
      body.payhere_currency +
      body.status_code +
      md5('test-secret'),
  );
  config.demo = false;
  try {
    await service.notify(body);
    await service.notify(body);
    const reviewed = await service.get(b.id);
    assert.equal(reviewed.status, 'PAYMENT_REVIEW');
    assert.ok(reviewed.refundRequestedAt);
    assert.equal(
      (await service.inventory(trip.id)).seats[14].status,
      'unavailable',
    );
  } finally {
    config.demo = true;
  }
});
