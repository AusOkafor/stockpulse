import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Product } from '../../entities/product.entity';
import { DemandRequest } from '../../entities/demand-request.entity';
import { Shop } from '../../entities/shop.entity';
import { ShopAuthGuard } from '../../common/guards/shop-auth.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Product, DemandRequest, Shop])],
  controllers: [DashboardController],
  providers: [DashboardService, ShopAuthGuard],
})
export class DashboardModule {}

