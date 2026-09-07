import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { config } from './config';
import { active, Booking, demoTrips, Trip } from './domain';

@Injectable()
export class Store implements OnModuleDestroy {
  private prisma = config.demo ? null : new PrismaClient();
  private demo = { trips: demoTrips(), bookings: [] as Booking[] };
  private demoBuses = [
    ...new Map(
      this.demo.trips.map((t) => [
        t.busId,
        {
          id: t.busId,
          name: t.bus,
          plate: `DEMO-${t.busId}`,
          capacity: t.capacity,
          amenities: t.amenities,
        },
      ]),
    ).values(),
  ];
  private demoRoutes = [
    ...new Map(
      this.demo.trips.map((t) => [
        t.routeId,
        {
          id: t.routeId,
          from: t.from,
          to: t.to,
          duration: t.duration,
          boarding: t.boarding,
          dropping: t.dropping,
        },
      ]),
    ).values(),
  ];
  private queues = new Map<string, Promise<unknown>>();
  private locations = new Map<
    string,
    { tripId: string; latitude: number; longitude: number; updatedAt: Date }
  >();
  async location(tripId: string) {
    const trip = (await this.trips()).find((t) => t.id === tripId);
    if (!trip) throw new NotFoundException('Journey not found.');
    const location = this.prisma
      ? await this.prisma.vehicleLocation.findUnique({ where: { tripId } })
      : (this.locations.get(tripId) ?? null);
    return { trip, location };
  }
  async setLocation(
    tripId: string,
    coords: { latitude: number; longitude: number },
  ) {
    await this.location(tripId);
    if (this.prisma)
      return this.prisma.vehicleLocation.upsert({
        where: { tripId },
        create: { tripId, ...coords },
        update: coords,
      });
    const location = { tripId, ...coords, updatedAt: new Date() };
    this.locations.set(tripId, location);
    return location;
  }
  async onModuleDestroy() {
    await this.prisma?.$disconnect();
  }
  async trips(): Promise<Trip[]> {
    if (!this.prisma) return structuredClone(this.demo.trips);
    return (
      await this.prisma.trip.findMany({
        include: { bus: true, route: true },
        orderBy: { departure: 'asc' },
      })
    ).map((t) => ({
      id: t.id,
      busId: t.busId,
      routeId: t.routeId,
      from: t.route.from,
      to: t.route.to,
      duration: t.route.duration,
      boarding: t.route.boarding,
      dropping: t.route.dropping,
      bus: t.bus.name,
      capacity: t.bus.capacity,
      amenities: t.bus.amenities,
      departure: t.departure.toISOString(),
      price: t.price,
    }));
  }
  async ready() {
    if (this.prisma) await this.prisma.$queryRaw`SELECT 1`;
  }
  async bookings(): Promise<Booking[]> {
    if (!this.prisma) return structuredClone(this.demo.bookings);
    return (await this.prisma.booking.findMany()).map(this.serialize);
  }
  private serialize(b: any): Booking {
    return {
      ...b,
      expiresAt: b.expiresAt.toISOString(),
      createdAt: b.createdAt.toISOString(),
      checkedInAt: b.checkedInAt?.toISOString() ?? null,
      refundRequestedAt: b.refundRequestedAt?.toISOString() ?? null,
      refundedAt: b.refundedAt?.toISOString() ?? null,
    };
  }
  async mutate<T>(
    tripId: string,
    fn: (trip: Trip, bookings: Booking[]) => T,
  ): Promise<T> {
    const trip = (await this.trips()).find((t) => t.id === tripId);
    if (!trip) throw new NotFoundException('Journey not found.');
    if (!this.prisma) {
      const previous = this.queues.get(tripId) || Promise.resolve();
      const next = previous
        .catch(() => {})
        .then(() => {
          const bookings = structuredClone(
            this.demo.bookings.filter((b) => b.tripId === tripId),
          );
          const result = fn(trip, bookings);
          this.demo.bookings = [
            ...this.demo.bookings.filter((b) => b.tripId !== tripId),
            ...bookings,
          ];
          return structuredClone(result);
        });
      this.queues.set(tripId, next);
      try {
        return await next;
      } finally {
        if (this.queues.get(tripId) === next) this.queues.delete(tripId);
      }
    }
    return this.prisma.$transaction(
      async (tx) => {
        // All inventory writers share this transaction-scoped per-trip lock.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${tripId}))`;
        const bookings = (await tx.booking.findMany({ where: { tripId } })).map(
          this.serialize,
        );
        const result = fn(trip, bookings);
        for (const b of bookings) {
          const data = {
            ...b,
            expiresAt: new Date(b.expiresAt),
            createdAt: new Date(b.createdAt),
            checkedInAt: b.checkedInAt ? new Date(b.checkedInAt) : null,
            refundRequestedAt: b.refundRequestedAt
              ? new Date(b.refundRequestedAt)
              : null,
            refundedAt: b.refundedAt ? new Date(b.refundedAt) : null,
          };
          await tx.booking.upsert({
            where: { id: b.id },
            create: data,
            update: data,
          });
        }
        await tx.reservation.deleteMany({ where: { tripId } });
        const reservations = bookings
          .filter((b) => active(b))
          .flatMap((b) =>
            b.seats.map((seat) => ({ tripId, bookingId: b.id, seat })),
          );
        if (reservations.length)
          await tx.reservation.createMany({ data: reservations });
        return result;
      },
      { timeout: 15000 },
    );
  }
  async addTrip(data: {
    busId: string;
    routeId: string;
    departure: string;
    price: number;
  }) {
    if (this.prisma)
      return this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${data.busId}))`;
        const route = await tx.route.findUnique({
          where: { id: data.routeId },
        });
        const bus = await tx.bus.findUnique({ where: { id: data.busId } });
        if (!route || !bus)
          throw new NotFoundException('Bus or route not found.');
        const start = Date.parse(data.departure),
          end = start + route.duration * 60000;
        const existing = await tx.trip.findMany({
          where: { busId: data.busId },
          include: { route: true },
        });
        if (
          existing.some(
            (t) =>
              t.departure.getTime() < end &&
              t.departure.getTime() + t.route.duration * 60000 > start,
          )
        )
          throw new ConflictException(
            'This bus already has a journey at that time.',
          );
        return tx.trip.create({
          data: { ...data, departure: new Date(data.departure) },
        });
      });
    const template = this.demoRoutes.find((t) => t.id === data.routeId);
    const bus = this.demoBuses.find((t) => t.id === data.busId);
    if (!template || !bus)
      throw new NotFoundException('Bus or route not found.');
    const start = Date.parse(data.departure),
      end = start + template.duration * 60000;
    if (
      this.demo.trips.some(
        (t) =>
          t.busId === data.busId &&
          Date.parse(t.departure) < end &&
          Date.parse(t.departure) + t.duration * 60000 > start,
      )
    )
      throw new ConflictException(
        'This bus already has a journey at that time.',
      );
    const trip = {
      ...template,
      ...data,
      bus: bus.name,
      capacity: bus.capacity,
      amenities: bus.amenities,
      id: crypto.randomUUID(),
    };
    this.demo.trips.push(trip);
    return trip;
  }
  async catalog() {
    if (this.prisma)
      return {
        buses: await this.prisma.bus.findMany(),
        routes: await this.prisma.route.findMany(),
      };
    return structuredClone({ buses: this.demoBuses, routes: this.demoRoutes });
  }
  async addBus(data: {
    name: string;
    plate: string;
    capacity: number;
    amenities: string[];
  }) {
    if (!this.prisma) {
      if (
        this.demoBuses.some(
          (b) => b.plate.toLowerCase() === data.plate.toLowerCase(),
        )
      )
        throw new ConflictException('This registration plate already exists.');
      const bus = { ...data, id: crypto.randomUUID() };
      this.demoBuses.push(bus);
      return bus;
    }
    return this.prisma.bus.create({ data });
  }
  async addRoute(data: {
    from: string;
    to: string;
    duration: number;
    boarding: string;
    dropping: string;
  }) {
    if (!this.prisma) {
      const route = { ...data, id: crypto.randomUUID() };
      this.demoRoutes.push(route);
      return route;
    }
    return this.prisma.route.create({ data });
  }
}
