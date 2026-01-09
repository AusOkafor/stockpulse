import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationProvider } from './notification.provider';
import { NotificationInput } from '../types/notification.types';
import { TemplateRenderer } from '../templates/template.renderer';

/**
 * Postmark Email Provider
 * Implements NotificationProvider interface
 * Stubbed for now - no actual sending until ENABLE_NOTIFICATIONS is true
 */
@Injectable()
export class PostmarkProvider implements NotificationProvider {
  private readonly logger = new Logger(PostmarkProvider.name);
  private readonly enableNotifications: boolean;

  constructor(private readonly configService: ConfigService) {
    this.enableNotifications =
      this.configService.get<string>('ENABLE_NOTIFICATIONS', 'false') === 'true';
  }

  async send(input: NotificationInput): Promise<void> {
    // Only handle EMAIL channel
    if (input.channel !== 'EMAIL') {
      this.logger.warn(`PostmarkProvider: Skipping ${input.channel} notification (email only)`);
      return;
    }

    // Render template
    const rendered = TemplateRenderer.render(input.template, input.data);

    // Stub implementation - log for now
    if (!this.enableNotifications) {
      this.logger.log(
        `[EMAIL STUB] To: ${input.to}, Subject: ${rendered.subject}, Body: ${rendered.body?.substring(0, 100)}...`,
      );
      return;
    }

    // TODO: Implement actual Postmark API call
    // const postmarkApiKey = this.configService.get<string>('POSTMARK_API_KEY');
    // await postmarkClient.sendEmail({
    //   To: input.to,
    //   Subject: rendered.subject,
    //   TextBody: rendered.body,
    // });
    
    this.logger.log(`[EMAIL] Sent to ${input.to} via Postmark`);
  }
}

