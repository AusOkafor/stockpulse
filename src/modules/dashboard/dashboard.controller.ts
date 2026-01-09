import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ShopAuthGuard } from '../../common/guards/shop-auth.guard';
import { Shop } from '../../entities/shop.entity';

/**
 * Dashboard Controller
 * Protected route - requires shop authentication
 */
@Controller('dashboard')
@UseGuards(ShopAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboard(@Req() req: any) {
    // Shop is attached by ShopAuthGuard
    const shop = (req as any).shop as Shop;
    return this.dashboardService.getDashboardData(shop.id);
  }
}

