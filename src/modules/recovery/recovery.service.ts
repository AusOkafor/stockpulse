import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderAttribution } from '../../entities/order-attribution.entity';
import { RecoveryLink } from '../../entities/recovery-link.entity';

@Injectable()
export class RecoveryService {
  constructor(
    @InjectRepository(OrderAttribution)
    private readonly orderAttributionRepository: Repository<OrderAttribution>,
    @InjectRepository(RecoveryLink)
    private readonly recoveryLinkRepository: Repository<RecoveryLink>,
  ) {}

  // Revenue attribution logic
  // Only count orders created via recovery links
  // Token validation, product/variant matching
  // Attribution window (e.g., 7 days)
}

