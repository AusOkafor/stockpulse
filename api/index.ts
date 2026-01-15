/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import express from 'express';
import type { Request, Response } from 'express';
let cachedServer: express.Application | null = null;

async function bootstrap(): Promise<express.Application> {
  if (cachedServer) {
    return cachedServer;
  }

  const server = express();

  // Import AppModule from the correct path
  // Prefer api/dist (copied during vercel-build), fallback to root dist if bundled there
  // Use require() at runtime (not import) to avoid TypeScript checking during build
  const possibleModulePaths = [
    './dist/app.module',
    './dist/src/app.module',
    '../dist/app.module',
    '../dist/src/app.module',
  ];
  let AppModule: any;

  for (const modulePath of possibleModulePaths) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const moduleRef = require(modulePath);
      AppModule = moduleRef.AppModule || moduleRef.default?.AppModule || moduleRef;
      if (AppModule) {
        console.log(`[INIT] ✅ Loaded AppModule from: ${modulePath}`);
        break;
      }
    } catch (error) {
      console.warn(`[INIT] ⚠️ Failed to load AppModule from ${modulePath}:`, {
        message: (error as Error)?.message,
      });
    }
  }

  if (!AppModule) {
    throw new Error(
      `Cannot load AppModule. Tried: ${possibleModulePaths.join(', ')}. ` +
        `cwd=${process.cwd()} __dirname=${__dirname}`,
    );
  }

  const { NestFactory } = await import('@nestjs/core');
  const { ExpressAdapter } = await import('@nestjs/platform-express');
  const { ValidationPipe } = await import('@nestjs/common');

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    logger: ['error', 'warn', 'log'],
    rawBody: true, // Enable raw body for webhook HMAC verification
    bufferLogs: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // NOTE: CORS is handled manually in the handler function below
  // Don't use app.enableCors() to avoid conflicts with manual CORS handling

  console.log('[INIT] Initializing NestJS app...');
  try {
    await app.init();
    console.log('[INIT] ✅ NestJS app initialized successfully');
  } catch (initError) {
    // Log but don't fail - allow app to start even if some services fail
    console.error('[INIT] ⚠️ app.init() encountered errors (continuing anyway):', {
      message: (initError as Error)?.message,
      name: (initError as Error)?.name,
    });
  }

  cachedServer = server;
  return server;
}

/**
 * Handle CORS headers manually for serverless environment
 * Always allow localhost for development, regardless of NODE_ENV
 */
function setCorsHeaders(req: Request, res: Response): void {
  const origin = req.headers.origin;
  const frontendUrl = process.env.FRONTEND_URL;
  const defaultAllowedOrigins = new Set([
    'https://stockpulse-ui.vercel.app',
  ]);

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
  else if (
    (frontendUrl && (origin === frontendUrl || origin.startsWith(frontendUrl))) ||
    defaultAllowedOrigins.has(origin)
  ) {
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

    console.log('[HANDLER] Bootstrapping app...');
    const server = await bootstrap();
    console.log('[HANDLER] App ready, forwarding request to Express');

    // Forward request to Express app
    // Wrap in promise to handle Express async callback
    return new Promise<void>((resolve, reject) => {
      server(req, res, (err?: any) => {
        if (err) {
          console.error('[HANDLER] Express error:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  } catch (error) {
    console.error('[HANDLER] ❌ Serverless function error');
    console.error('[HANDLER] Error type:', (error as any)?.constructor?.name);
    console.error('[HANDLER] Error message:', (error as Error)?.message);
    console.error('[HANDLER] Error stack:', (error as Error)?.stack);

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
    } else {
      // Headers already sent, but we still need to end the response
      if (!res.writableEnded) {
        res.end();
      }
    }
  }
}
