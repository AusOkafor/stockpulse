import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { DemandChannel, DemandRequest, DemandStatus } from '../../entities/demand-request.entity';
import { Product } from '../../entities/product.entity';
import { Variant } from '../../entities/variant.entity';
import { RecoveryLink } from '../../entities/recovery-link.entity';
import { OrderAttribution } from '../../entities/order-attribution.entity';
import { Shop } from '../../entities/shop.entity';
import { ShopSettings } from '../../entities/shop-settings.entity';
import { NotificationService } from '../notification/notification.service';
import { PlanService } from '../plan/plan.service';
import * as crypto from 'crypto';

export interface WaitlistItem {
  id: string;
  channel: string;
  status: string;
  contactMasked: string;
  requestedAt: Date;
  recoveredRevenue: number | null;
}

export interface ProductWaitlistResponse {
  product: {
    id: string;
    title: string;
    image: string | null;
  };
  waitlist: WaitlistItem[];
  summary: {
    totalWaiting: number;
    totalNotified: number;
    totalRecoveredRevenue: number;
  };
}

@Injectable()
export class DemandService {
  private readonly logger = new Logger(DemandService.name);

  constructor(
    @InjectRepository(DemandRequest)
    private readonly demandRequestRepository: Repository<DemandRequest>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Variant)
    private readonly variantRepository: Repository<Variant>,
    @InjectRepository(RecoveryLink)
    private readonly recoveryLinkRepository: Repository<RecoveryLink>,
    @InjectRepository(OrderAttribution)
    private readonly orderAttributionRepository: Repository<OrderAttribution>,
    @InjectRepository(Shop)
    private readonly shopRepository: Repository<Shop>,
    @InjectRepository(ShopSettings)
    private readonly shopSettingsRepository: Repository<ShopSettings>,
    private readonly notificationService: NotificationService,
    private readonly planService: PlanService,
  ) {}

  /**
   * Mask email address for privacy
   * Example: john.doe@gmail.com -> jo***@gmail.com
   */
  private maskEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2) {
      return `${localPart[0]}***@${domain}`;
    }
    return `${localPart.substring(0, 2)}***@${domain}`;
  }

  /**
   * Mask phone number for privacy
   * Example: +1234567890 -> +1•••7890
   */
  private maskPhone(phone: string): string {
    if (phone.length <= 4) {
      return '•••' + phone.slice(-4);
    }
    return phone.slice(0, -4) + '•••' + phone.slice(-4);
  }

  normalizeShopDomain(domain: string): string {
    const normalized = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!normalized.endsWith('.myshopify.com')) {
      return `${normalized}.myshopify.com`.toLowerCase();
    }
    return normalized.toLowerCase();
  }

  async getWidgetData(input: { shopDomain: string; variantId: string }) {
    const shop = await this.shopRepository.findOne({
      where: { shopifyDomain: input.shopDomain },
    });

    if (!shop) {
      throw new NotFoundException(`Shop not found: ${input.shopDomain}`);
    }

    const variant = await this.variantRepository
      .createQueryBuilder('variant')
      .innerJoinAndSelect('variant.product', 'product')
      .where('variant.shopifyVariantId = :variantId OR variant.id = :variantId', {
        variantId: input.variantId,
      })
      .andWhere('product.shopId = :shopId', { shopId: shop.id })
      .getOne();

    if (!variant) {
      throw new NotFoundException(`Variant not found for shop: ${input.variantId}`);
    }

    const demandCount = await this.demandRequestRepository.count({
      where: {
        variantId: variant.id,
        status: In([DemandStatus.PENDING, DemandStatus.NOTIFIED]),
      },
    });

    const settings = await this.shopSettingsRepository.findOne({
      where: { shopId: shop.id },
    });

    return {
      stockRemaining: variant.inventoryQuantity,
      demandCount,
      restockExpected: null,
      widgetConfig: {
        autoNotifyOnRestock: settings?.autoNotifyOnRestock ?? false,
      },
    };
  }

  async createWidgetDemandRequest(input: {
    shopDomain: string;
    variantId: string;
    contact: string;
    channel: string;
  }) {
    const shop = await this.shopRepository.findOne({
      where: { shopifyDomain: input.shopDomain },
    });

    if (!shop) {
      throw new NotFoundException(`Shop not found: ${input.shopDomain}`);
    }

    const variant = await this.variantRepository
      .createQueryBuilder('variant')
      .innerJoinAndSelect('variant.product', 'product')
      .where('variant.shopifyVariantId = :variantId OR variant.id = :variantId', {
        variantId: input.variantId,
      })
      .andWhere('product.shopId = :shopId', { shopId: shop.id })
      .getOne();

    if (!variant) {
      throw new NotFoundException(`Variant not found for shop: ${input.variantId}`);
    }

    const channel = this.normalizeChannel(input.channel);
    this.validateContact(input.contact, channel);

    const existing = await this.demandRequestRepository.findOne({
      where: {
        variantId: variant.id,
        contact: input.contact,
        status: DemandStatus.PENDING,
      },
    });

    if (existing) {
      return { success: true, id: existing.id, message: 'Already on waitlist' };
    }

    const request = this.demandRequestRepository.create({
      variantId: variant.id,
      contact: input.contact,
      channel,
      status: DemandStatus.PENDING,
    });

    const saved = await this.demandRequestRepository.save(request);
    return { success: true, id: saved.id, message: 'Waitlist request created' };
  }

  private normalizeChannel(channel: string): DemandChannel {
    const normalized = channel.trim().toUpperCase();
    if (normalized === 'EMAIL') {
      return DemandChannel.EMAIL;
    }
    if (normalized === 'WHATSAPP' || normalized === 'SMS' || normalized === 'PHONE') {
      return DemandChannel.WHATSAPP;
    }
    throw new BadRequestException('Unsupported channel');
  }

  private validateContact(contact: string, channel: DemandChannel) {
    if (channel === DemandChannel.EMAIL) {
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
      if (!isValid) {
        throw new BadRequestException('Invalid email address');
      }
      return;
    }

    const isValid = /^[+\d][\d\s\-().]{6,}$/.test(contact);
    if (!isValid) {
      throw new BadRequestException('Invalid phone number');
    }
  }

  async getProductWaitlist(productId: string): Promise<ProductWaitlistResponse> {
    // Fetch product with variants
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Get all variants for this product
    // IMPORTANT: Demand is stored variant-level, but UI aggregates product-level
    // This allows variant-specific notifications while showing product-level rollup
    const variants = await this.variantRepository.find({
      where: { productId },
    });

    if (variants.length === 0) {
      return {
        product: {
          id: product.id,
          title: product.title,
          image: product.imageUrl,
        },
        waitlist: [],
        summary: {
          totalWaiting: 0,
          totalNotified: 0,
          totalRecoveredRevenue: 0,
        },
      };
    }

    const variantIds = variants.map((v) => v.id);

    // Fetch all demand requests for these variants
    const demandRequests = await this.demandRequestRepository
      .createQueryBuilder('dr')
      .where('dr.variantId IN (:...variantIds)', { variantIds })
      .orderBy('dr.createdAt', 'DESC')
      .getMany();

    // Get recovery links for these demand requests
    const demandRequestIds = demandRequests.map((dr) => dr.id);
    const recoveryLinks =
      demandRequestIds.length > 0
        ? await this.recoveryLinkRepository
            .createQueryBuilder('rl')
            .where('rl.demandRequestId IN (:...demandRequestIds)', {
              demandRequestIds,
            })
            .getMany()
        : [];

    const recoveryLinkIds = recoveryLinks.map((rl) => rl.id);

    // Get order attributions for these recovery links
    const orderAttributions =
      recoveryLinkIds.length > 0
        ? await this.orderAttributionRepository
            .createQueryBuilder('oa')
            .where('oa.recoveryLinkId IN (:...recoveryLinkIds)', {
              recoveryLinkIds,
            })
            .getMany()
        : [];

    // Create a map of recovery link ID to revenue
    const recoveryLinkToRevenue = new Map<string, number>();
    orderAttributions.forEach((oa) => {
      if (oa.recoveryLinkId) {
        const current = recoveryLinkToRevenue.get(oa.recoveryLinkId) || 0;
        recoveryLinkToRevenue.set(oa.recoveryLinkId, current + Number(oa.revenue));
      }
    });

    // Create a map of demand request ID to recovery link
    const demandRequestToRecoveryLink = new Map<string, RecoveryLink>();
    recoveryLinks.forEach((rl) => {
      demandRequestToRecoveryLink.set(rl.demandRequestId, rl);
    });

    // Build waitlist items
    const waitlist: WaitlistItem[] = demandRequests.map((dr) => {
      const recoveryLink = demandRequestToRecoveryLink.get(dr.id);
      const recoveredRevenue = recoveryLink
        ? recoveryLinkToRevenue.get(recoveryLink.id) || null
        : null;

      // Mask contact information
      const contactMasked =
        dr.channel === 'EMAIL'
          ? this.maskEmail(dr.contact)
          : this.maskPhone(dr.contact);

      return {
        id: dr.id,
        channel: dr.channel,
        status: dr.status,
        contactMasked,
        requestedAt: dr.createdAt,
        recoveredRevenue: recoveredRevenue !== null && recoveredRevenue !== undefined
          ? parseFloat(recoveredRevenue.toFixed(2))
          : null,
      };
    });

    // Calculate summary
    const totalWaiting = waitlist.filter((w) => w.status === DemandStatus.PENDING).length;
    const totalNotified = waitlist.filter((w) => w.status === DemandStatus.NOTIFIED).length;
    const totalRecoveredRevenue = waitlist.reduce(
      (sum, w) => sum + (w.recoveredRevenue || 0),
      0,
    );

    return {
      product: {
        id: product.id,
        title: product.title,
        image: product.imageUrl,
      },
      waitlist,
      summary: {
        totalWaiting,
        totalNotified,
        totalRecoveredRevenue: Number(totalRecoveredRevenue.toFixed(2)),
      },
    };
  }

  /**
   * Generate a unique recovery token
   */
  private generateRecoveryToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Notify a customer about product restock
   * 
   * CRITICAL: Order of operations must be:
   * 1. Validate status === PENDING
   * 2. Generate recovery link
   * 3. Call NotificationService (may throw)
   * 4. Only then mark as NOTIFIED
   * 
   * If step 4 happens before step 3 and provider throws → silent data corruption
   */
  async notifyDemandRequest(demandRequestId: string): Promise<{
    success: boolean;
    message: string;
    recoveryLinkId?: string;
  }> {
    // Fetch demand request with relations for logging
    const demandRequest = await this.demandRequestRepository.findOne({
      where: { id: demandRequestId },
      relations: ['variant', 'variant.product'],
    });

    if (!demandRequest) {
      throw new NotFoundException(`Demand request with ID ${demandRequestId} not found`);
    }

    // Extract IDs for logging
    const variantId = demandRequest.variantId;
    const productId = demandRequest.variant?.productId;
    const channel = demandRequest.channel;

    // STEP 1: Validate status === PENDING
    // Check if already notified
    if (demandRequest.status === DemandStatus.NOTIFIED) {
      this.logger.warn(
        `Attempted to notify already notified request - demandRequestId: ${demandRequestId}, productId: ${productId}, variantId: ${variantId}, channel: ${channel}`,
      );
      throw new BadRequestException('Customer has already been notified');
    }

    // Check if already converted
    if (demandRequest.status === DemandStatus.CONVERTED) {
      this.logger.warn(
        `Attempted to notify already converted request - demandRequestId: ${demandRequestId}, productId: ${productId}, variantId: ${variantId}, channel: ${channel}`,
      );
      throw new BadRequestException('Customer has already converted');
    }

    // CRITICAL: Re-fetch to ensure status hasn't changed (race condition safeguard)
    // This prevents double-notify if webhook fires multiple times rapidly
    // Status check at DB level is the final gate
    const currentRequest = await this.demandRequestRepository.findOne({
      where: { id: demandRequestId },
    });

    if (!currentRequest) {
      throw new NotFoundException(`Demand request with ID ${demandRequestId} not found`);
    }

    if (currentRequest.status !== DemandStatus.PENDING) {
      this.logger.warn(
        `Attempted to notify non-pending request - demandRequestId: ${demandRequestId}, productId: ${productId}, variantId: ${variantId}, channel: ${channel}, status: ${currentRequest.status}`,
      );
      throw new BadRequestException(
        `Demand request status is ${currentRequest.status}, cannot notify`,
      );
    }

    // Use the re-fetched request to ensure we have the latest state
    demandRequest.status = currentRequest.status;

    // PLAN ENFORCEMENT: Check manual notify limit before proceeding
    // Server-side enforcement - no frontend gating
    const shopId = demandRequest.variant?.product?.shopId;
    if (!shopId) {
      throw new NotFoundException('Shop ID not found for demand request');
    }
    
    await this.planService.checkManualNotifyLimit(shopId);

    // STEP 2: Generate recovery link
    const recoveryLink = this.recoveryLinkRepository.create({
      demandRequestId: demandRequest.id,
      token: this.generateRecoveryToken(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    });
    const savedRecoveryLink = await this.recoveryLinkRepository.save(recoveryLink);

    // STEP 3: Call NotificationService (may throw - do NOT mark as notified before this)
    // This is the single entry point for all notifications (manual + auto)
    const recoveryUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/recover/${savedRecoveryLink.token}`;
    
    this.logger.log(
      `Attempting to notify customer - demandRequestId: ${demandRequestId}, productId: ${productId}, variantId: ${variantId}, channel: ${channel}`,
    );
    
    await this.notificationService.notifyRestock(demandRequest, recoveryUrl);

    // STEP 4: Only after successful notification, mark as NOTIFIED
    // If NotificationService throws, this line never executes → no data corruption
    demandRequest.status = DemandStatus.NOTIFIED;
    demandRequest.notifiedAt = new Date();
    await this.demandRequestRepository.save(demandRequest);

    // PLAN ENFORCEMENT: Increment usage only after successful notification
    // This ensures accurate usage tracking
    await this.planService.incrementNotificationUsage(shopId);

    this.logger.log(
      `Customer notified successfully - demandRequestId: ${demandRequestId}, productId: ${productId}, variantId: ${variantId}, channel: ${channel}, recoveryLinkId: ${savedRecoveryLink.id}`,
    );

    return {
      success: true,
      message: 'Customer notified successfully',
      recoveryLinkId: savedRecoveryLink.id,
    };
  }
}

