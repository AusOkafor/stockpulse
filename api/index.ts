import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import express, { Request, Response } from 'express';

// Import AppModule - try compiled first (after build), fallback to source (development)
let AppModule: any;
try {
  // After Vercel build, import from dist
  AppModule = require('../dist/app.module').AppModule;
  console.log('Loaded AppModule from dist');
} catch (e) {
  // During development or if dist doesn't exist, use source
  try {
    AppModule = require('../src/app.module').AppModule;
    console.log('Loaded AppModule from src');
  } catch (e2) {
    console.error('Failed to load AppModule from both dist and src:', e2);
    throw new Error('Cannot load AppModule. Make sure to run npm run build first.');
  }
}

// Setup Redis error handling (optional - won't crash if Redis unavailable)
try {
  let setupRedisErrorHandling: (() => void) | undefined;
  try {
    const redisHandler = require('../dist/jobs/redis-error-handler');
    setupRedisErrorHandling = redisHandler?.setupRedisErrorHandling;
  } catch (e) {
    try {
      const redisHandler = require('../src/jobs/redis-error-handler');
      setupRedisErrorHandling = redisHandler?.setupRedisErrorHandling;
    } catch (e2) {
      // Redis handler not found - that's ok
    }
  }
  if (setupRedisErrorHandling) {
    setupRedisErrorHandling();
    console.log('Redis error handler initialized');
  }
} catch (e) {
  // Redis setup is optional - continue without it
  console.warn('Redis error handler not available, continuing without it');
}

let cachedApp: express.Application | null = null;
let initializationPromise: Promise<express.Application> | null = null;

async function createApp(): Promise<express.Application> {
  // Return cached app if available
  if (cachedApp) {
    return cachedApp;
  }

  // If already initializing, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start initialization
  initializationPromise = (async () => {
    try {
      console.log('Initializing NestJS application...');
      console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
      console.log('POSTGRES_URL exists:', !!process.env.POSTGRES_URL);
      console.log('NODE_ENV:', process.env.NODE_ENV);

      const expressApp = express();
      const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
        logger: ['error', 'warn', 'log'],
        rawBody: true, // Enable raw body for webhook HMAC verification
      });

      // Configure CORS - support both development (localhost) and production
      const nodeEnv = process.env.NODE_ENV || 'production';
      const frontendUrl = process.env.FRONTEND_URL;
      const isDevelopment = nodeEnv === 'development';

      app.enableCors({
        origin: (origin, callback) => {
          // Allow requests with no origin (mobile apps, Postman, etc.)
          if (!origin) {
            callback(null, true);
            return;
          }

          // In development, allow localhost on any port
          if (
            isDevelopment ||
            origin.startsWith('http://localhost:') ||
            origin.startsWith('http://127.0.0.1:')
          ) {
            callback(null, true);
            return;
          }

          // In production, allow specific frontend URL
          if (frontendUrl && (origin === frontendUrl || origin.startsWith(frontendUrl))) {
            callback(null, true);
            return;
          }

          // Allow Vercel preview deployments (any vercel.app domain)
          if (origin.includes('.vercel.app')) {
            callback(null, true);
            return;
          }

          // Default: reject
          callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: [
          'Content-Type',
          'Authorization',
          'X-Shopify-Topic',
          'X-Shopify-Shop-Domain',
          'X-Shopify-Hmac-Sha256',
          'X-Requested-With',
        ],
        exposedHeaders: ['Content-Type', 'Authorization'],
        maxAge: 86400, // 24 hours
      });

      // Global validation pipe
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );

      // Initialize the app
      await app.init();

      console.log('NestJS application initialized successfully');
      cachedApp = expressApp;
      return expressApp;
    } catch (error) {
      console.error('Failed to initialize NestJS app:', error);
      console.error('Error stack:', (error as Error)?.stack);
      initializationPromise = null; // Reset so we can retry
      throw error;
    }
  })();

  return initializationPromise;
}

/**
 * Handle CORS headers manually for serverless environment
 */
function setCorsHeaders(req: Request, res: Response): void {
  const origin = req.headers.origin || '';
  const nodeEnv = process.env.NODE_ENV || 'production';
  const frontendUrl = process.env.FRONTEND_URL;
  const isDevelopment = nodeEnv === 'development';

  let allowOrigin = false;

  // Allow requests with no origin (mobile apps, Postman, etc.)
  if (!origin) {
    allowOrigin = true;
  }
  // Allow localhost in development
  else if (
    isDevelopment ||
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:')
  ) {
    allowOrigin = true;
  }
  // Allow production frontend URL
  else if (frontendUrl && (origin === frontendUrl || origin.startsWith(frontendUrl))) {
    allowOrigin = true;
  }
  // Allow Vercel preview deployments
  else if (origin.includes('.vercel.app')) {
    allowOrigin = true;
  }

  if (allowOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Shopify-Topic, X-Shopify-Shop-Domain, X-Shopify-Hmac-Sha256, X-Requested-With',
    );
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
}

export default async function handler(req: Request, res: Response) {
  // Handle CORS preflight (OPTIONS) requests immediately
  if (req.method === 'OPTIONS') {
    setCorsHeaders(req, res);
    res.status(204).end();
    return;
  }

  try {
    // Set CORS headers for all requests
    setCorsHeaders(req, res);

    const app = await createApp();
    return app(req, res);
  } catch (error) {
    console.error('Serverless function error:', error);
    console.error('Error details:', {
      message: (error as Error)?.message,
      stack: (error as Error)?.stack,
      name: (error as Error)?.name,
    });

    // Ensure response is sent with CORS headers
    if (!res.headersSent) {
      setCorsHeaders(req, res);

      const isProduction = process.env.NODE_ENV === 'production';
      const errorMessage = isProduction
        ? 'Internal Server Error'
        : (error as Error)?.message || 'Unknown error';

      const response: any = {
        error: 'Internal Server Error',
        message: errorMessage,
        timestamp: new Date().toISOString(),
      };

      // Include stack trace in non-production
      if (!isProduction && (error as Error)?.stack) {
        response.stack = (error as Error).stack;
      }

      res.status(500).json(response);
    }
  }
}
