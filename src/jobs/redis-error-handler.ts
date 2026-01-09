import { Logger } from '@nestjs/common';

const logger = new Logger('Redis');
let hasLoggedWarning = false;

// Global error handler for Redis connection errors
// This prevents Redis connection errors from crashing the app in development
export function setupRedisErrorHandling() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isDevelopment = nodeEnv === 'development';

  if (!isDevelopment) {
    return; // Only suppress errors in development
  }

  // Suppress Redis-related unhandled rejections in development
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    const errorMessage = String(reason?.message || '');
    const errorCode = reason?.code || '';
    const errorName = reason?.name || '';
    
    // Check if it's a Redis-related error
    const isRedisError =
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('Connection is closed') ||
      errorMessage.includes('Redis') ||
      errorMessage.includes('ioredis') ||
      errorCode === 'ECONNREFUSED' ||
      errorName === 'AggregateError' ||
      (reason?.errors && Array.isArray(reason.errors) && 
       reason.errors.some((e: any) => 
         e?.code === 'ECONNREFUSED' || 
         e?.message?.includes('ECONNREFUSED')
       ));

    if (isRedisError) {
      // Only log once to avoid spam
      if (!hasLoggedWarning) {
        logger.warn(
          'Redis connection error (expected if Redis is not running). Background jobs will not process.',
        );
        hasLoggedWarning = true;
      }
      return; // Don't crash the app - just suppress the error
    }
    
    // Re-throw other errors - let them propagate normally
    throw reason;
  });

  // Also suppress Redis connection errors from ioredis event emitters
  process.on('uncaughtException', (error: Error) => {
    const errorMessage = String(error?.message || '');
    const errorCode = (error as any)?.code || '';
    
    const isRedisError =
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('Connection is closed') ||
      errorMessage.includes('Redis') ||
      errorMessage.includes('ioredis') ||
      errorCode === 'ECONNREFUSED';

    if (isRedisError && isDevelopment) {
      if (!hasLoggedWarning) {
        logger.warn(
          'Redis connection error (expected if Redis is not running). Background jobs will not process.',
        );
        hasLoggedWarning = true;
      }
      return; // Suppress the error
    }
    
    // Re-throw other errors
    throw error;
  });
}

