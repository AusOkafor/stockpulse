import { DataSource, DataSourceOptions } from 'typeorm';
import { join } from 'path';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';
import { Shop } from '../entities/shop.entity';
import { Product } from '../entities/product.entity';
import { Variant } from '../entities/variant.entity';
import { DemandRequest, DemandChannel, DemandStatus } from '../entities/demand-request.entity';
import { RecoveryLink } from '../entities/recovery-link.entity';
import { OrderAttribution } from '../entities/order-attribution.entity';

// Load environment variables
const envPaths = [
  join(process.cwd(), '.env'),
  join(process.cwd(), '..', '.env'),
  join(__dirname, '..', '..', '.env'),
];

for (const envPath of envPaths) {
  try {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      break;
    }
  } catch (e) {
    // Continue to next path
  }
}

function getDataSourceOptions(): DataSourceOptions {
  const databaseUrl = process.env.DATABASE_URL || process.env.DB_URL;
  
  if (databaseUrl) {
    const normalizedUrl = databaseUrl.replace(/^postgres:\/\//, 'postgresql://');
    const url = new URL(normalizedUrl);
    return {
      type: 'postgres',
      host: url.hostname,
      port: parseInt(url.port, 10) || 5432,
      username: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      entities: [join(__dirname, '../entities', '*.entity{.ts,.js}')],
      synchronize: false,
      logging: false,
    };
  }

  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'user',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'stockpulse',
    entities: [join(__dirname, '../entities', '*.entity{.ts,.js}')],
    synchronize: false,
    logging: false,
  };
}

// Realistic product data
const PRODUCTS = [
  {
    title: 'Premium Wireless Headphones',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
    variants: [
      { shopifyVariantId: 'v1', inventoryQuantity: 0 }, // Out of stock
      { shopifyVariantId: 'v2', inventoryQuantity: 0 }, // Out of stock
      { shopifyVariantId: 'v3', inventoryQuantity: 0 }, // Out of stock
    ],
  },
  {
    title: 'Classic Leather Jacket',
    imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400',
    variants: [
      { shopifyVariantId: 'v4', inventoryQuantity: 0 },
      { shopifyVariantId: 'v5', inventoryQuantity: 0 },
    ],
  },
  {
    title: 'Smart Fitness Watch',
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
    variants: [
      { shopifyVariantId: 'v6', inventoryQuantity: 0 },
      { shopifyVariantId: 'v7', inventoryQuantity: 0 },
      { shopifyVariantId: 'v8', inventoryQuantity: 0 },
    ],
  },
  {
    title: 'Minimalist Backpack',
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
    variants: [
      { shopifyVariantId: 'v9', inventoryQuantity: 0 },
      { shopifyVariantId: 'v10', inventoryQuantity: 0 },
    ],
  },
  {
    title: 'Organic Coffee Beans',
    imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400',
    variants: [
      { shopifyVariantId: 'v11', inventoryQuantity: 0 },
      { shopifyVariantId: 'v12', inventoryQuantity: 0 },
      { shopifyVariantId: 'v13', inventoryQuantity: 0 },
    ],
  },
];

// Sample email addresses
const EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn',
  'Sam', 'Jamie', 'Cameron', 'Dakota', 'Skyler', 'Blake', 'Sage', 'River',
];
const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor',
];

