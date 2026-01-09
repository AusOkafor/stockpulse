import { Controller, Get, Query, Res, Logger, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';

/**
 * Auth Controller
 * Handles Shopify OAuth install and callback flows
 */
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * GET /auth/install
   * Initiates OAuth installation flow
   */
  @Get('install')
  async install(@Query('shop') shop: string, @Res() res: Response) {
    if (!shop) {
      throw new BadRequestException('Shop parameter is required');
    }

    try {
      const installUrl = this.authService.getInstallUrl(shop);
      this.logger.log(`Redirecting to install: ${shop}`);
      return res.redirect(installUrl);
    } catch (error) {
      this.logger.error(`Install failed for shop: ${shop}`, error);
      throw error;
    }
  }

  /**
   * GET /auth/callback
   * Handles OAuth callback from Shopify
   */
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('shop') shop: string,
    @Query('hmac') hmac: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (!code || !shop || !hmac) {
      this.logger.error('Missing required OAuth parameters');
      throw new BadRequestException('Missing required OAuth parameters');
    }

    try {
      const redirectUrl = await this.authService.handleCallback(code, shop, hmac, state);
      this.logger.log(`OAuth callback successful: ${shop}`);
      return res.redirect(redirectUrl);
    } catch (error) {
      this.logger.error(`OAuth callback failed for shop: ${shop}`, error);
      // Redirect to error page or show error
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/error?message=Installation failed`);
    }
  }
}
