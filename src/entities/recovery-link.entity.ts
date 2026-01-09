import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { DemandRequest } from './demand-request.entity';
import { OrderAttribution } from './order-attribution.entity';

@Entity('recovery_links')
export class RecoveryLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'demand_request_id' })
  @Index()
  demandRequestId: string;

  @Column({ unique: true })
  @Index()
  token: string;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => DemandRequest, (demandRequest) => demandRequest.recoveryLinks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'demand_request_id' })
  demandRequest: DemandRequest;

  @OneToMany(
    () => OrderAttribution,
    (orderAttribution) => orderAttribution.recoveryLink,
    { cascade: true },
  )
  orderAttributions: OrderAttribution[];
}

