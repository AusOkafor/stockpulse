import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShopPlan } from '../../entities/shop-plan.entity';
import { PlanTier } from '../../entities/plan-tier.enum';

/**
 * Plan Service
 * Handles plan management and feature enforcement
 * 
 * Server-side enforcement only - no frontend gating
 */
@Injectable()
export class PlanService {
  private readonly logger = new Logger(PlanService.name);

  constructor(
    @InjectRepository(ShopPlan)
    private readonly shopPlanRepository: Repository<ShopPlan>,
  ) {}

  /**
   * Get or create plan for a shop
   * Defaults to FREE plan with 50 monthly notifications
   */
  async getOrCreatePlan(shopId: string): Promise<ShopPlan> {
    let plan = await this.shopPlanRepository.findOne({
      where: { shopId },
    });

    if (!plan) {
      plan = this.shopPlanRepository.create({
        shopId,
        plan: PlanTier.FREE,
        monthlyNotifyLimit: 50,
        notificationsUsedThisMonth: 0,
        usageResetAt: this.getStartOfCurrentMonth(),
      });
      plan = await this.shopPlanRepository.save(plan);
      this.logger.log(`Created default FREE plan for shop: ${shopId}`);
    }

    // Lazy reset: Check if we need to reset monthly usage
    await this.resetMonthlyUsageIfNeeded(plan);

    return plan;
  }

  /**
   * Get plan for a shop (throws if not found)
   */
  async getPlan(shopId: string): Promise<ShopPlan> {
    const plan = await this.getOrCreatePlan(shopId);
    return plan;
  }

  /**
   * Check if shop can send manual notification
   * Throws ForbiddenException if limit reached
   */
  async checkManualNotifyLimit(shopId: string): Promise<void> {
    const plan = await this.getOrCreatePlan(shopId);
    
    // Lazy reset if needed
    await this.resetMonthlyUsageIfNeeded(plan);

    // Re-fetch to get updated usage count
    const currentPlan = await this.shopPlanRepository.findOne({
      where: { shopId },
    });

    if (!currentPlan) {
      throw new NotFoundException(`Plan not found for shop: ${shopId}`);
    }

    if (currentPlan.notificationsUsedThisMonth >= currentPlan.monthlyNotifyLimit) {
      this.logger.warn(
        `Manual notify blocked - limit reached for shop: ${shopId}, used: ${currentPlan.notificationsUsedThisMonth}/${currentPlan.monthlyNotifyLimit}`,
      );
      throw new ForbiddenException(
        `Monthly notification limit reached (${currentPlan.notificationsUsedThisMonth}/${currentPlan.monthlyNotifyLimit}). Upgrade to Pro for unlimited notifications.`,
      );
    }
  }

  /**
   * Increment notification usage after successful send
   * Only call this AFTER notification is successfully sent
   */
  async incrementNotificationUsage(shopId: string): Promise<void> {
    const plan = await this.getOrCreatePlan(shopId);
    
    // Lazy reset if needed
    await this.resetMonthlyUsageIfNeeded(plan);

    // Re-fetch to get latest state
    const currentPlan = await this.shopPlanRepository.findOne({
      where: { shopId },
    });

    if (!currentPlan) {
      throw new NotFoundException(`Plan not found for shop: ${shopId}`);
    }

    currentPlan.notificationsUsedThisMonth += 1;
    await this.shopPlanRepository.save(currentPlan);

    this.logger.log(
      `Incremented notification usage for shop: ${shopId}, now: ${currentPlan.notificationsUsedThisMonth}/${currentPlan.monthlyNotifyLimit}`,
    );
  }

  /**
   * Check if shop can use auto-notify feature
   * Returns true only for PRO plan
   */
  async canUseAutoNotify(shopId: string): Promise<boolean> {
    const plan = await this.getOrCreatePlan(shopId);
    
    // Lazy reset if needed
    await this.resetMonthlyUsageIfNeeded(plan);

    // Re-fetch to get latest state
    const currentPlan = await this.shopPlanRepository.findOne({
      where: { shopId },
    });

    if (!currentPlan) {
      return false;
    }

    return currentPlan.plan === PlanTier.PRO;
  }

  /**
   * Lazy reset monthly usage if we're in a new month
   * No cron jobs - runs on-demand
   */
  private async resetMonthlyUsageIfNeeded(plan: ShopPlan): Promise<void> {
    const startOfCurrentMonth = this.getStartOfCurrentMonth();

    if (!plan.usageResetAt || plan.usageResetAt < startOfCurrentMonth) {
      plan.notificationsUsedThisMonth = 0;
      plan.usageResetAt = startOfCurrentMonth;
      await this.shopPlanRepository.save(plan);
      this.logger.log(`Reset monthly usage for shop: ${plan.shopId}`);
    }
  }

  /**
   * Get start of current month (UTC)
   */
  private getStartOfCurrentMonth(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  /**
   * Update plan tier (for future use when payments are added)
   */
  async updatePlanTier(shopId: string, tier: PlanTier): Promise<ShopPlan> {
    const plan = await this.getOrCreatePlan(shopId);
    plan.plan = tier;
    
    // Update limits based on tier
    if (tier === PlanTier.PRO) {
      plan.monthlyNotifyLimit = 10000; // Effectively unlimited for Pro
    } else {
      plan.monthlyNotifyLimit = 50; // Free tier limit
    }
    
    return await this.shopPlanRepository.save(plan);
  }
}

