# Vercel Deployment Debugging

## Current Error
```
500: INTERNAL_SERVER_ERROR
Code: FUNCTION_INVOCATION_FAILED
```

## Most Common Causes

### 1. **Missing DATABASE_URL** (Most Likely)
The app crashes during initialization if database connection fails.

**Solution:**
- Go to Vercel Dashboard → Your Project → Settings → Environment Variables
- Add `DATABASE_URL` with your production PostgreSQL connection string
- Format: `postgresql://user:password@host:port/database`

### 2. **Database Connection Timeout**
Serverless functions have connection limits.

**Solution:**
- Check your database allows connections from Vercel IPs
- Ensure connection string is correct
- Use a database service that's accessible from the internet (not localhost)

### 3. **Entity Path Resolution After Build**
Entities might not be found after compilation.

**Fixed:** Entities are now imported explicitly (not using file patterns).

### 4. **Missing Build Step**
Vercel might not be building before deploying the handler.

**Check:**
- In Vercel Dashboard → Project Settings → Build & Development Settings
- Ensure "Build Command" is set to: `npm run build`
- Ensure "Output Directory" is empty (not needed for serverless)

### 5. **Module Import Issues**
The handler might not find compiled modules.

**Fixed:** Handler now tries both `dist/` and `src/` paths.

## How to Debug

### Step 1: Check Vercel Function Logs

1. Go to Vercel Dashboard → Your Project
2. Click "Functions" tab
3. Click on the function error
4. View "Logs" to see the actual error message

The logs will show:
- Which module failed to load
- Database connection errors
- Missing environment variables

### Step 2: Test Locally First

```bash
# Build the project
cd backend
npm run build

# Check if dist/app.module.js exists
ls dist/app.module.js

# Test if the handler works
# (You can create a simple test script)
```

### Step 3: Check Environment Variables

**Required Variables:**
- ✅ `DATABASE_URL` - **CRITICAL: Must be set**
- ✅ `SHOPIFY_API_KEY`
- ✅ `SHOPIFY_API_SECRET`
- ✅ `APP_URL` - Your Vercel backend URL
- ✅ `FRONTEND_URL` - Your frontend URL (or `*` for testing)
- ✅ `NODE_ENV=production`

### Step 4: Test Database Connection

Use a simple test endpoint first:

```typescript
// Add to your controller temporarily
@Get('test-db')
async testDb() {
  try {
    // Test database connection
    return { status: 'ok', db: 'connected' };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}
```

## Quick Fixes

### Fix 1: Add Health Check Without Database

If database is not ready, add a simple health endpoint that doesn't require DB:

```typescript
// In app.controller.ts
@Get('health')
getHealth() {
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: process.env.DATABASE_URL ? 'configured' : 'missing'
  };
}
```

### Fix 2: Make Database Connection Optional During Init

For now, we can make the app start even if database connection fails initially (connections will be lazy).

But TypeORM requires a connection during module initialization, so this won't work easily.

### Fix 3: Ensure Database is Accessible

- Use **Vercel Postgres** (easiest) - automatically configured
- Or use **Supabase**, **Railway**, or **Neon** with public access
- **DO NOT** use localhost databases

## Next Steps

1. **Check Vercel Function Logs** - This will show the exact error
2. **Verify DATABASE_URL** is set in Vercel environment variables
3. **Ensure database is accessible** from the internet
4. **Run migrations** after database is connected

## Expected Error Messages

### If DATABASE_URL is missing:
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

### If DATABASE_URL is invalid:
```
Error: password authentication failed
```

### If entities not found:
```
Error: Cannot find module '../dist/app.module'
```

### If build failed:
```
Error: Cannot find module 'AppModule'
```

---

## After Fixing

Once the function works:
1. Test health endpoint: `https://your-backend.vercel.app/health`
2. Run database migrations
3. Test OAuth: `https://your-backend.vercel.app/auth/install?shop=your-store.myshopify.com`

