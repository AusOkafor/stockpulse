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
        
        // Base connection config - optimize for serverless
        const baseConfig: any = {
          maxRetriesPerRequest: null, // Don't retry in serverless (fail fast)
          enableOfflineQueue: false, // Don't queue when offline
          lazyConnect: true, // Lazy connect to avoid blocking startup
          enableReadyCheck: false, // Skip ready check in serverless
          connectTimeout: 2000, // Fast timeout for serverless
          commandTimeout: 2000, // Fast command timeout
          retryStrategy: () => null, // Don't retry (fail immediately)
          showFriendlyErrorStack: false,
          reconnectOnError: () => false, // Don't auto-reconnect
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

        // If no Redis URL, use localhost (will fail gracefully)
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

