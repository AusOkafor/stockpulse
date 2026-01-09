import { Controller, Get, Post, Param, UseGuards, Req } from '@nestjs/common';
import { DemandService, ProductWaitlistResponse } from './demand.service';
import { ShopAuthGuard } from '../../common/guards/shop-auth.guard';
import { Shop } from '../../entities/shop.entity';

/**
 * Demand Controller
 * Protected routes - requires shop authentication
 */
@Controller('demand')
@UseGuards(ShopAuthGuard)
export class DemandController {
  constructor(private readonly demandService: DemandService) {}

  @Get('product/:productId')
  async getProductWaitlist(
    @Param('productId') productId: string,
    @Req() req: any,
  ): Promise<ProductWaitlistResponse> {
    // Shop is attached by ShopAuthGuard
    const shop = (req as any).shop as Shop;
    // TODO: Verify product belongs to this shop
    return this.demandService.getProductWaitlist(productId);
  }

  @Post(':id/notify')
  async notifyCustomer(@Param('id') id: string, @Req() req: any) {
    // Shop is attached by ShopAuthGuard
    const shop = (req as any).shop as Shop;
    // TODO: Verify demand request belongs to this shop
    return this.demandService.notifyDemandRequest(id);
  }
}

