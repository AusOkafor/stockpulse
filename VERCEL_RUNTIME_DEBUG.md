# Vercel Runtime Debugging Guide

## Current Issue: FUNCTION_INVOCATION_FAILED (500 Error)

The serverless function is crashing during initialization. Here's how to debug:

## 1. Check Vercel Environment Variables

Go to your Vercel project → Settings → Environment Variables

**Required variables:**
- ✅ `POSTGRES_URL` - Direct PostgreSQL connection (NOT Prisma Accelerate)
  - Format: `postgres://user:password@host:port/database?sslmode=require`
  - This should be the **direct connection** from Vercel Postgres dashboard
- ✅ `NODE_ENV=production`
- ✅ `SHOPIFY_API_KEY` (if using OAuth)
- ✅ `SHOPIFY_API_SECRET` (if using OAuth)
- ✅ `FRONTEND_URL` (optional, for CORS)

**DO NOT use:**
- ❌ `POSTGRES_PRISMA_URL` or `PRISMA_DATABASE_URL` - These are Prisma Accelerate proxy URLs and won't work with TypeORM

## 2. Verify Database Connection

To get the direct `POSTGRES_URL`:
1. Go to Vercel Dashboard → Storage → Your Postgres database
2. Click "Connect" or "Connection String"
3. Look for "Direct Connection" or "Connection String" (NOT Prisma Accelerate)
4. Copy the `postgres://...` URL
5. Set it as `POSTGRES_URL` in Environment Variables

## 3. Check Vercel Function Logs

1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on the latest deployment
3. Click "Functions" tab
4. Click on `api/index.ts`
5. Check "Runtime Logs" for detailed error messages

Look for these log prefixes:
- `[INIT]` - App initialization logs
- `[HANDLER]` - Request handling logs
- `✅` - Success indicators
- `❌` or `⚠️` - Error indicators

## 4. Common Issues and Fixes

### Issue: "Cannot connect to database"
**Fix:** Verify `POSTGRES_URL` is set correctly with direct connection string

### Issue: "AppModule not found"
**Fix:** The build might have failed. Check build logs in Vercel

### Issue: "Prisma Accelerate URL detected"
**Fix:** Remove `POSTGRES_PRISMA_URL` from environment variables, use `POSTGRES_URL` instead

### Issue: "Redis connection failed"
**Fix:** This is OK - Redis is optional. The app should continue without it.

## 5. Test Health Endpoint

Once deployed, test the health endpoint:
```
GET https://your-app.vercel.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-XX..."
}
```

## 6. Enable Debug Logging

If you need more detailed logs, temporarily set:
```
NODE_ENV=development
```

This will show more detailed error messages in the logs.

## 7. Manual Database Connection Test

To test if your database URL works, you can create a test script (don't commit this):

```typescript
// test-db-connection.ts (local only, don't commit)
import { DataSource } from 'typeorm';

const testConnection = async () => {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.POSTGRES_URL, // Your Vercel POSTGRES_URL
    entities: [],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connection successful!');
    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

testConnection();
```

Run with: `ts-node test-db-connection.ts` (after setting POSTGRES_URL in your local .env)

