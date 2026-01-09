import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';

@Processor('expire-recovery-links')
@Injectable()
export class ExpireRecoveryLinksJob extends WorkerHost {
  private readonly logger = new Logger(ExpireRecoveryLinksJob.name);

  async process(job: Job<any, any, string>): Promise<any> {
    try {
      // Clean up expired recovery links
      // Scheduled job (cron)
      this.logger.log(`Processing expire recovery links job: ${job.id}`);
    } catch (error) {
      this.logger.error(`Error processing expire recovery links job ${job.id}:`, error);
      throw error;
    }
  }
}

