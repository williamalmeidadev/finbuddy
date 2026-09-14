import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const rawSwagger = process.env.SWAGGER_ENABLED?.trim().toLowerCase();
  const swaggerEnabled =
    rawSwagger !== undefined
      ? !['false', '0', 'off', 'no'].includes(rawSwagger)
      : true;
  const corsOrigin = process.env.CORS_ORIGIN;

  app.enableCors({
    origin: corsOrigin ? corsOrigin.split(',').map((o) => o.trim()) : true,
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
