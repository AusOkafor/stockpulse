import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanService } from './plan.service';
import { PlanController } from './plan.controller';
import { ShopPlan } from '../../entities/shop-plan.entity';
import { Shop } from '../../entities/shop.entity';
import { ShopAuthGuard } from '../../common/guards/shop-auth.guard';

@Module({
  imports: [TypeOrmModule.forFeature([ShopPlan, Shop])],
  controllers: [PlanController],
  providers: [PlanService, ShopAuthGuard],
  exports: [PlanService],
})
export class PlanModule {}

