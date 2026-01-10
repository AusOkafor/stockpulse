# Vercel Database Setup - Next Steps

## ✅ What's Already Done

Based on your screenshot:
- ✅ Database `stockpulse-db` is created
- ✅ Environment variables are automatically set:
  - `POSTGRES_URL` ✅
  - `POSTGRES_PRISMA_URL` ✅
  - `POSTGRES_URL_NON_POOLING` ✅

**Good news:** Vercel automatically created these environment variables, and our code now supports them!

## 📋 Next Steps

### Step 1: Verify Environment Variables are Attached to Your Project

1. Go to **Settings** → **Environment Variables** in your Vercel project
2. You should see `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, and `POSTGRES_URL_NON_POOLING` listed
3. They should be attached to **Production**, **Preview**, and **Development** environments

If you don't see them there:
- They might only be visible in the Storage section
- But they should work automatically when you deploy

### Step 2: Redeploy Your Backend

The environment variables need to be available during deployment:

1. Go to **Deployments** tab
2. Click the **"⋯"** (three dots) on the latest deployment
3. Click **"Redeploy"**
4. Or push a new commit to trigger redeploy

**Important:** Environment variables are injected at build time, so you need to redeploy after they're created.

### Step 3: Test the Connection

After redeploy:

1. **Check Health Endpoint:**
   ```
   https://your-backend.vercel.app/health
   ```
   Should return: `{ "status": "ok", "timestamp": "..." }`

2. **Check Logs:**
   - Go to **Functions** → **Logs** in Vercel Dashboard
   - Look for any database connection errors
   - Should see: `"NestJS application initialized successfully"`

3. **Test Database Connection:**
   If you have a test endpoint, call it to verify database connectivity.

### Step 4: Run Migrations (Create Tables)

Your database is empty right now. You need to run migrations to create tables:

**Option A: Run Migrations Locally (Recommended)**

1. **Copy the connection string:**
   - In Vercel Storage → `stockpulse-db` → Look for connection string
   - Or use: `POSTGRES_URL` value from Environment Variables

2. **Create a temporary `.env` file in `backend/` directory:**
   ```env
   DATABASE_URL=postgres://default:xxx@xxx.aws.neon.tech:5432/verceldb?sslmode=require
   ```
   (Use the actual connection string from Vercel)

3. **Run migrations:**
   ```powershell
   cd backend
   npm run migration:run
   ```

4. **Delete the `.env` file** (or remove the `DATABASE_URL` line) after migrations are done

**Option B: Create a Migration Endpoint (For Production)**

Add a temporary admin endpoint to run migrations remotely:

```typescript
// backend/src/modules/admin/admin.controller.ts
@Controller('admin')
export class AdminController {
  @Post('migrate')
  async runMigrations() {
    // Run migrations programmatically
    const dataSource = getDataSource();
    await dataSource.runMigrations();
    return { success: true };
  }
}
```

⚠️ **Security:** Add authentication/authorization to this endpoint, or remove it after migrations!

**Option C: Use Vercel CLI**

```bash
# Install Vercel CLI
npm i -g vercel

# Link to your project
vercel link

# Set environment variable locally
vercel env pull .env.local

# Run migrations with the connection string
npm run migration:run
```

### Step 5: Verify Tables Are Created

After running migrations, verify:

1. **Check in Vercel Dashboard:**
   - Storage → `stockpulse-db` → Should show tables/data

2. **Or use a PostgreSQL client:**
   - Use the connection string to connect
   - List tables: `\dt` (in psql)

3. **Test with your API:**
   - Try creating a shop/test data
   - Should work if tables exist

## 🔍 Troubleshooting

### Issue: Still Getting 500 Errors After Redeploy

**Check:**
1. **Logs:** Functions → Logs → Look for database errors
2. **Environment Variables:** Settings → Environment Variables → Confirm `POSTGRES_URL` exists
3. **Redeploy:** Make sure you redeployed after database was created

### Issue: "relation does not exist" Error

**Cause:** Migrations haven't been run yet.

**Solution:** Run migrations (Step 4 above)

### Issue: Connection Timeout

**Possible causes:**
- Database is paused (free tier auto-pauses after inactivity)
- Connection string is incorrect
- Network/firewall issue

**Solutions:**
- First API call will wake up the database (may take 5-10 seconds)
- Verify connection string format
- Check Vercel logs for specific error

### Issue: Environment Variables Not Found

If your code can't find `POSTGRES_URL`:

1. **Verify in Vercel Dashboard:**
   - Settings → Environment Variables
   - Should see `POSTGRES_URL` listed

2. **Check Variable Name:**
   - Our code checks: `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `DATABASE_URL`
   - Vercel creates `POSTGRES_URL` by default

3. **Redeploy:**
   - Environment variables are injected at build time
   - Must redeploy after adding/updating

## ✅ Success Checklist

- [ ] Database `stockpulse-db` created in Vercel
- [ ] Environment variables visible in Settings → Environment Variables
- [ ] Project redeployed (after database creation)
- [ ] Health endpoint returns 200 OK
- [ ] Migrations run successfully
- [ ] Tables exist in database
- [ ] API endpoints work (test with a GET request)

## 🎯 Recommended Next Action

**Right now, do this:**

1. ✅ Database is ready (already done!)
2. ⏳ **Redeploy** your Vercel project
3. ⏳ **Run migrations** to create tables
4. ⏳ **Test** the health endpoint

After these steps, your backend should be fully connected to the Vercel Postgres database!

