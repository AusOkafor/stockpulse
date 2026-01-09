import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { PlanTier } from './plan-tier.enum';

/**
 * ShopPlan Entity
 * Tracks plan tier and usage limits for each shop
 * 
 * No payments - just feature enforcement
 */
@Entity('shop_plans')
@Index(['shopId'], { unique: true })
export class ShopPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'shop_id', type: 'varchar', unique: true })
  shopId: string;

  @Column({
    name: 'plan',
    type: 'varchar',
    length: 10,
    default: PlanTier.FREE,
  })
  plan: PlanTier;

  @Column({ name: 'monthly_notify_limit', type: 'int', default: 50 })
  monthlyNotifyLimit: number;

  @Column({ name: 'notifications_used_this_month', type: 'int', default: 0 })
  notificationsUsedThisMonth: number;

  @Column({ name: 'usage_reset_at', type: 'timestamp', nullable: true })
  usageResetAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

