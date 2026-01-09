import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Shop } from './shop.entity';

@Entity('shop_settings')
export class ShopSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'shop_id', unique: true })
  @Index()
  shopId: string;

  @Column({ name: 'auto_notify_on_restock', default: false })
  autoNotifyOnRestock: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => Shop, (shop) => shop.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shop_id' })
  shop: Shop;
}

