import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Product } from './product.entity';
import { OrderAttribution } from './order-attribution.entity';

@Entity('shops')
export class Shop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'shopifyDomain', unique: true })
  shopifyDomain: string;

  @Column({ name: 'access_token' })
  accessToken: string; // Encrypted in application layer

  @Column({ name: 'is_active', default: true, nullable: true })
  isActive: boolean;

  @Column({ name: 'installed_at', type: 'timestamp', nullable: true })
  installedAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Product, (product) => product.shop, { cascade: true })
  products: Product[];

  @OneToMany(() => OrderAttribution, (orderAttribution) => orderAttribution.shop, {
    cascade: true,
  })
  orderAttributions: OrderAttribution[];
}

