import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { PostmarkProvider } from './providers/postmark.provider';
import { TwilioProvider } from './providers/twilio.provider';

@Module({
  imports: [ConfigModule],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    PostmarkProvider,
    TwilioProvider,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}

