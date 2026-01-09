import { DataSource, DataSourceOptions } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import * as dotenv from 'dotenv';

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
  // Support both DATABASE_URL and DB_URL
  const databaseUrl = configService.get<string>('DATABASE_URL') || configService.get<string>('DB_URL');
  
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
      entities: [join(__dirname, '../entities', '*.entity{.ts,.js}')],
      synchronize: configService.get<string>('NODE_ENV') === 'development',
      logging: configService.get<string>('NODE_ENV') === 'development',
      migrations: ['dist/migrations/*.js'],
      migrationsTableName: 'migrations',
    };
  }

  return {
    type: 'postgres',
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 5432),
    username: configService.get<string>('DB_USERNAME', 'user'),
    password: configService.get<string>('DB_PASSWORD', 'password'),
    database: configService.get<string>('DB_NAME', 'stockpulse'),
    entities: [join(__dirname, '../entities', '*.entity{.ts,.js}')],
    synchronize: configService.get<string>('NODE_ENV') === 'development',
    logging: configService.get<string>('NODE_ENV') === 'development',
    migrations: ['dist/migrations/*.js'],
    migrationsTableName: 'migrations',
  };
};

// Data source for CLI migrations
// Parse DATABASE_URL or DB_URL if available, otherwise use individual env vars
function getDataSourceForCLI(): DataSourceOptions {
  // Support both DATABASE_URL and DB_URL
  const databaseUrl = process.env.DATABASE_URL || process.env.DB_URL;
  
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

