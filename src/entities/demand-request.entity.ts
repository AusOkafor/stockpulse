import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Variant } from './variant.entity';
import { RecoveryLink } from './recovery-link.entity';

export enum DemandChannel {
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
}

export enum DemandStatus {
  PENDING = 'PENDING',
  NOTIFIED = 'NOTIFIED',
  CONVERTED = 'CONVERTED',
}

@Entity('demand_requests')
export class DemandRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'variant_id' })
  @Index()
  variantId: string;

  @Column()
  contact: string;

  @Column({
    type: 'enum',
    enum: DemandChannel,
  })
  channel: DemandChannel;

  @Column({
    type: 'enum',
    enum: DemandStatus,
    default: DemandStatus.PENDING,
  })
  status: DemandStatus;

  @Column({ name: 'notified_at', type: 'timestamp', nullable: true })
  notifiedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Variant, (variant) => variant.demandRequests, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'variant_id' })
  variant: Variant;

  @OneToMany(() => RecoveryLink, (recoveryLink) => recoveryLink.demandRequest, {
    cascade: true,
  })
  recoveryLinks: RecoveryLink[];
}

