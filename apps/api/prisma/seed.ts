import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { demoTrips } from '../src/domain';
const db = new PrismaClient();
async function seed() {
  for (const t of demoTrips()) {
    await db.bus.upsert({
      where: { id: t.busId },
      update: {},
      create: {
        id: t.busId,
        name: t.bus,
        plate: `DEMO-${t.busId}`,
        capacity: t.capacity,
        amenities: t.amenities,
      },
    });
    await db.route.upsert({
      where: { id: t.routeId },
      update: {},
      create: {
        id: t.routeId,
        from: t.from,
        to: t.to,
        duration: t.duration,
        boarding: t.boarding,
        dropping: t.dropping,
      },
    });
    // Date-specific IDs make repeated seeding safe without moving booked trips.
    await db.trip.upsert({
      where: { id: `${t.id}-${t.departure.slice(0, 10)}` },
      update: {},
      create: {
        id: `${t.id}-${t.departure.slice(0, 10)}`,
        busId: t.busId,
        routeId: t.routeId,
        departure: new Date(t.departure),
        price: t.price,
      },
    });
  }
  console.log(
    'Seeded 30 days of SAMPLE schedules. Replace these before launch.',
  );
}
seed()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
