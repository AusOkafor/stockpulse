import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import express, { Request, Response } from 'express';
import { join } from 'path';

// Import AppModule - try compiled first (after build), fallback to source (development)
// In Vercel, __dirname points to the compiled location (api/ directory)
// NestJS compiles src/ to dist/src/, so the path is dist/src/app.module
let AppModule: any;
const distPath = join(__dirname, '..', 'dist', 'src', 'app.module');
const srcPath = join(__dirname, '..', 'src', 'app.module');

try {
  // After Vercel build, import from dist/src/app.module (NestJS output structure)
  AppModule = require(distPath).AppModule;
  console.log(`Loaded AppModule from dist: ${distPath}`);
} catch (e) {
  console.log(`Failed to load from dist (${distPath}):`, e.message);
  // During development or if dist doesn't exist, try alternative paths
  try {
    // Try process.cwd() path (sometimes Vercel structures it differently)
    const altPath = join(process.cwd(), 'dist', 'src', 'app.module');
    AppModule = require(altPath).AppModule;
    console.log(`Loaded AppModule from process.cwd: ${altPath}`);
  } catch (e3) {
    console.log(`Failed to load from process.cwd:`, e3.message);
    // Last resort: try source (won't work in production but helps debug)
    try {
      AppModule = require(srcPath).AppModule;
      console.log(`Loaded AppModule from src: ${srcPath}`);
    } catch (e2) {
      console.error('Failed to load AppModule from all paths:', {
        distPath,
        altPath: join(process.cwd(), 'dist', 'src', 'app.module'),
        srcPath,
        cwd: process.cwd(),
        __dirname,
        distError: e.message,
        altError: e3.message,
        srcError: e2.message,
      });
      throw new Error(
        `Cannot load AppModule. Tried: ${distPath}, ${join(process.cwd(), 'dist', 'src', 'app.module')}, ${srcPath}. Make sure to run npm run build first.`,
      );
    }
  }
}

// Setup Redis error handling (optional - won't crash if Redis unavailable)
try {
  let setupRedisErrorHandling: (() => void) | undefined;
  try {
    // NestJS compiles src/jobs to dist/src/jobs
    const redisHandlerPath = join(__dirname, '..', 'dist', 'src', 'jobs', 'redis-error-handler');
    const redisHandler = require(redisHandlerPath);
    setupRedisErrorHandling = redisHandler?.setupRedisErrorHandling;
  } catch (e) {
    try {
      const redisHandlerPath = join(process.cwd(), 'dist', 'src', 'jobs', 'redis-error-handler');
      const redisHandler = require(redisHandlerPath);
      setupRedisErrorHandling = redisHandler?.setupRedisErrorHandling;
    } catch (e3) {
      // Redis handler not found - that's ok, continue
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
