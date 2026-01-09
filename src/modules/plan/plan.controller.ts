import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { PlanService } from './plan.service';
import { Shop } from '../../entities/shop.entity';
import { ShopAuthGuard } from '../../common/guards/shop-auth.guard';

export interface PlanResponse {
  plan: {
    tier: string;
    monthlyNotifyLimit: number;
    notificationsUsedThisMonth: number;
    usageResetAt: Date | null;
  };
}

/**
 * Plan Controller
 * Provides plan information to frontend (read-only)
 * 
 * Enforcement happens server-side in services
 */
@Controller('plan')
@UseGuards(ShopAuthGuard)
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Get()
  async getPlan(@Req() req: any): Promise<PlanResponse> {
    // Shop is attached by ShopAuthGuard
    const shop = (req as any).shop as Shop;
    const plan = await this.planService.getOrCreatePlan(shop.id);

    return {
      plan: {
        tier: plan.plan,
        monthlyNotifyLimit: plan.monthlyNotifyLimit,
        notificationsUsedThisMonth: plan.notificationsUsedThisMonth,
        usageResetAt: plan.usageResetAt,
      },
    };
  }
}

