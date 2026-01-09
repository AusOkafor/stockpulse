import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecoveryController } from './recovery.controller';
import { RecoveryService } from './recovery.service';
import { OrderAttribution } from '../../entities/order-attribution.entity';
import { RecoveryLink } from '../../entities/recovery-link.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OrderAttribution, RecoveryLink])],
  controllers: [RecoveryController],
  providers: [RecoveryService],
  exports: [RecoveryService],
})
export class RecoveryModule {}

