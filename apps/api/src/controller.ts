import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Store } from './store';
import { BookingService } from './booking.service';
import { AuthGuard, AdminGuard, AuthRequest } from './auth';
import {
  BusDto,
  CancellationDto,
  CheckoutDto,
  HoldDto,
  LocationDto,
  RouteDto,
  TripDto,
  VerifyDto,
} from './dto';
import { config } from './config';
import { active } from './domain';
import { Notifications } from './notifications';
@Controller('api')
export class ApiController {
  constructor(
    private store: Store,
    private service: BookingService,
    private notifications: Notifications,
  ) {}
  @Get('health') health() {
    return { ok: true, demo: config.demo };
  }
  @Get('me') @UseGuards(AuthGuard) me(@Req() req: AuthRequest) {
    return { user: req.user };
  }
  @Get('health/ready') async ready() {
    await this.store.ready();
    return { ok: true };
  }
  @Get('cities') async cities() {
    const trips = await this.store.trips();
    return [
      ...new Set([
        'Colombo',
        'Kandy',
        'Galle',
        'Jaffna',
        'Kilinochchi',
        'Vavuniya',
        'Puthukudiyiruppu',
        'Ella',
        ...trips.flatMap((t) => [t.from, t.to]),
      ]),
    ]
      .filter((city) => city.trim().toLowerCase() !== 'matara')
      .sort();
  }
  @Get('trips') async search(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('date') date: string,
  ) {
    if (
      (from && to && from === to) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date || '') ||
      Number.isNaN(Date.parse(`${date}T00:00:00+05:30`))
    )
      throw new BadRequestException(
        'Select different cities and a valid date.',
      );
    const day = new Date(`${date}T00:00:00+05:30`);
    const bookings = await this.store.bookings();
    return (await this.store.trips())
      .filter(
        (t) =>
          (!from || t.from.toLowerCase() === from.toLowerCase()) &&
          (!to || t.to.toLowerCase() === to.toLowerCase()) &&
          Date.parse(t.departure) >= Math.max(day.getTime(), Date.now()) &&
          Date.parse(t.departure) < day.getTime() + 86400000,
      )
      .map((t) => ({
        ...t,
        available:
          t.capacity -
          bookings
            .filter((b) => b.tripId === t.id && active(b))
            .reduce((n, b) => n + b.seats.length, 0),
      }));
  }
  @Get('trips/:id/seats') seats(@Param('id') id: string) {
    return this.service.inventory(id);
  }
  @Get('trips/:id/location') location(@Param('id') id: string) {
    return this.store.location(id);
  }
  @Post('admin/trips/:id/location')
  @UseGuards(AuthGuard, AdminGuard)
  setLocation(@Param('id') id: string, @Body() dto: LocationDto) {
    return this.store.setLocation(id, dto);
  }
  @Post('holds') @UseGuards(AuthGuard) hold(
    @Body() body: HoldDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.hold(body, req.user.id);
  }
  @Delete('holds/:id') @UseGuards(AuthGuard) release(
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ) {
    return this.service.release(id, req.user.id);
  }
  @Post('bookings/:id/checkout') @UseGuards(AuthGuard) checkout(
    @Param('id') id: string,
    @Body() body: CheckoutDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.checkout(id, body, req.user.id);
  }
  @Post('bookings/:id/demo-payment') @UseGuards(AuthGuard) demoPay(
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ) {
    return this.service.confirmDemo(id, req.user.id);
  }
  @Get('bookings') @UseGuards(AuthGuard) async bookings(
    @Req() req: AuthRequest,
  ) {
    const trips = await this.store.trips();
    return (await this.store.bookings())
      .filter((b) => b.userId === req.user.id && b.status !== 'HELD')
      .map((b) => ({
        ...b,
        status:
          ['HELD', 'PENDING'].includes(b.status) && !active(b)
            ? 'EXPIRED'
            : b.status,
        trip: trips.find((t) => t.id === b.tripId),
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  @Get('bookings/:id/ticket') @UseGuards(AuthGuard) ticket(
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ) {
    return this.service.ticket(id, req.user.id);
  }
  @Post('bookings/:id/cancel') @UseGuards(AuthGuard) cancel(
    @Param('id') id: string,
    @Body() dto: CancellationDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.cancel(id, req.user.id, dto.reason);
  }
  @Post('admin/bookings/:id/refund') @UseGuards(AuthGuard, AdminGuard) refund(
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ) {
    return this.service.refund(id, req.user.id);
  }
  @Post('payments/notify') notify(@Body() body: Record<string, string>) {
    return this.service.notify(body);
  }
  @Get('admin') @UseGuards(AuthGuard, AdminGuard) async admin() {
    return {
      ...(await this.store.catalog()),
      trips: await this.store.trips(),
      bookings: await this.store.bookings(),
      demo: config.demo,
    };
  }
  @Post('admin/trips') @UseGuards(AuthGuard, AdminGuard) addTrip(
    @Body() dto: TripDto,
  ) {
    if (Date.parse(dto.departure) <= Date.now())
      throw new BadRequestException('Departure must be in the future.');
    return this.store.addTrip(dto);
  }
  @Post('admin/buses') @UseGuards(AuthGuard, AdminGuard) addBus(
    @Body() dto: BusDto,
  ) {
    return this.store.addBus(dto);
  }
  @Post('admin/routes') @UseGuards(AuthGuard, AdminGuard) addRoute(
    @Body() dto: RouteDto,
  ) {
    if (dto.from === dto.to)
      throw new BadRequestException('Cities must differ.');
    return this.store.addRoute(dto);
  }
  @Post('admin/check-in') @UseGuards(AuthGuard, AdminGuard) verify(
    @Body() dto: VerifyDto,
  ) {
    return this.service.checkIn(dto.token);
  }
  @Post('admin/bookings/:id/notifications')
  @UseGuards(AuthGuard, AdminGuard)
  async retry(@Param('id') id: string) {
    await this.notifications.send(await this.service.get(id));
    return { ok: true };
  }
}
