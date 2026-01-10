# Setting Up Vercel Postgres (Prisma Postgres / Instant Serverless Postgres)

## What You're Seeing

In Vercel Storage, you see:
- **Prisma Postgres** - This is Vercel's managed PostgreSQL database
- **Instant Serverless Postgres** - Same thing, just branded differently

Both are Vercel's serverless PostgreSQL offering - use either one.

## Step-by-Step Setup

### Step 1: Create the Database

1. **Go to Vercel Dashboard** → Your Project (`stockpulse-backend`)
2. **Click "Storage" tab** (in the top navigation)
3. **Click "Create Database"** button
4. **Select "Postgres"** (or "Instant Serverless Postgres")
5. **Fill in the form:**
   - **Name**: `stockpulse-db` (or any name you like)
   - **Region**: Choose closest to you (e.g., `us-east-1`, `eu-west-1`)
6. **Click "Create"** or "Create Database"
7. **Wait** - Takes about 30-60 seconds to provision

### Step 2: Get the Connection String

After the database is created:

1. **Click on your database** (the name you created)
2. **Look for "Connection String"** or **".env.local"** section
3. **Copy the connection string** - It will look like:
   ```
   postgres://default:xxx@xxx.aws.neon.tech:5432/verceldb?sslmode=require
   ```
   OR
   ```
   postgresql://default:xxx@xxx.aws.neon.tech:5432/verceldb?sslmode=require
   ```

### Step 3: Add to Environment Variables

**Option A: Automatic (if Vercel auto-adds it)**
- Sometimes Vercel automatically adds `POSTGRES_URL` or `DATABASE_URL` to your environment variables
- Check: Settings → Environment Variables

**Option B: Manual**
1. Go to **Settings** → **Environment Variables**
2. Click **"Add New"**
3. **Key**: `DATABASE_URL`
4. **Value**: Paste the connection string you copied
5. **Environments**: Check ☑️ Production, ☑️ Preview
6. Click **"Save"**

### Step 4: Verify It's Added

1. Go to **Settings** → **Environment Variables**
2. You should see `DATABASE_URL` (or `POSTGRES_URL`) listed
3. The value will be hidden (shows as `••••••••`)

### Step 5: Redeploy

1. Go to **Deployments** tab
2. Click **"Redeploy"** on the latest deployment
3. Or wait for auto-redeploy (if you just added env vars)

### Step 6: Test

After redeploy:
1. Visit: `https://your-backend.vercel.app/health`
2. Should return: `{ status: 'ok', timestamp: '...' }`
3. Check **Functions** → **Logs** for any errors

## Important Notes

### Connection String Format

Vercel Postgres connection strings usually look like:
```
postgres://default:password@host.aws.neon.tech:5432/verceldb?sslmode=require
```

**Important**: 
- It might be `postgres://` (not `postgresql://`)
- Our code handles both, but if issues occur, ensure it's parsed correctly
- The `?sslmode=require` at the end is important for SSL connection

### Environment Variable Names

Vercel might auto-create:
- `POSTGRES_URL` (Vercel's preferred name)
- `POSTGRES_PRISMA_URL` (for Prisma)
- `POSTGRES_URL_NON_POOLING` (direct connection)

**Your code expects**: `DATABASE_URL` or `DB_URL`

**If Vercel creates `POSTGRES_URL` instead:**
- Option 1: Add `DATABASE_URL` manually with the same value
- Option 2: Update code to also check `POSTGRES_URL` (I can help with this)

### Free Tier Limits

- **256 MB storage** - Good for development/testing
- **60 hours compute/month**
- **Auto-pauses** after inactivity (wakes up on first request)

## Troubleshooting

### Issue: Connection String Not Showing

1. Make sure database is fully created (wait a bit longer)
2. Click on the database name to see details
3. Look for "Connection" or "Connection String" section
4. May need to click "Show" or "Reveal" to see the password

### Issue: Still Getting 500 Error

1. **Check Logs**: Vercel Dashboard → Functions → Logs
2. **Verify**: `DATABASE_URL` is set (Settings → Environment Variables)
3. **Check**: Connection string format (should start with `postgres://` or `postgresql://`)
4. **Try**: Add both `DATABASE_URL` and `POSTGRES_URL` with same value

### Issue: Variable Name Mismatch

If Vercel creates `POSTGRES_URL` but code expects `DATABASE_URL`:

**Quick Fix**: Update data-source.ts to also check `POSTGRES_URL`

```typescript
const databaseUrl = configService.get<string>('DATABASE_URL') 
  || configService.get<string>('POSTGRES_URL')  // Add this
  || configService.get<string>('DB_URL');
```

I can update the code if needed.

## After Database is Set Up

1. ✅ Database created in Vercel
2. ✅ Connection string added as `DATABASE_URL` (or `POSTGRES_URL`)
3. ✅ Environment variable is set
4. ✅ Project redeployed
5. ⏳ **Run migrations** to create tables

### Run Migrations

After deployment works, run migrations:

```bash
# Update your local .env temporarily with cloud DATABASE_URL
# Or use inline:
$env:DATABASE_URL="your-vercel-postgres-connection-string"
npm run migration:run
```

Or create a migration endpoint in your backend to run them remotely.

## Next Steps

1. Create the Postgres database in Vercel Storage
2. Copy the connection string
3. Add as `DATABASE_URL` in Environment Variables
4. Redeploy
5. Test: `https://your-backend.vercel.app/health`
6. Run migrations

