import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shop } from '../../entities/shop.entity';
import { ShopSettings } from '../../entities/shop-settings.entity';
import { Variant } from '../../entities/variant.entity';
import { DemandRequest, DemandStatus } from '../../entities/demand-request.entity';
import { DemandService } from '../demand/demand.service';
import { PlanService } from '../plan/plan.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectRepository(Shop)
    private readonly shopRepository: Repository<Shop>,
    @InjectRepository(ShopSettings)
    private readonly shopSettingsRepository: Repository<ShopSettings>,
    @InjectRepository(Variant)
    private readonly variantRepository: Repository<Variant>,
    @InjectRepository(DemandRequest)
    private readonly demandRequestRepository: Repository<DemandRequest>,
    private readonly demandService: DemandService,
    private readonly planService: PlanService,
  ) {}

  async handleWebhook(topic: string, shopDomain: string, payload: any): Promise<void> {
    // HMAC verification would go here
    this.logger.log(`Received webhook: ${topic} for shop: ${shopDomain}`);

    // Handle app/uninstalled for cleanup
    if (topic === 'app/uninstalled') {
      await this.handleAppUninstalled(shopDomain, payload);
      return;
    }

    // Handle inventory_levels/update for auto-notify
    if (topic === 'inventory_levels/update') {
      await this.handleInventoryUpdate(shopDomain, payload);
      return;
    }

    // Other webhook topics: products/update, orders/create
    // Would be handled here
  }

  /**
   * Handle app/uninstalled webhook
   * Soft-deletes shop and marks as inactive
   * 
   * CRITICAL: Do NOT hard delete data - leave for reinstalls
   */
  private async handleAppUninstalled(shopDomain: string, payload: any): Promise<void> {
    try {
      // Find shop
      const shop = await this.shopRepository.findOne({
        where: { shopifyDomain: shopDomain },
      });

      if (!shop) {
        this.logger.warn(`Shop not found for uninstall: ${shopDomain}`);
        return;
      }

      // Mark shop as inactive (soft delete)
      shop.isActive = false;
      await this.shopRepository.save(shop);

      this.logger.log(`Shop uninstalled: ${shopDomain}`);

      // NOTE: We do NOT delete:
      // - ShopPlan (plan remains for potential reinstall)
      // - ShopSettings (settings remain for potential reinstall)
      // - Products, Variants, DemandRequests (data remains for audit/reinstall)
      // - OrderAttributions (revenue data must be preserved)

      // In the future, you might want to:
      // - Delete webhooks
      // - Cancel scheduled jobs
      // - Clean up API tokens
      // But do NOT delete data records
    } catch (error) {
      this.logger.error(`Error handling app uninstall for shop: ${shopDomain}`, error);
      // Don't throw - webhook processing should be resilient
    }
  }

  /**
   * Handle inventory level update webhook
   * Auto-notifies customers if settings allow and inventory becomes available
   */
  private async handleInventoryUpdate(shopDomain: string, payload: any): Promise<void> {
    try {
      // Find shop
      const shop = await this.shopRepository.findOne({
        where: { shopifyDomain: shopDomain },
      });

      if (!shop) {
        this.logger.warn(`Shop not found: ${shopDomain}`);
        return;
      }

      // PLAN ENFORCEMENT: Check if shop can use auto-notify (PRO plan only)
      // Hard gate - free users cannot use auto-notify
      const canAutoNotify = await this.planService.canUseAutoNotify(shop.id);
      if (!canAutoNotify) {
        this.logger.warn(`Auto-notify blocked - free plan for shop: ${shopDomain}`);
        return;
      }

      // Get shop settings
      let settings = await this.shopSettingsRepository.findOne({
        where: { shopId: shop.id },
      });

      // If no settings, default to false (don't auto-notify)
      if (!settings || !settings.autoNotifyOnRestock) {
        this.logger.debug(`Auto-notify disabled in settings for shop: ${shopDomain}`);
        return;
      }

      // Extract inventory level data from payload
      const inventoryItemId = payload.inventory_item_id;
      const available = payload.available;

      // Only proceed if inventory is now available (was 0, now > 0)
      if (!available || available <= 0) {
        this.logger.debug(`No inventory available for item: ${inventoryItemId}`);
        return;
      }

      // Find variant by Shopify inventory item ID
      // Note: This assumes shopify_variant_id maps to inventory_item_id
      // You may need to adjust based on your data model
      const variant = await this.variantRepository.findOne({
        where: { shopifyVariantId: inventoryItemId.toString() },
      });

      if (!variant) {
        this.logger.debug(`Variant not found for inventory item: ${inventoryItemId}`);
        return;
      }

      // Check if variant was previously out of stock (inventoryQuantity was 0)
      // If it's now available, notify waiting customers
      // IMPORTANT: Demand is variant-level, but dashboard aggregates product-level
      // This ensures only customers waiting for THIS specific variant are notified
      if (variant.inventoryQuantity === 0 && available > 0) {
        // Update variant inventory first
        variant.inventoryQuantity = available;
        await this.variantRepository.save(variant);

        // Find all PENDING demand requests for THIS SPECIFIC VARIANT
        // CRITICAL: Query with status check at DB level to prevent double-notify
        // Even if webhook fires multiple times, status check prevents duplicates
        const waitingRequests = await this.demandRequestRepository.find({
          where: {
            variantId: variant.id,
            status: DemandStatus.PENDING, // DB-level status check - final gate
          },
        });

        this.logger.log(
          `Found ${waitingRequests.length} PENDING customers for variant ${variant.id} (product-level aggregation happens in dashboard)`,
        );

        // Notify each waiting customer
        // Throttle: Process in batches to avoid overwhelming the system
        const batchSize = 10;
        for (let i = 0; i < waitingRequests.length; i += batchSize) {
          const batch = waitingRequests.slice(i, i + batchSize);
          
          await Promise.all(
            batch.map(async (request) => {
              try {
                // notifyDemandRequest has additional status check as safeguard
                // This double-check prevents race conditions from rapid webhook fires
                await this.demandService.notifyDemandRequest(request.id);
                this.logger.log(`Auto-notified customer: ${request.id}`);
              } catch (error: any) {
                // If already notified, that's expected - log and continue
                if (error?.message?.includes('already been notified')) {
                  this.logger.debug(`Customer ${request.id} already notified (race condition handled)`);
                } else {
                  this.logger.error(`Failed to notify customer ${request.id}:`, error);
                }
                // Continue with other customers even if one fails
              }
            }),
          );

          // Small delay between batches to avoid rate limiting
          if (i + batchSize < waitingRequests.length) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }
      } else {
        // Update inventory quantity even if not notifying
        variant.inventoryQuantity = available;
        await this.variantRepository.save(variant);
      }
    } catch (error) {
      this.logger.error(`Error handling inventory update:`, error);
      // Don't throw - webhook processing should be resilient
    }
  }
}

