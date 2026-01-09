import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShopSettings } from '../../entities/shop-settings.entity';
import { Shop } from '../../entities/shop.entity';

export interface SettingsResponse {
  autoNotifyOnRestock: boolean;
}

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(ShopSettings)
    private readonly shopSettingsRepository: Repository<ShopSettings>,
    @InjectRepository(Shop)
    private readonly shopRepository: Repository<Shop>,
  ) {}

  /**
   * Get settings for a shop (creates default if doesn't exist)
   */
  async getSettings(shopId: string): Promise<SettingsResponse> {
    let settings = await this.shopSettingsRepository.findOne({
      where: { shopId },
    });

    // Create default settings if they don't exist
    if (!settings) {
      // Verify shop exists
      const shop = await this.shopRepository.findOne({ where: { id: shopId } });
      if (!shop) {
        throw new NotFoundException(`Shop with ID ${shopId} not found`);
      }

      settings = this.shopSettingsRepository.create({
        shopId,
        autoNotifyOnRestock: false,
      });
      settings = await this.shopSettingsRepository.save(settings);
    }

    return {
      autoNotifyOnRestock: settings.autoNotifyOnRestock,
    };
  }

  /**
   * Update settings for a shop
   */
  async updateSettings(
    shopId: string,
    updates: Partial<SettingsResponse>,
  ): Promise<SettingsResponse> {
    // Verify shop exists
    const shop = await this.shopRepository.findOne({ where: { id: shopId } });
    if (!shop) {
      throw new NotFoundException(`Shop with ID ${shopId} not found`);
    }

    let settings = await this.shopSettingsRepository.findOne({
      where: { shopId },
    });

    if (!settings) {
      settings = this.shopSettingsRepository.create({
        shopId,
        autoNotifyOnRestock: updates.autoNotifyOnRestock ?? false,
      });
    } else {
      if (updates.autoNotifyOnRestock !== undefined) {
        settings.autoNotifyOnRestock = updates.autoNotifyOnRestock;
      }
    }

    settings = await this.shopSettingsRepository.save(settings);

    return {
      autoNotifyOnRestock: settings.autoNotifyOnRestock,
    };
  }
}

