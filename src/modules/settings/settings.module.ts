import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { ShopSettings } from '../../entities/shop-settings.entity';
import { Shop } from '../../entities/shop.entity';
import { ShopAuthGuard } from '../../common/guards/shop-auth.guard';

@Module({
  imports: [TypeOrmModule.forFeature([ShopSettings, Shop])],
  controllers: [SettingsController],
  providers: [SettingsService, ShopAuthGuard],
  exports: [SettingsService],
})
export class SettingsModule {}

