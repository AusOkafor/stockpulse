import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DemandController } from './demand.controller';
import { WidgetController } from './widget.controller';
import { DemandService } from './demand.service';
import { DemandRequest } from '../../entities/demand-request.entity';
import { Product } from '../../entities/product.entity';
import { Variant } from '../../entities/variant.entity';
import { RecoveryLink } from '../../entities/recovery-link.entity';
import { OrderAttribution } from '../../entities/order-attribution.entity';
import { Shop } from '../../entities/shop.entity';
import { ShopSettings } from '../../entities/shop-settings.entity';
import { NotificationModule } from '../notification/notification.module';
import { PlanModule } from '../plan/plan.module';
import { ShopAuthGuard } from '../../common/guards/shop-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DemandRequest,
      Product,
      Variant,
      RecoveryLink,
      OrderAttribution,
      Shop,
      ShopSettings,
    ]),
    NotificationModule,
    PlanModule,
  ],
  controllers: [DemandController, WidgetController],
  providers: [DemandService, ShopAuthGuard],
  exports: [DemandService],
})
export class DemandModule {}

