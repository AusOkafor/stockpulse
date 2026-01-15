import { DynamicModule, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HandleRestockJob } from './handle-restock.job';
import { SendNotificationJob } from './send-notification.job';
import { ExpireRecoveryLinksJob } from './expire-recovery-links.job';

@Module({})
export class JobsModule {
  static forRoot(): DynamicModule {
    const hasRedis =
      Boolean(process.env.REDIS_URL) ||
      Boolean(process.env.REDIS_HOST) ||
      Boolean(process.env.REDIS_PORT);

    if (!hasRedis) {
      console.warn('[JobsModule] REDIS_* not set. Skipping BullMQ setup.');
      return {
        module: JobsModule,
        providers: [],
        exports: [],
      };
    }

    return {
      module: JobsModule,
      imports: [
        ConfigModule,
        BullModule.forRootAsync({
          useFactory: (configService: ConfigService) => {
            const redisUrl = configService.get<string>('REDIS_URL');

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
    };
  }
}

