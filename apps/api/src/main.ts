import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const isProduction = process.env.NODE_ENV === 'production';

  // Enable trust proxy for Express so client IP is properly resolved behind reverse proxies
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.use(cookieParser());

  const rawSwagger = process.env.SWAGGER_ENABLED?.trim().toLowerCase();
  const swaggerEnabled =
    rawSwagger !== undefined
      ? ['true', '1', 'on', 'yes'].includes(rawSwagger)
      : !isProduction;

  const corsOrigin = process.env.CORS_ORIGIN;
  const resolvedOrigin = corsOrigin
    ? corsOrigin.split(',').map((o) => o.trim())
    : isProduction
      ? false
      : true;

  app.enableCors({
    origin: resolvedOrigin,
    credentials: true,
  });
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('FinBuddy API')
    .setDescription(
      'Personal finance management REST API built with NestJS, Prisma, and PostgreSQL.',
    )
    .setVersion('0.0.1')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Health', 'System liveness and readiness health checks')
    .addTag('Auth', 'Authentication, token refresh, and session endpoints')
    .addTag('Users', 'User account profile endpoints')
    .addTag('Accounts', 'Financial account management endpoints')
    .addTag('Categories', 'Income and expense category management endpoints')
    .addTag('Transactions', 'Income and expense transaction endpoints')
    .addTag('Transfers', 'Account-to-account transfer endpoints')
    .addTag('Budgets', 'Monthly category budget tracking endpoints')
    .addTag('Financial Summary', 'Financial aggregated summary reports')
    .addTag(
      'Recurring Transactions',
      'Scheduled recurring transaction rules and execution endpoints',
    )
    .build();

  if (swaggerEnabled) {
    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, documentFactory);
  }

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
