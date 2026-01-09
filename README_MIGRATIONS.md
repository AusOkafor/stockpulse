# TypeORM Migrations Setup

## Prerequisites

1. **Set up environment variables**: Create a `.env` file in the `backend/` directory:

```env
# Option 1: Using DATABASE_URL
DATABASE_URL=postgresql://user:password@localhost:5432/stockpulse?schema=public

# Option 2: Using individual variables
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=user
DB_PASSWORD=password
DB_NAME=stockpulse
```

2. **Start PostgreSQL**: Make sure PostgreSQL is running (via Docker Compose):

```bash
# From project root
# For newer Docker Desktop (use 'docker compose' without hyphen)
docker compose up -d postgres

# OR for older versions
docker-compose up -d postgres

# OR manually set up PostgreSQL and configure connection in .env
```

## Running Migrations

### Generate a new migration
```bash
cd backend
npm run migration:generate src/migrations/MigrationName
```

### Run migrations
```bash
npm run migration:run
```

### Revert last migration
```bash
npm run migration:revert
```

## Development Mode

In development mode (`NODE_ENV=development`), TypeORM is configured with `synchronize: true`, which automatically creates/updates database tables based on your entities. This is useful for development but should **NOT** be used in production.

For production, always use migrations!

