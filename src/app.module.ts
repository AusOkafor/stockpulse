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
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => getDataSourceOptions(configService),
      inject: [ConfigService],
    }),
    // JobsModule - Redis is optional in development
    // Errors are caught and suppressed in development mode
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

