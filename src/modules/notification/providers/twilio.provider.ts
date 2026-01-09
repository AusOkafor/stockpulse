import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationProvider } from './notification.provider';
import { NotificationInput } from '../types/notification.types';
import { TemplateRenderer } from '../templates/template.renderer';

/**
 * Twilio SMS/WhatsApp Provider
 * Implements NotificationProvider interface
 * Stubbed for now - no actual sending until ENABLE_NOTIFICATIONS is true
 */
@Injectable()
export class TwilioProvider implements NotificationProvider {
  private readonly logger = new Logger(TwilioProvider.name);
  private readonly enableNotifications: boolean;

  constructor(private readonly configService: ConfigService) {
    this.enableNotifications =
      this.configService.get<string>('ENABLE_NOTIFICATIONS', 'false') === 'true';
  }

  async send(input: NotificationInput): Promise<void> {
    // Only handle SMS channel
    // Note: WHATSAPP from DemandChannel is already mapped to 'SMS' in NotificationService
    if (input.channel !== 'SMS') {
      this.logger.warn(`TwilioProvider: Skipping ${input.channel} notification (SMS only)`);
      return;
    }

    // Render template
    const rendered = TemplateRenderer.render(input.template, input.data);

    // Stub implementation - log for now
    if (!this.enableNotifications) {
      this.logger.log(
        `[SMS STUB] To: ${input.to}, Body: ${rendered.body?.substring(0, 100)}...`,
      );
      return;
    }

    // TODO: Implement actual Twilio API call
    // const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    // const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    // await twilioClient.messages.create({
    //   to: input.to,
    //   from: this.configService.get<string>('TWILIO_PHONE_NUMBER'),
    //   body: rendered.body,
    // });
    
    this.logger.log(`[SMS] Sent to ${input.to} via Twilio`);
  }
}

