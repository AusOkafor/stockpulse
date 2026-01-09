import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository, InjectEntityManager } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Shop } from '../../entities/shop.entity';
import { ShopPlan } from '../../entities/shop-plan.entity';
import { ShopSettings } from '../../entities/shop-settings.entity';
import { PlanTier } from '../../entities/plan-tier.enum';
import { HmacUtil } from '../../common/utils/hmac.util';

/**
 * Auth Service
 * Handles Shopify OAuth flow and installation lifecycle
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly scopes: string;
  private readonly appUrl: string;
  private readonly frontendUrl: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Shop)
    private readonly shopRepository: Repository<Shop>,
    @InjectRepository(ShopPlan)
    private readonly shopPlanRepository: Repository<ShopPlan>,
    @InjectRepository(ShopSettings)
    private readonly shopSettingsRepository: Repository<ShopSettings>,
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {
    this.apiKey = this.configService.get<string>('SHOPIFY_API_KEY') || '';
    this.apiSecret = this.configService.get<string>('SHOPIFY_API_SECRET') || '';
    this.scopes = this.configService.get<string>('SHOPIFY_SCOPES', 'read_products,read_inventory,read_orders');
    this.appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:4000';
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  /**
   * Generate OAuth install URL
   * Redirects merchant to Shopify OAuth consent screen
   */
  getInstallUrl(shopDomain: string): string {
    // Normalize shop domain
    const normalizedDomain = this.normalizeShopDomain(shopDomain);
    
    // Validate shop domain format
    if (!this.isValidShopDomain(normalizedDomain)) {
      throw new BadRequestException('Invalid shop domain');
    }

    // Build OAuth URL
    const redirectUri = `${this.appUrl}/auth/callback`;
    const state = this.generateState(normalizedDomain);

    const params = new URLSearchParams({
      client_id: this.apiKey,
      scope: this.scopes,
      redirect_uri: redirectUri,
      state,
    });

    return `https://${normalizedDomain}/admin/oauth/authorize?${params.toString()}`;
  }

  /**
   * Handle OAuth callback
   * Exchanges code for access token and completes installation
   */
  async handleCallback(
    code: string,
    shop: string,
    hmac: string,
    state?: string,
  ): Promise<string> {
    // Validate HMAC
    if (!this.validateOAuthCallback(shop, code, hmac, state)) {
      this.logger.error(`Invalid HMAC for shop: ${shop}`);
      throw new BadRequestException('Invalid OAuth callback');
    }

    // Normalize shop domain
    const normalizedDomain = this.normalizeShopDomain(shop);

    try {
      // Exchange code for access token
      const accessToken = await this.exchangeCodeForToken(normalizedDomain, code);

      // Complete installation in transaction
      await this.completeInstallation(normalizedDomain, accessToken);

      // Build redirect URL to embedded app
      return this.buildEmbeddedAppUrl(normalizedDomain);
    } catch (error) {
      this.logger.error(`OAuth callback failed for shop: ${normalizedDomain}`, error);
      throw new InternalServerErrorException('Installation failed');
    }
  }

  /**
   * Exchange authorization code for access token
   */
  private async exchangeCodeForToken(shopDomain: string, code: string): Promise<string> {
    const url = `https://${shopDomain}/admin/oauth/access_token`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.apiKey,
        client_secret: this.apiSecret,
        code,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Token exchange failed: ${error}`);
      throw new BadRequestException('Failed to exchange code for token');
    }

    const data = await response.json();
    return data.access_token;
  }

  /**
   * Complete installation
   * Upserts shop, creates plan and settings, registers webhooks
   */
  private async completeInstallation(
    shopDomain: string,
    accessToken: string,
  ): Promise<void> {
    // Use transaction to ensure atomicity
    await this.entityManager.transaction(async (transactionalEntityManager) => {
      // Upsert shop
      let shop = await transactionalEntityManager.findOne(Shop, {
        where: { shopifyDomain: shopDomain },
      });

      if (shop) {
        // Update existing shop
        shop.accessToken = accessToken;
        shop.isActive = true;
        shop.installedAt = new Date();
      } else {
        // Create new shop
        shop = transactionalEntityManager.create(Shop, {
          shopifyDomain: shopDomain,
          accessToken,
          isActive: true,
          installedAt: new Date(),
        });
      }
      shop = await transactionalEntityManager.save(shop);
      this.logger.log(`Shop installed: ${shopDomain}`);

      // Create shop plan (FREE by default)
      let plan = await transactionalEntityManager.findOne(ShopPlan, {
        where: { shopId: shop.id },
      });

      if (!plan) {
        plan = transactionalEntityManager.create(ShopPlan, {
          shopId: shop.id,
          plan: PlanTier.FREE,
          monthlyNotifyLimit: 50,
          notificationsUsedThisMonth: 0,
          usageResetAt: this.getStartOfCurrentMonth(),
        });
        await transactionalEntityManager.save(plan);
        this.logger.log(`Shop plan created: ${shopDomain}`);
      }

      // Create shop settings (default)
      let settings = await transactionalEntityManager.findOne(ShopSettings, {
        where: { shopId: shop.id },
      });

      if (!settings) {
        settings = transactionalEntityManager.create(ShopSettings, {
          shopId: shop.id,
          autoNotifyOnRestock: false,
        });
        await transactionalEntityManager.save(settings);
        this.logger.log(`Shop settings created: ${shopDomain}`);
      }

      // Register webhooks
      try {
        await this.registerWebhooks(shopDomain, accessToken);
        this.logger.log(`Webhooks registered: ${shopDomain}`);
      } catch (error) {
        this.logger.error(`Failed to register webhooks: ${shopDomain}`, error);
        // Don't fail installation if webhooks fail, but log it
        // In production, you might want to retry webhook registration
      }
    });
  }

  /**
   * Register required webhooks with Shopify
   */
  private async registerWebhooks(shopDomain: string, accessToken: string): Promise<void> {
    const webhooks = [
      {
        topic: 'app/uninstalled',
        address: `${this.appUrl}/webhooks/shopify`,
      },
      {
        topic: 'inventory_levels/update',
        address: `${this.appUrl}/webhooks/shopify`,
      },
    ];

    for (const webhook of webhooks) {
      try {
        await this.createWebhook(shopDomain, accessToken, webhook.topic, webhook.address);
      } catch (error) {
        this.logger.error(`Failed to register webhook ${webhook.topic}: ${shopDomain}`, error);
        // Continue with other webhooks
      }
    }
  }

  /**
   * Create a single webhook
   */
  private async createWebhook(
    shopDomain: string,
    accessToken: string,
    topic: string,
    address: string,
  ): Promise<void> {
    const url = `https://${shopDomain}/admin/api/2024-01/webhooks.json`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({
        webhook: {
          topic,
          address,
          format: 'json',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Webhook creation failed: ${error}`);
    }
  }

  /**
   * Build embedded app URL
   */
  private buildEmbeddedAppUrl(shopDomain: string): string {
    // Generate host parameter for App Bridge
    const host = Buffer.from(`${shopDomain}/admin`).toString('base64');
    return `${this.frontendUrl}?shop=${shopDomain}&host=${host}`;
  }

  /**
   * Validate OAuth callback
   */
  private validateOAuthCallback(
    shop: string,
    code: string,
    hmac: string,
    state?: string,
  ): boolean {
    // Build query string without hmac and signature
    const params: Record<string, string> = {
      shop,
      code,
    };
    if (state) {
      params.state = state;
    }

    return HmacUtil.verifyOAuthCallback(this.apiSecret, params, hmac);
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

  /**
   * Validate shop domain format
   */
  private isValidShopDomain(domain: string): boolean {
    return /^[a-z0-9-]+\.myshopify\.com$/.test(domain);
  }

  /**
   * Generate state parameter for OAuth (simple implementation)
   * In production, use a secure random string and store in session/redis
   */
  private generateState(shopDomain: string): string {
    // Simple state generation - in production, use crypto.randomBytes
    return Buffer.from(shopDomain).toString('base64');
  }

  /**
   * Get start of current month (UTC)
   */
  private getStartOfCurrentMonth(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }
}
