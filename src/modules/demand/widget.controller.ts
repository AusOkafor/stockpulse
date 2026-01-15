import { BadRequestException, Controller, Get, Post, Query, Body, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HmacUtil } from '../../common/utils/hmac.util';
import { DemandService } from './demand.service';
import { WidgetDataQueryDto } from './dto/widget-data-query.dto';
import { RestockSubscribeDto } from './dto/restock-subscribe.dto';

@Controller()
export class WidgetController {
  constructor(
    private readonly demandService: DemandService,
    private readonly configService: ConfigService,
  ) {}

  @Get('widget-data')
  async getWidgetData(@Query() query: WidgetDataQueryDto) {
    const signature = query.hmac || query.signature;
    if (!signature) {
      throw new BadRequestException('hmac is required');
    }

    const secret = this.configService.get<string>('SHOPIFY_API_SECRET');
    if (!secret) {
      throw new UnauthorizedException('Missing SHOPIFY_API_SECRET');
    }

    const normalizedShop = this.demandService.normalizeShopDomain(query.shop);
    const payload = this.buildHmacPayload({
      shop: normalizedShop,
      variantId: query.variantId,
    });

    if (!HmacUtil.verify(secret, payload, signature)) {
      throw new UnauthorizedException('Invalid signature');
    }

    return this.demandService.getWidgetData({
      shopDomain: normalizedShop,
      variantId: query.variantId,
    });
  }

  @Post('restock/subscribe')
  async subscribe(@Body() body: RestockSubscribeDto) {
    const signature = body.hmac || body.signature;
    if (!signature) {
      throw new BadRequestException('hmac is required');
    }

    const secret = this.configService.get<string>('SHOPIFY_API_SECRET');
    if (!secret) {
      throw new UnauthorizedException('Missing SHOPIFY_API_SECRET');
    }

    const normalizedShop = this.demandService.normalizeShopDomain(body.shop);
    const payload = this.buildHmacPayload({
      shop: normalizedShop,
      variantId: body.variantId,
      contact: body.contact,
      channel: body.channel,
    });

    if (!HmacUtil.verify(secret, payload, signature)) {
      throw new UnauthorizedException('Invalid signature');
    }

    return this.demandService.createWidgetDemandRequest({
      shopDomain: normalizedShop,
      variantId: body.variantId,
      contact: body.contact,
      channel: body.channel,
    });
  }

  private buildHmacPayload(input: Record<string, string>): string {
    const entries = Object.entries(input).sort(([a], [b]) => a.localeCompare(b));
    return entries.map(([key, value]) => `${key}=${value}`).join('&');
  }
}

