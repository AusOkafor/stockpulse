import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shop } from '../../entities/shop.entity';

/**
 * Shop Auth Guard
 * Validates shop authentication and attaches shop entity to request
 * 
 * In development mode, allows bypass with DEV_SHOP env var
 */
@Injectable()
export class ShopAuthGuard implements CanActivate {
  private readonly logger = new Logger(ShopAuthGuard.name);
  constructor(
    @InjectRepository(Shop)
    private readonly shopRepository: Repository<Shop>,
  ) {
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();

    // Allow bypass with DEV_SHOP (useful for staging/production testing)
    if (process.env.DEV_SHOP) {
      const devShopDomain = process.env.DEV_SHOP;
      let shop = await this.shopRepository.findOne({
        where: { shopifyDomain: devShopDomain },
      });

      // Create mock shop if doesn't exist
      if (!shop) {
        shop = this.shopRepository.create({
          shopifyDomain: devShopDomain,
          accessToken: 'dev-token',
          isActive: true,
          installedAt: new Date(),
        });
        shop = await this.shopRepository.save(shop);
        this.logger.log(`Created dev shop: ${devShopDomain}`);
      }

      // Attach shop to request
      (request as any).shop = shop;
      return true;
    }

    // Production mode: Extract shop from session token or headers
    // For embedded apps, shop comes from App Bridge session token
    const shopDomain =
      request.headers['x-shopify-shop-domain'] ||
      (request as any).shop ||
      request.query.shop;

    if (!shopDomain) {
      this.logger.warn('No shop domain found in request');
      throw new UnauthorizedException('Shop domain required');
    }

    // Normalize shop domain
    const normalizedDomain = this.normalizeShopDomain(shopDomain as string);

    // Find shop
    const shop = await this.shopRepository.findOne({
      where: { shopifyDomain: normalizedDomain },
    });

    if (!shop) {
      this.logger.warn(`Shop not found: ${normalizedDomain}`);
      throw new UnauthorizedException('Shop not found');
    }

    if (!shop.isActive) {
      this.logger.warn(`Shop is inactive: ${normalizedDomain}`);
      throw new UnauthorizedException('Shop is not active');
    }

    // Attach shop to request
    (request as any).shop = shop;

    return true;
  }

  /**
   * Normalize shop domain
   * Ensures consistent format: store.myshopify.com
   */
  private normalizeShopDomain(domain: string): string {
    // Remove protocol if present
    domain = domain.replace(/^https?:\/\//, '');
    // Remove trailing slash
    domain = domain.replace(/\/$/, '');
    // Ensure .myshopify.com suffix
    if (!domain.endsWith('.myshopify.com')) {
      domain = `${domain}.myshopify.com`;
    }
    return domain.toLowerCase();
  }
}

