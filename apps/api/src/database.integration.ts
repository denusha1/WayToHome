import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { Store } from './store';
import { BookingService } from './booking.service';
import { Notifications } from './notifications';
import { Realtime } from './realtime';
import { config } from './config';

test(
  'PostgreSQL: independent clients serialize inventory, persist bookings, and enforce unique seats',
  { skip: !process.env.TEST_DATABASE_URL },
  async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    config.demo = false;
    const db = new PrismaClient();
    const id = randomUUID();
    let first: Store | undefined, second: Store | undefined;
    try {
      await db.bus.create({
        data: {
          id,
          name: 'Integration Bus',
          plate: id,
          capacity: 40,
          amenities: ['AC'],
        },
      });
      await db.route.create({
        data: {
          id,
          from: 'Test A',
          to: 'Test B',
          duration: 120,
          boarding: 'Station A',
          dropping: 'Station B',
        },
      });
      await db.trip.create({
        data: {
          id,
          busId: id,
          routeId: id,
          price: 1500,
          departure: new Date(Date.now() + 86400000),
        },
      });
      first = new Store();
      second = new Store();
      const a = new BookingService(
        first,
        new Realtime(),
        new Notifications(first),
      );
      const b = new BookingService(
        second,
        new Realtime(),
        new Notifications(second),
      );
      const results = await Promise.allSettled([
        a.hold({ tripId: id, seats: [1, 2] }, 'client-a'),
        b.hold({ tripId: id, seats: [1, 2] }, 'client-b'),
      ]);
      assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
      const rejected = results.find(
        (r) => r.status === 'rejected',
      ) as PromiseRejectedResult;
      assert.match(rejected.reason.message, /just taken/);
      assert.equal(await db.reservation.count({ where: { tripId: id } }), 2);
      const saved = await db.booking.findFirstOrThrow({
        where: { tripId: id },
      });
      assert.equal(saved.amount, 3000);
      assert.equal((await b.inventory(id)).seats[0].status, 'unavailable');
      await assert.rejects(
        db.reservation.create({
          data: { tripId: id, bookingId: saved.id, seat: 1 },
        }),
      );
      await db.booking.update({
        where: { id: saved.id },
        data: { expiresAt: new Date(Date.now() - 1) },
      });
      const replacement = await b.hold({ tripId: id, seats: [1] }, 'client-c');
      assert.equal(await db.reservation.count({ where: { tripId: id } }), 1);
      await first.setLocation(id, { latitude: 6.9271, longitude: 79.8612 });
      assert.equal((await second.location(id)).location?.latitude, 6.9271);
      await a.cancel(replacement.id, 'client-c', 'Changed my plans');
      assert.equal((await b.get(replacement.id)).status, 'CANCELLED');
      assert.equal(
        (await b.get(replacement.id)).refundReason,
        'Changed my plans',
      );
      assert.equal(await db.reservation.count({ where: { tripId: id } }), 0);
      await first.mutate(id, (_, bookings) => {
        const item = bookings.find((x) => x.id === replacement.id)!;
        item.refundRequestedAt = new Date().toISOString();
        item.refundedAt = new Date().toISOString();
        item.refundReference = 'db-test-reference';
      });
      assert.equal(
        (await b.get(replacement.id)).refundReference,
        'db-test-reference',
      );
      assert.equal(typeof (await b.get(replacement.id)).refundedAt, 'string');
    } finally {
      await first?.onModuleDestroy();
      await second?.onModuleDestroy();
      await db.vehicleLocation.deleteMany({ where: { tripId: id } });
      await db.reservation.deleteMany({ where: { tripId: id } });
      await db.booking.deleteMany({ where: { tripId: id } });
      await db.trip.deleteMany({ where: { id } });
      await db.route.deleteMany({ where: { id } });
      await db.bus.deleteMany({ where: { id } });
      await db.$disconnect();
      config.demo = true;
    }
  },
);
