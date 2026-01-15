import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
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
          return {
            ...options,
            // Serverless: fail fast, don't crash the process
            retryAttempts: 0,
            retryDelay: 0,
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
      dataSourceFactory: async (options) => {
        const safeOptions =
          options ??
          ({
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
          } as const);

        const dataSource = new DataSource(safeOptions);
        try {
          await dataSource.initialize();
        } catch (initError) {
          console.error('[TypeOrmModule] Failed to connect. Continuing without DB.', {
            message: (initError as Error)?.message,
          });
        }
        return dataSource;
      },
    }),
    // JobsModule - Redis is optional
    // Will fail gracefully if Redis is unavailable
    JobsModule.forRoot(),
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

