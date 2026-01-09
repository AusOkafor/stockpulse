import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationProvider } from './providers/notification.provider';
import { NotificationInput, NotificationTemplate } from './types/notification.types';
import { PostmarkProvider } from './providers/postmark.provider';
import { TwilioProvider } from './providers/twilio.provider';
import { DemandRequest, DemandChannel } from '../../entities/demand-request.entity';

/**
 * Notification Service
 * Single entry point for all notifications
 * 
 * All manual + auto notifications go through this service.
 * The app never sends notifications directly.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly emailProvider: NotificationProvider;
  private readonly smsProvider: NotificationProvider;

  constructor(
    private readonly configService: ConfigService,
    private readonly postmarkProvider: PostmarkProvider,
    private readonly twilioProvider: TwilioProvider,
  ) {
    // Select providers based on config (defaults to stubbed providers)
    this.emailProvider = postmarkProvider;
    this.smsProvider = twilioProvider;
  }

  /**
   * Notify customer about product restock
   * This is the single method used by both manual and auto notifications
   */
  async notifyRestock(
    demandRequest: DemandRequest,
    recoveryUrl: string,
  ): Promise<void> {
    // Map DemandChannel to notification channel
    // CRITICAL: Explicit switch ensures correct routing when new channels are added
    let channel: 'EMAIL' | 'SMS';
    switch (demandRequest.channel) {
      case DemandChannel.EMAIL:
        channel = 'EMAIL';
        break;
      case DemandChannel.WHATSAPP:
        channel = 'SMS'; // WhatsApp uses SMS provider
        break;
      default:
        throw new Error(`Unsupported demand channel: ${demandRequest.channel}`);
    }

    // Prepare template data
    const templateData = {
      productName: demandRequest.variant?.product?.title || 'Your product',
      recoveryUrl,
      customerName: this.extractCustomerName(demandRequest.contact),
    };

    // Create notification input
    const input: NotificationInput = {
      channel,
      to: demandRequest.contact,
      template: NotificationTemplate.RESTOCK_AVAILABLE,
      data: templateData,
    };

    // CRITICAL: Explicit provider routing with switch statement
    // Do not rely on string matching or fallthrough
    let provider: NotificationProvider;
    switch (input.channel) {
      case 'EMAIL':
        provider = this.emailProvider;
        break;
      case 'SMS':
        provider = this.smsProvider;
        break;
      default:
        throw new Error(`Unsupported notification channel: ${input.channel}`);
    }

    // Extract IDs for logging (critical for debugging merchant issues)
    const demandRequestId = demandRequest.id;
    const variantId = demandRequest.variantId;
    const productId = demandRequest.variant?.productId;

    try {
      await provider.send(input);
      this.logger.log(
        `Notification sent successfully - demandRequestId: ${demandRequestId}, productId: ${productId}, variantId: ${variantId}, channel: ${channel}, to: ${demandRequest.contact}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send notification - demandRequestId: ${demandRequestId}, productId: ${productId}, variantId: ${variantId}, channel: ${channel}, to: ${demandRequest.contact}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Extract customer name from contact (email or phone)
   * Simple extraction for template personalization
   */
  private extractCustomerName(contact: string): string {
    // For email: try to extract name from "name@domain.com" or "first.last@domain.com"
    if (contact.includes('@')) {
      const localPart = contact.split('@')[0];
      // Try to extract name from patterns like "john.doe" or "john_doe"
      if (localPart.includes('.') || localPart.includes('_')) {
        const parts = localPart.split(/[._]/);
        if (parts.length > 0) {
          return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        }
      }
      return localPart.charAt(0).toUpperCase() + localPart.slice(1);
    }
    // For phone numbers, no name extraction
    return '';
  }
}

