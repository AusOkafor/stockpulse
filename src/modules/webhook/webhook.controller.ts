import { Controller, Post, Body, Headers, RawBodyRequest, Req, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhookService } from './webhook.service';
import { HmacUtil } from '../../common/utils/hmac.util';

/**
 * Webhook Controller
 * Handles incoming Shopify webhooks
 * 
 * CRITICAL: HMAC verification is required for security
 */
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  private readonly apiSecret: string;

  constructor(
    private readonly webhookService: WebhookService,
    private readonly configService: ConfigService,
  ) {
    this.apiSecret = this.configService.get<string>('SHOPIFY_API_SECRET') || '';
  }

  @Post('shopify')
  async handleShopifyWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-shopify-topic') topic: string,
    @Headers('x-shopify-shop-domain') shopDomain: string,
    @Headers('x-shopify-hmac-sha256') hmac: string,
    @Body() payload: any,
  ) {
    // CRITICAL: Verify HMAC for security
    // Raw body is needed for HMAC verification (must be exact bytes from request)
    const rawBody = req.rawBody?.toString('utf-8') || JSON.stringify(payload);
    
    if (!this.verifyWebhookHmac(rawBody, hmac)) {
      this.logger.error(`Invalid HMAC for webhook: ${topic} from shop: ${shopDomain}`);
      throw new UnauthorizedException('Invalid webhook signature');
    }

    this.logger.log(`Verified webhook: ${topic} from shop: ${shopDomain}`);
    
    // Process webhook
    await this.webhookService.handleWebhook(topic, shopDomain, payload);
    
    // Return 200 OK to Shopify
    return { status: 'ok' };
  }

  /**
   * Verify webhook HMAC signature
   * Uses constant-time comparison to prevent timing attacks
   */
  private verifyWebhookHmac(body: string, hmac: string): boolean {
    if (!this.apiSecret || !hmac) {
      this.logger.warn('Missing API secret or HMAC - skipping verification in development');
      // In development, allow bypass if secret is not set
      return process.env.NODE_ENV === 'development';
    }

    return HmacUtil.verifyWebhook(this.apiSecret, body, hmac);
  }
}

