# Quick Fix for Vercel 500 Error

## Most Likely Issue: Missing DATABASE_URL

The function crashes because TypeORM tries to connect to the database during app initialization, but `DATABASE_URL` is not set.

## Immediate Steps:

### 1. Check Vercel Logs (Most Important)
1. Go to Vercel Dashboard → Your Project
2. Click "Functions" tab  
3. Click on the failed function
4. View "Logs" tab - this will show the EXACT error

### 2. Add DATABASE_URL Environment Variable
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `DATABASE_URL` with a valid PostgreSQL connection string
3. Format: `postgresql://user:password@host:port/database`

**Quick Database Options:**
- **Vercel Postgres**: Go to Storage tab → Create Postgres Database → Copy connection string
- **Supabase**: Free tier at supabase.com → Get connection string
- **Railway**: Easy setup at railway.app

### 3. Redeploy
After adding `DATABASE_URL`, redeploy:
- Vercel should auto-redeploy when you save env vars
- Or click "Redeploy" button

### 4. Expected Environment Variables

**REQUIRED:**
```
DATABASE_URL=postgresql://user:password@host:port/database
NODE_ENV=production
APP_URL=https://your-backend.vercel.app (update after deploy)
FRONTEND_URL=* (or your frontend URL)
```

**OPTIONAL (but recommended):**
```
SHOPIFY_API_KEY=your_key
SHOPIFY_API_SECRET=your_secret
REDIS_URL=your_redis_url (if using background jobs)
```

## If Still Failing After Adding DATABASE_URL

### Check the logs for:

1. **Database Connection Error**
   - `ECONNREFUSED` → Database not accessible
   - `password authentication failed` → Wrong credentials
   - `database does not exist` → Database name wrong

2. **Module Import Error**
   - `Cannot find module '../dist/app.module'` → Build didn't run
   - Solution: Ensure "Build Command" is `npm run build` in Vercel settings

3. **Entity Import Error**
   - `Cannot find module '../entities/...'` → Build path issue
   - **Fixed:** Now using explicit entity imports

## Testing After Fix

1. **Health Check**: `https://your-backend.vercel.app/health`
   - Should return: `{ status: 'ok', timestamp: '...' }`

2. **Root Endpoint**: `https://your-backend.vercel.app/`
   - Should return: `StockPulse API`

## If Health Check Works But Other Endpoints Fail

This means:
- ✅ NestJS initialized successfully
- ✅ Database connection works
- ❌ Issue is in specific endpoint logic

Then check:
- Missing environment variables for specific features
- Authentication/authorization issues
- Missing migrations (tables don't exist)

