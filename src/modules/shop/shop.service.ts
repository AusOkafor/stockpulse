import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shop } from '../../entities/shop.entity';

/**
 * Shop Service
 * Handles shop operations and upsert logic
 */
@Injectable()
export class ShopService {
  private readonly logger = new Logger(ShopService.name);

  constructor(
    @InjectRepository(Shop)
    private readonly shopRepository: Repository<Shop>,
  ) {}

  /**
   * Upsert shop record
   * Creates or updates shop based on shopifyDomain
   */
  async upsertShop(
    shopifyDomain: string,
    accessToken: string,
    isActive: boolean = true,
  ): Promise<Shop> {
    const normalizedDomain = this.normalizeShopDomain(shopifyDomain);

    let shop = await this.shopRepository.findOne({
      where: { shopifyDomain: normalizedDomain },
    });

    if (shop) {
      // Update existing shop
      shop.accessToken = accessToken;
      shop.isActive = isActive;
      if (isActive && !shop.installedAt) {
        shop.installedAt = new Date();
      }
      shop = await this.shopRepository.save(shop);
      this.logger.log(`Shop updated: ${normalizedDomain}`);
    } else {
      // Create new shop
      shop = this.shopRepository.create({
        shopifyDomain: normalizedDomain,
        accessToken,
        isActive,
        installedAt: new Date(),
      });
      shop = await this.shopRepository.save(shop);
      this.logger.log(`Shop created: ${normalizedDomain}`);
    }

    return shop;
  }

  /**
   * Get shop by domain
   */
  async getShopByDomain(shopDomain: string): Promise<Shop | null> {
    const normalizedDomain = this.normalizeShopDomain(shopDomain);
    return this.shopRepository.findOne({
      where: { shopifyDomain: normalizedDomain },
    });
  }

  /**
   * Normalize shop domain
   */
  private normalizeShopDomain(domain: string): string {
    domain = domain.replace(/^https?:\/\//, '');
    domain = domain.replace(/\/$/, '');
    if (!domain.endsWith('.myshopify.com')) {
      domain = `${domain}.myshopify.com`;
    }
    return domain.toLowerCase();
  }
}

