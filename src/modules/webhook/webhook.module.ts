import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { Shop } from '../../entities/shop.entity';
import { ShopSettings } from '../../entities/shop-settings.entity';
import { Variant } from '../../entities/variant.entity';
import { DemandRequest } from '../../entities/demand-request.entity';
import { DemandModule } from '../demand/demand.module';
import { PlanModule } from '../plan/plan.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Shop, ShopSettings, Variant, DemandRequest]),
    DemandModule,
    PlanModule,
  ],
  controllers: [WebhookController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}

