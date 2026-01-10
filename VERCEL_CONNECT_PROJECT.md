# Connecting Vercel Postgres to Your Project

## Understanding the "Connect Project" Dialog

When you see this dialog, it's asking how you want to attach the database to your Vercel project.

### What Each Option Means

#### 1. **Project Selection**
- **`stockpulse`** - This is your Vercel project name
- **Select it** - This tells Vercel which project should have access to this database

#### 2. **Environments**
- **Development** ☑️ - Database available during local development (`vercel dev`)
- **Preview** ☑️ - Database available for preview deployments (branch/PR deployments)
- **Production** ☑️ - Database available for production deployments

**Recommendation:** Check all three ☑️☑️☑️ so the database works everywhere.

#### 3. **Custom Prefix (Optional)**
- **Leave empty** - Vercel will create these environment variables:
  - `POSTGRES_URL`
  - `POSTGRES_PRISMA_URL`
  - `POSTGRES_URL_NON_POOLING`

- **If you enter a prefix** (e.g., `DB`):
  - Variables become: `DB_POSTGRES_URL`, `DB_POSTGRES_PRISMA_URL`, etc.
  - Only use this if you have multiple databases and need to distinguish them

**Recommendation:** Leave it empty (default) - our code supports `POSTGRES_URL` by default.

#### 4. **URL Input Field**
- This is **NOT** for entering a database connection string
- This is **ONLY** for the custom prefix name
- If you're not using a custom prefix, **ignore this field**

## ✅ Recommended Settings

For your setup, use these settings:

```
Project: stockpulse ✅
Environments: 
  ☑️ Development
  ☑️ Preview  
  ☑️ Production
Custom Prefix: (leave empty)
```

## What Happens After You Click "Connect"

1. **Environment Variables Created:**
   - `POSTGRES_URL` → Added to your project's environment variables
   - `POSTGRES_PRISMA_URL` → Added for Prisma compatibility
   - `POSTGRES_URL_NON_POOLING` → Added for direct connections

2. **Variables are Attached:**
   - Available in Production deployments
   - Available in Preview deployments
   - Available in Development (if you checked Development)

3. **Your Code Will Work:**
   - Our `data-source.ts` checks `POSTGRES_URL` automatically
   - No code changes needed!

## ⚠️ Important: After Connecting

**You MUST redeploy** for the environment variables to be available:

1. Go to **Deployments** tab
2. Click **"Redeploy"** on the latest deployment
3. Or push a new commit

Environment variables are injected at **build time**, so existing deployments won't have them until you redeploy.

## Next Steps After Connecting

1. ✅ Click "Connect" with recommended settings
2. ✅ Redeploy your project
3. ✅ Run migrations (create tables in database)
4. ✅ Test connection (hit `/health` endpoint)

## Troubleshooting

### "Environment variables not found" after connecting
- **Solution:** Redeploy your project (environment variables are injected at build time)

### Database works locally but not on Vercel
- **Check:** Did you check "Production" in the environments?
- **Check:** Did you redeploy after connecting?
- **Check:** Settings → Environment Variables → Should see `POSTGRES_URL` listed

### Want to use a different variable name?
- **Option 1:** Use custom prefix (e.g., `DB`) → creates `DB_POSTGRES_URL`
- **Option 2:** Manually add `DATABASE_URL` in Settings → Environment Variables with the same value as `POSTGRES_URL`

Our code supports both `DATABASE_URL` and `POSTGRES_URL`, so either works!

