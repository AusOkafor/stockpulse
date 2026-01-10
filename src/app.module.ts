import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { ShopModule } from './modules/shop/shop.module';
import { ProductModule } from './modules/product/product.module';
import { DemandModule } from './modules/demand/demand.module';
import { NotificationModule } from './modules/notification/notification.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { RecoveryModule } from './modules/recovery/recovery.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SettingsModule } from './modules/settings/settings.module';
import { PlanModule } from './modules/plan/plan.module';
import { JobsModule } from './jobs/jobs.module';
import { getDataSourceOptions } from './database/data-source';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Allow missing environment variables to prevent crashes
      ignoreEnvFile: false,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        try {
          const options = getDataSourceOptions(configService);
          // Add retry logic for serverless cold starts
          return {
            ...options,
            // Retry connection on failure
            retryAttempts: 3,
            retryDelay: 3000,
            // Don't auto-connect - connect lazily
            // This is handled by NestJS TypeORM module
          };
        } catch (error) {
          console.error('[AppModule] Failed to get DataSource options:', error);
          // Return minimal config to allow app to start
          // Database operations will fail, but app won't crash on startup
          return {
            type: 'postgres',
            host: 'localhost',
            port: 5432,
            username: 'user',
            password: 'password',
            database: 'stockpulse',
            entities: [],
            synchronize: false,
            logging: false,
            migrations: [],
            migrationsRun: false,
            extra: { max: 1 },
          };
        }
      },
      inject: [ConfigService],
    }),
    // JobsModule - Redis is optional
    // Will fail gracefully if Redis is unavailable
    JobsModule,
    AuthModule,
    ShopModule,
    ProductModule,
    DemandModule,
    NotificationModule,
    WebhookModule,
    RecoveryModule,
    DashboardModule,
    SettingsModule,
    PlanModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

