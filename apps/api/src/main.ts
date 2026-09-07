import 'reflect-metadata';
import { Module, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { config, validateConfig } from './config';
import { ApiController } from './controller';
import { Store } from './store';
import { BookingService } from './booking.service';
import { Realtime } from './realtime';
import { AuthGuard, AdminGuard } from './auth';
import { Notifications } from './notifications';
@Module({
  controllers: [ApiController],
  providers: [
    Store,
    BookingService,
    Realtime,
    AuthGuard,
    AdminGuard,
    Notifications,
  ],
})
class AppModule {}
async function bootstrap() {
  validateConfig();
  const app = await NestFactory.create(AppModule);
  const proxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
  if (!Number.isInteger(proxyHops) || proxyHops < 0 || proxyHops > 10)
    throw new Error('TRUST_PROXY_HOPS must be an integer between 0 and 10.');
  if (proxyHops)
    app.getHttpAdapter().getInstance().set('trust proxy', proxyHops);
  app.use(helmet());
  app.enableCors({
    origin: config.webUrl,
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-demo-user'],
  });
  app.use(
    '/api',
    rateLimit({
      windowMs: 60000,
      limit: 150,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      skip: (req) => req.path === '/payments/notify',
    }),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT || 4000), '0.0.0.0');
  console.log(
    `Way to Home API ready. ${config.demo ? 'DEMO MODE: sample schedules, simulated payments, in-memory storage.' : 'PostgreSQL mode.'}`,
  );
}
bootstrap().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
