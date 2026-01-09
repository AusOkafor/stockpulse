import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Shop } from '../../entities/shop.entity';
import { ShopPlan } from '../../entities/shop-plan.entity';
import { ShopSettings } from '../../entities/shop-settings.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Shop, ShopPlan, ShopSettings]),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}

