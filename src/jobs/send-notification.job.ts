import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';

@Processor('send-notification')
@Injectable()
export class SendNotificationJob extends WorkerHost {
  private readonly logger = new Logger(SendNotificationJob.name);

  async process(job: Job<any, any, string>): Promise<any> {
    try {
      // Send email/WhatsApp notification
      // Create recovery link
      // Update demand request status to NOTIFIED
      this.logger.log(`Processing notification job: ${job.id}`);
    } catch (error) {
      this.logger.error(`Error processing notification job ${job.id}:`, error);
      throw error;
    }
  }
}

