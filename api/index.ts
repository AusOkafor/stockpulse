import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import express, { Request, Response } from 'express';
import { join } from 'path';

// Import AppModule - try compiled first (after build), fallback to source (development)
// In Vercel, __dirname is /var/task/api, process.cwd() is /var/task
// We copy dist to api/dist during build, so it should be at api/dist/src/app.module
let AppModule: any;
const cwd = process.cwd(); // In Vercel: /var/task
const apiDir = __dirname; // In Vercel: /var/task/api

// Try multiple possible locations for the dist folder
// Priority: api/dist (copied during build) > root dist > other locations
const possiblePaths = [
  join(apiDir, 'dist', 'src', 'app.module'), // Copied during build: api/dist/src/app.module
  join(cwd, 'dist', 'src', 'app.module'), // Root dist: /var/task/dist/src/app.module
  join(apiDir, '..', 'dist', 'src', 'app.module'), // Relative to api: ../dist/src/app.module
];

let lastError: Error | null = null;
for (const modulePath of possiblePaths) {
  try {
    AppModule = require(modulePath).AppModule;
    console.log(`✅ Loaded AppModule from: ${modulePath}`);
    break;
  } catch (e) {
    lastError = e as Error;
    console.log(`❌ Failed to load from ${modulePath}:`, (e as Error).message);
    continue;
  }
}

if (!AppModule) {
  console.error('Failed to load AppModule from all possible paths:', {
    tried: possiblePaths,
    cwd,
    __dirname: apiDir,
    lastError: lastError?.message,
  });
  throw new Error(
    `Cannot load AppModule. Tried: ${possiblePaths.join(', ')}. Make sure npm run vercel-build completed successfully.`,
  );
}

// Setup Redis error handling (optional - won't crash if Redis unavailable)
try {
  let setupRedisErrorHandling: (() => void) | undefined;
  const redisHandlerPaths = [
    join(__dirname, 'dist', 'src', 'jobs', 'redis-error-handler'), // api/dist/src/jobs/redis-error-handler
    join(process.cwd(), 'dist', 'src', 'jobs', 'redis-error-handler'), // root dist
    join(__dirname, '..', 'dist', 'src', 'jobs', 'redis-error-handler'), // relative
  ];

  for (const redisHandlerPath of redisHandlerPaths) {
    try {
      const redisHandler = require(redisHandlerPath);
      setupRedisErrorHandling = redisHandler?.setupRedisErrorHandling;
      if (setupRedisErrorHandling) {
        setupRedisErrorHandling();
        console.log(`Redis error handler initialized from: ${redisHandlerPath}`);
        break;
      }
    } catch (e) {
      // Try next path
      continue;
    }
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
      console.log('[INIT] Initializing NestJS application...');
      console.log('[INIT] Environment check:', {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasPostgresUrl: !!process.env.POSTGRES_URL,
        hasPostgresPrismaUrl: !!process.env.POSTGRES_PRISMA_URL,
        nodeEnv: process.env.NODE_ENV,
        cwd: process.cwd(),
        __dirname,
      });

      const expressApp = express();
      console.log('[INIT] Creating NestJS app with ExpressAdapter...');
      
      const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
        logger: ['error', 'warn', 'log'],
        rawBody: true, // Enable raw body for webhook HMAC verification
      });

      console.log('[INIT] NestJS app created, setting up middleware...');

      // NOTE: CORS is handled manually in the handler function below
      // Disable NestJS CORS to avoid conflicts with manual CORS handling
      // app.enableCors() is skipped - we handle it manually for better serverless compatibility

      // Global validation pipe
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );

      console.log('[INIT] Calling app.init()...');
      // Initialize the app (this connects to database, etc.)
      await app.init();

      console.log('[INIT] ✅ NestJS application initialized successfully');
      cachedApp = expressApp;
      return expressApp;
    } catch (error) {
      console.error('[INIT] ❌ Failed to initialize NestJS app');
      console.error('[INIT] Error type:', (error as any)?.constructor?.name);
      console.error('[INIT] Error message:', (error as Error)?.message);
      console.error('[INIT] Error stack:', (error as Error)?.stack);
      if ((error as any)?.cause) {
        console.error('[INIT] Error cause:', (error as any).cause);
      }
      initializationPromise = null; // Reset so we can retry
      throw error;
    }
  })();

  return initializationPromise;
}

/**
 * Handle CORS headers manually for serverless environment
 * Always allow localhost for development, regardless of NODE_ENV
 */
function setCorsHeaders(req: Request, res: Response): void {
  const origin = req.headers.origin;
  const frontendUrl = process.env.FRONTEND_URL;

  let allowedOrigin: string | undefined = undefined;

  // Always allow requests with no origin (mobile apps, Postman, etc.)
  if (!origin) {
    allowedOrigin = '*';
  }
  // Always allow localhost (for local development)
  else if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
    allowedOrigin = origin;
  }
  // Allow production frontend URL
  else if (frontendUrl && (origin === frontendUrl || origin.startsWith(frontendUrl))) {
    allowedOrigin = origin;
  }
  // Allow Vercel preview deployments (any vercel.app domain)
  else if (origin.includes('.vercel.app')) {
    allowedOrigin = origin;
  }
  // For safety, allow any origin in development (you can restrict this later)
  // Remove this in production if you want stricter control
  else if (process.env.NODE_ENV === 'development') {
    allowedOrigin = origin;
  }

  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Shopify-Topic, X-Shopify-Shop-Domain, X-Shopify-Hmac-Sha256, X-Requested-With',
    );
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Vary', 'Origin');
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
