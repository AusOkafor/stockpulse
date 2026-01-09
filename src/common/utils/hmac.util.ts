import * as crypto from 'crypto';

/**
 * HMAC Utility
 * Provides secure HMAC verification for Shopify webhooks and OAuth
 * 
 * Uses constant-time comparison to prevent timing attacks
 */
export class HmacUtil {
  /**
   * Verify HMAC signature from Shopify
   * @param secret - Shared secret (Shopify API secret)
   * @param data - Data to verify (query string or body)
   * @param hmac - HMAC signature from Shopify
   * @returns true if signature is valid
   */
  static verify(secret: string, data: string, hmac: string): boolean {
    if (!secret || !data || !hmac) {
      return false;
    }

    // Generate HMAC from data
    const generatedHmac = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(generatedHmac),
      Buffer.from(hmac),
    );
  }

  /**
   * Verify OAuth callback HMAC
   * Validates the HMAC parameter from Shopify OAuth callback
   */
  static verifyOAuthCallback(
    secret: string,
    query: Record<string, string>,
    hmac: string,
  ): boolean {
    // Remove hmac and signature from query params
    const { hmac: _hmac, signature: _signature, ...params } = query;

    // Sort and encode parameters
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join('&');

    return this.verify(secret, sortedParams, hmac);
  }

  /**
   * Verify webhook HMAC
   * Validates webhook signature from Shopify
   */
  static verifyWebhook(secret: string, body: string, hmac: string): boolean {
    return this.verify(secret, body, hmac);
  }
}