function generateEmail(): string {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const domain = EMAIL_DOMAINS[Math.floor(Math.random() * EMAIL_DOMAINS.length)];
  const number = Math.floor(Math.random() * 1000);
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${number}@${domain}`;
}

function generatePhoneNumber(): string {
  const areaCode = Math.floor(Math.random() * 900) + 100;
  const exchange = Math.floor(Math.random() * 900) + 100;
  const number = Math.floor(Math.random() * 10000);
  return `+1${areaCode}${exchange}${number.toString().padStart(4, '0')}`;
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

async function seed() {
  console.log('🌱 Starting database seed...');

  // Create DataSource
  const dataSourceOptions = getDataSourceOptions();
  const dataSource = new DataSource(dataSourceOptions);
  
  try {
    await dataSource.initialize();
    console.log('✅ Database connected');

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🧹 Clearing existing data...');
    // Delete in reverse dependency order to avoid foreign key constraint errors
    // OrderAttribution -> RecoveryLink -> DemandRequest -> Variant -> Product -> Shop
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      // Use DELETE instead of TRUNCATE to handle foreign keys properly
      await queryRunner.query('DELETE FROM order_attributions');
      await queryRunner.query('DELETE FROM recovery_links');
      await queryRunner.query('DELETE FROM demand_requests');
      await queryRunner.query('DELETE FROM variants');
      await queryRunner.query('DELETE FROM products');
      await queryRunner.query('DELETE FROM shops');
      
      await queryRunner.commitTransaction();
      console.log('✅ Existing data cleared');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    // 1. Create Shop
    console.log('🏪 Creating shop...');
    const seedShopDomain = process.env.SEED_SHOP_DOMAIN || 'ausdevtheme.myshopify.com';
    const shop = dataSource.getRepository(Shop).create({
      shopifyDomain: seedShopDomain,
      accessToken: 'encrypted_token_placeholder_' + crypto.randomBytes(16).toString('hex'),
    });
    const savedShop = await dataSource.getRepository(Shop).save(shop);
    console.log(`✅ Created shop: ${savedShop.shopifyDomain}`);

    // 2. Create Products and Variants
    console.log('📦 Creating products and variants...');
    const allVariants: Variant[] = [];
    
    for (let i = 0; i < PRODUCTS.length; i++) {
      const productData = PRODUCTS[i];
      const product = dataSource.getRepository(Product).create({
        shopId: savedShop.id,
        shopifyProductId: `prod_${i + 1}`,
        title: productData.title,
        imageUrl: productData.imageUrl,
      });
      const savedProduct = await dataSource.getRepository(Product).save(product);
      
      // Create variants for this product
      for (const variantData of productData.variants) {
        const variant = dataSource.getRepository(Variant).create({
          productId: savedProduct.id,
          shopifyVariantId: variantData.shopifyVariantId,
          inventoryQuantity: variantData.inventoryQuantity,
        });
        const savedVariant = await dataSource.getRepository(Variant).save(variant);
        allVariants.push(savedVariant);
      }
      console.log(`✅ Created product: ${savedProduct.title} with ${productData.variants.length} variants`);
    }

    // 3. Create Demand Requests (30-100 requests)
    console.log('📧 Creating demand requests...');
    const totalDemandRequests = Math.floor(Math.random() * 71) + 30; // 30-100
    const demandRequests: DemandRequest[] = [];
    
    // Status distribution: 40% PENDING, 40% NOTIFIED, 20% CONVERTED
    const statusWeights = [
      { status: DemandStatus.PENDING, weight: 0.4 },
      { status: DemandStatus.NOTIFIED, weight: 0.4 },
      { status: DemandStatus.CONVERTED, weight: 0.2 },
    ];

    for (let i = 0; i < totalDemandRequests; i++) {
      const variant = allVariants[Math.floor(Math.random() * allVariants.length)];
      const channel = Math.random() > 0.7 ? DemandChannel.WHATSAPP : DemandChannel.EMAIL;
      const contact = channel === DemandChannel.EMAIL ? generateEmail() : generatePhoneNumber();
      
      // Weighted random status
      const rand = Math.random();
      let cumulative = 0;
      let selectedStatus = DemandStatus.PENDING;
      for (const { status, weight } of statusWeights) {
        cumulative += weight;
        if (rand <= cumulative) {
          selectedStatus = status;
          break;
        }
      }

      const demandRequest = dataSource.getRepository(DemandRequest).create({
        variantId: variant.id,
        contact,
        channel,
        status: selectedStatus,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date in last 30 days
      });
      const savedRequest = await dataSource.getRepository(DemandRequest).save(demandRequest);
      demandRequests.push(savedRequest);
    }
    console.log(`✅ Created ${totalDemandRequests} demand requests`);

    // 4. Create Recovery Links (for NOTIFIED and CONVERTED requests)
    console.log('🔗 Creating recovery links...');
    const notifiedAndConverted = demandRequests.filter(
      (dr) => dr.status === DemandStatus.NOTIFIED || dr.status === DemandStatus.CONVERTED
    );
    const recoveryLinks: RecoveryLink[] = [];

    for (const demandRequest of notifiedAndConverted) {
      const recoveryLink = dataSource.getRepository(RecoveryLink).create({
        demandRequestId: demandRequest.id,
        token: generateToken(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      });
      const savedLink = await dataSource.getRepository(RecoveryLink).save(recoveryLink);
      recoveryLinks.push(savedLink);
    }
    console.log(`✅ Created ${recoveryLinks.length} recovery links`);

    // 5. Create Order Attributions (recovered revenue)
    console.log('💰 Creating order attributions (recovered revenue)...');
    // 30-50% of CONVERTED requests should have orders
    const convertedRequests = demandRequests.filter((dr) => dr.status === DemandStatus.CONVERTED);
    const ordersToCreate = Math.floor(convertedRequests.length * (0.3 + Math.random() * 0.2));
    const selectedConverted = convertedRequests
      .sort(() => Math.random() - 0.5)
      .slice(0, ordersToCreate);

    let totalRevenue = 0;
    for (const demandRequest of selectedConverted) {
      const recoveryLink = recoveryLinks.find((rl) => rl.demandRequestId === demandRequest.id);
      const revenue = Math.floor(Math.random() * 50000 + 2000) / 100; // $20-$520
      totalRevenue += revenue;

      const orderAttribution = dataSource.getRepository(OrderAttribution).create({
        shopId: savedShop.id,
        recoveryLinkId: recoveryLink?.id || null,
        orderId: `order_${crypto.randomBytes(8).toString('hex')}`,
        revenue,
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Last 7 days
      });
      await dataSource.getRepository(OrderAttribution).save(orderAttribution);
    }
    console.log(`✅ Created ${selectedConverted.length} orders with $${totalRevenue.toFixed(2)} total revenue`);

    // Summary
    console.log('\n📊 Seed Summary:');
    console.log(`   Shop: 1`);
    console.log(`   Products: ${PRODUCTS.length}`);
    console.log(`   Variants: ${allVariants.length}`);
    console.log(`   Demand Requests: ${totalDemandRequests}`);
    console.log(`     - PENDING: ${demandRequests.filter((dr) => dr.status === DemandStatus.PENDING).length}`);
    console.log(`     - NOTIFIED: ${demandRequests.filter((dr) => dr.status === DemandStatus.NOTIFIED).length}`);
    console.log(`     - CONVERTED: ${demandRequests.filter((dr) => dr.status === DemandStatus.CONVERTED).length}`);
    console.log(`   Recovery Links: ${recoveryLinks.length}`);
    console.log(`   Orders: ${selectedConverted.length}`);
    console.log(`   Total Revenue: $${totalRevenue.toFixed(2)}`);
    console.log('\n✅ Seed completed successfully!');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

// Run seed
seed()
  .then(() => {
    console.log('🎉 Seed script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seed script failed:', error);
    process.exit(1);
  });

