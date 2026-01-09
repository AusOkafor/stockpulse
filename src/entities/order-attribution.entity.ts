import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Shop } from './shop.entity';
import { RecoveryLink } from './recovery-link.entity';

@Entity('order_attributions')
export class OrderAttribution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', unique: true })
  orderId: string;

  @Column({ name: 'shop_id' })
  @Index()
  shopId: string;

  @Column({ name: 'recovery_link_id', nullable: true })
  @Index()
  recoveryLinkId: string | null;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
  })
  revenue: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Shop, (shop) => shop.orderAttributions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shop_id' })
  shop: Shop;

  @ManyToOne(() => RecoveryLink, (recoveryLink) => recoveryLink.orderAttributions, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'recovery_link_id' })
  recoveryLink: RecoveryLink | null;
}

