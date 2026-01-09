import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';

@Processor('handle-restock')
@Injectable()
export class HandleRestockJob extends WorkerHost {
  private readonly logger = new Logger(HandleRestockJob.name);

  async process(job: Job<any, any, string>): Promise<any> {
    try {
      // Process inventory_levels/update webhook
      // Find demand requests for variant
      // Enqueue SendNotificationJob for each pending request
      this.logger.log(`Processing restock job: ${job.id}`);
    } catch (error) {
      this.logger.error(`Error processing restock job ${job.id}:`, error);
      throw error;
    }
  }
}

