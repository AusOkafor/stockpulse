import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { HandleRestockJob } from './handle-restock.job';
import { SendNotificationJob } from './send-notification.job';
import { ExpireRecoveryLinksJob } from './expire-recovery-links.job';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        const nodeEnv = configService.get<string>('NODE_ENV', 'development');
        const isDevelopment = nodeEnv === 'development';
        
        // Base connection config
        const baseConfig: any = {
          maxRetriesPerRequest: isDevelopment ? null : 3,
          enableOfflineQueue: false,
          lazyConnect: true, // Always lazy connect to avoid immediate connection attempts
          enableReadyCheck: !isDevelopment,
          connectTimeout: isDevelopment ? 500 : 10000,
          retryStrategy: (times: number) => {
            if (isDevelopment) {
              // In development, stop retrying immediately to avoid error spam
              return null;
            }
            // In production, retry with exponential backoff
            return Math.min(times * 50, 2000);
          },
          // Suppress connection errors in development
          showFriendlyErrorStack: !isDevelopment,
          // Add error handlers to suppress connection errors
          ...(isDevelopment && {
            reconnectOnError: () => false, // Don't reconnect on error in dev
            maxRetriesPerRequest: null,
          }),
        };
        
        if (redisUrl) {
          // Parse Redis URL if provided
          try {
            const url = new URL(redisUrl);
            return {
              connection: {
                ...baseConfig,
                host: url.hostname,
                port: parseInt(url.port, 10) || 6379,
                password: url.password || undefined,
              },
            };
          } catch {
            // If URL parsing fails, fall back to defaults
          }
        }

        return {
          connection: {
            ...baseConfig,
            host: configService.get<string>('REDIS_HOST', 'localhost'),
            port: configService.get<number>('REDIS_PORT', 6379),
            password: configService.get<string>('REDIS_PASSWORD'),
          },
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: 'handle-restock' },
      { name: 'send-notification' },
      { name: 'expire-recovery-links' },
    ),
  ],
  providers: [HandleRestockJob, SendNotificationJob, ExpireRecoveryLinksJob],
  exports: [BullModule],
})
export class JobsModule {}

