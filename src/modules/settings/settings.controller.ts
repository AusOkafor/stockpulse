import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { SettingsService, SettingsResponse } from './settings.service';
import { ShopAuthGuard } from '../../common/guards/shop-auth.guard';
import { Shop } from '../../entities/shop.entity';

/**
 * Settings Controller
 * Protected routes - requires shop authentication
 */
@Controller('settings')
@UseGuards(ShopAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getSettings(@Req() req: any): Promise<SettingsResponse> {
    // Shop is attached by ShopAuthGuard
    const shop = (req as any).shop as Shop;
    return this.settingsService.getSettings(shop.id);
  }

  @Post()
  async updateSettings(
    @Body() body: SettingsResponse,
    @Req() req: any,
  ): Promise<SettingsResponse> {
    // Shop is attached by ShopAuthGuard
    const shop = (req as any).shop as Shop;
    return this.settingsService.updateSettings(shop.id, body);
  }
}

