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
import { Product } from './product.entity';
import { DemandRequest } from './demand-request.entity';

@Entity('variants')
export class Variant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id' })
  @Index()
  productId: string;

  @Column({ name: 'shopify_variant_id', unique: true })
  shopifyVariantId: string;

  @Column({ name: 'inventory_quantity', default: 0 })
  inventoryQuantity: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Product, (product) => product.variants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @OneToMany(() => DemandRequest, (demandRequest) => demandRequest.variant, {
    cascade: true,
  })
  demandRequests: DemandRequest[];
}

