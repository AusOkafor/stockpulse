import { DataSource, DataSourceOptions } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import * as dotenv from 'dotenv';
// Import entities explicitly for better serverless support
import { Shop } from '../entities/shop.entity';
import { Product } from '../entities/product.entity';
import { Variant } from '../entities/variant.entity';
import { DemandRequest } from '../entities/demand-request.entity';
import { RecoveryLink } from '../entities/recovery-link.entity';
import { OrderAttribution } from '../entities/order-attribution.entity';
import { ShopSettings } from '../entities/shop-settings.entity';
import { ShopPlan } from '../entities/shop-plan.entity';

// All entities array - explicit imports work better in serverless
const entities = [
  Shop,
  Product,
  Variant,
  DemandRequest,
  RecoveryLink,
  OrderAttribution,
  ShopSettings,
  ShopPlan,
];

// Load environment variables for CLI usage
// Try multiple paths to find .env file
const envPaths = [
  join(process.cwd(), '.env'), // Current working directory (backend/)
  join(process.cwd(), '..', '.env'), // Parent directory (project root)
  join(__dirname, '..', '..', '.env'), // Relative to compiled location
  join(__dirname, '..', '.env'), // Relative to source location
];

// Load .env from the first path that exists
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

export const getDataSourceOptions = (configService: ConfigService): DataSourceOptions => {
  // Support multiple environment variable names (Vercel uses POSTGRES_URL, others use DATABASE_URL)
  const databaseUrl = 
    configService.get<string>('DATABASE_URL') ||
    configService.get<string>('POSTGRES_URL') ||  // Vercel Postgres default
    configService.get<string>('POSTGRES_PRISMA_URL') ||  // Vercel Prisma Postgres
    configService.get<string>('DB_URL');
  
  if (databaseUrl) {
    // Parse DATABASE_URL format: postgresql:// or postgres://user:password@host:port/database
    // Normalize postgres:// to postgresql:// for URL parsing
    const normalizedUrl = databaseUrl.replace(/^postgres:\/\//, 'postgresql://');
    const url = new URL(normalizedUrl);
    return {
      type: 'postgres',
      host: url.hostname,
      port: parseInt(url.port, 10) || 5432,
      username: url.username,
      password: url.password,
      database: url.pathname.slice(1), // Remove leading slash
      entities: entities,
      synchronize: false, // Never use synchronize in production
      logging: configService.get<string>('NODE_ENV') === 'development',
      migrations: [join(__dirname, '../migrations', '*.js')],
      migrationsTableName: 'migrations',
      migrationsRun: false, // Run migrations manually
      // Connection pooling for serverless
      extra: {
        max: 1, // Serverless: use single connection per instance
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
      },
    };
  }

  return {
    type: 'postgres',
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 5432),
    username: configService.get<string>('DB_USERNAME', 'user'),
    password: configService.get<string>('DB_PASSWORD', 'password'),
    database: configService.get<string>('DB_NAME', 'stockpulse'),
    entities: entities,
    synchronize: false, // Never use synchronize in production
    logging: configService.get<string>('NODE_ENV') === 'development',
    migrations: [join(__dirname, '../migrations', '*.js')],
    migrationsTableName: 'migrations',
    migrationsRun: false, // Run migrations manually
    // Connection pooling for serverless
    extra: {
      max: 1, // Serverless: use single connection per instance
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    },
  };
};

// Data source for CLI migrations
// Parse DATABASE_URL, POSTGRES_URL (Vercel), or DB_URL if available, otherwise use individual env vars
function getDataSourceForCLI(): DataSourceOptions {
  // Support multiple environment variable names (Vercel uses POSTGRES_URL, others use DATABASE_URL)
  const databaseUrl = 
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||  // Vercel Postgres default
    process.env.POSTGRES_PRISMA_URL ||  // Vercel Prisma Postgres
    process.env.DB_URL;
  
  if (databaseUrl) {
    // Normalize postgres:// to postgresql:// for URL parsing
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
      migrations: [join(__dirname, '../migrations', '*.{.ts,.js}')],
      synchronize: false,
      logging: true,
    };
  }

  // Use individual environment variables
  const config: DataSourceOptions = {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'user',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'stockpulse',
    entities: [join(__dirname, '../entities', '*.entity{.ts,.js}')],
    migrations: [
      join(__dirname, '../migrations', '*.ts'),
      join(__dirname, '../migrations', '*.js'),
    ],
    synchronize: false,
    logging: true,
  };

  return config;
}

// Create DataSource - function is called after dotenv.config() above
const cliConfig = getDataSourceForCLI();
const dataSource = new DataSource(cliConfig);
export default dataSource;

