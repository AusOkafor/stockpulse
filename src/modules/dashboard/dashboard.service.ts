import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Product } from '../../entities/product.entity';
import { DemandRequest, DemandStatus } from '../../entities/demand-request.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(DemandRequest)
    private readonly demandRequestRepository: Repository<DemandRequest>,
  ) {}

  async getDashboardData(shopId: string) {
    // Get products with demand (pending or notified demand requests) for this shop
    // IMPORTANT: Demand is stored variant-level, but dashboard aggregates product-level
    // This allows variant-specific notifications while showing product-level rollup
    // Using QueryBuilder to handle complex nested relations
    const productsWithDemand = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.variants', 'variant')
      .leftJoinAndSelect('variant.demandRequests', 'demandRequest')
      .leftJoinAndSelect('demandRequest.recoveryLinks', 'recoveryLink')
      .leftJoinAndSelect('recoveryLink.orderAttributions', 'orderAttribution')
      .where('product.shopId = :shopId', { shopId })
      .andWhere('demandRequest.status IN (:...statuses)', {
        statuses: [DemandStatus.PENDING, DemandStatus.NOTIFIED],
      })
      .getMany();

    // Calculate metrics
    let totalBuyersWaiting = 0;
    let totalRevenueRecovered = 0;

    // Filter products to only include those with PENDING or NOTIFIED demand requests
    // Roll up all variants' demand to product level
    const filteredProducts = productsWithDemand.filter((product) => {
      return product.variants.some((variant) =>
        variant.demandRequests?.some(
          (dr) => dr.status === DemandStatus.PENDING || dr.status === DemandStatus.NOTIFIED,
        ),
      );
    });

    const products = filteredProducts.map((product) => {
      // Aggregate all demand requests from all variants of this product
      // This is product-level aggregation from variant-level data
      const allDemandRequests = product.variants
        .flatMap((v) => v.demandRequests || [])
        .filter(
          (dr) =>
            dr.status === DemandStatus.PENDING || dr.status === DemandStatus.NOTIFIED,
        );
      const waiting = allDemandRequests.filter(
        (dr) => dr.status === DemandStatus.PENDING,
      ).length;
      const notified = allDemandRequests.filter(
        (dr) => dr.status === DemandStatus.NOTIFIED,
      ).length;

      // Calculate recovered revenue for this product
      const recoveredRevenue = allDemandRequests.reduce((sum, dr) => {
        const revenue = (dr.recoveryLinks || []).reduce((linkSum, link) => {
          return (
            linkSum +
            (link.orderAttributions || []).reduce((orderSum, attr) => {
              return orderSum + Number(attr.revenue);
            }, 0)
          );
        }, 0);
        return sum + revenue;
      }, 0);

      // Estimate revenue opportunity (average order value * waiting customers)
      // This is a placeholder - adjust based on actual product pricing
      const avgOrderValue = recoveredRevenue > 0 ? recoveredRevenue / notified : 120;
      const revenueOpportunity = waiting * avgOrderValue;

      totalBuyersWaiting += waiting + notified;
      totalRevenueRecovered += recoveredRevenue;

      // Determine restock priority based on waiting customers and revenue opportunity
      const restockPriority =
        waiting >= 20 || revenueOpportunity >= 5000 ? ('ASAP' as const) : ('SOON' as const);

      return {
        id: product.id,
        title: product.title,
        imageUrl: product.imageUrl || undefined,
        waiting,
        notified,
        recoveredRevenue,
        revenueOpportunity,
        restockPriority,
      };
    });

    return {
      metrics: {
        productsWithDemand: products.length,
        buyersWaiting: totalBuyersWaiting,
        revenueRecovered: totalRevenueRecovered,
      },
      products: products.sort((a, b) => {
        // Sort by restock priority (ASAP first), then by waiting count
        if (a.restockPriority !== b.restockPriority) {
          return a.restockPriority === 'ASAP' ? -1 : 1;
        }
        return b.waiting - a.waiting;
      }),
    };
  }
}

