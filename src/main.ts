import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { setupRedisErrorHandling } from './jobs/redis-error-handler';

// Setup Redis error handling before creating the app
setupRedisErrorHandling();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
    rawBody: true, // Enable raw body for webhook HMAC verification
  });
  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const isDevelopment = nodeEnv === 'development';
  
  app.enableCors({
    origin: isDevelopment
      ? (origin, callback) => {
          // In development, allow localhost on any port
          if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        }
      : configService.get<string>('FRONTEND_URL', 'http://localhost:3000'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Shopify-Topic', 'X-Shopify-Shop-Domain', 'X-Shopify-Hmac-Sha256'],
  });

  const port = configService.get<number>('PORT', 4000);
  await app.listen(port);
  
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  if (isDevelopment) {
    console.log('⚠️  Note: Redis connection errors are expected if Redis is not running');
    console.log('   The app will continue to work, but background jobs will not process.');
  }
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});

