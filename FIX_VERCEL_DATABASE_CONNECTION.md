# Fix: Vercel Database Connection Issue

## Problem

- You're seeing `PRISMA_DATABASE_URL` (Prisma Accelerate proxy) in Vercel
- TypeORM cannot use Prisma Accelerate URLs directly
- Data may have been imported to a different database instance

## Solution

### Step 1: Get Direct Connection String from Vercel

**Option A: Via Vercel Dashboard**

1. Go to **Vercel Dashboard** → Your Project
2. Click **"Storage"** tab
3. Click on your **Postgres database** (`stockpulse-db`)
4. Find **"Connection String"** section
5. Look for tabs: **"URI"**, **"Pooled"**, **"Non-Pooling"**
6. **Copy the "URI" or "Non-Pooling" connection string**
   - Should look like: `postgres://user:password@host:port/database?sslmode=require`
   - NOT: `prisma+postgres://...`

**Option B: Via Environment Variables**

1. Go to **Settings** → **Environment Variables**
2. Look for:
   - `POSTGRES_URL` - Should be the pooled connection (can use this)
   - `POSTGRES_URL_NON_POOLING` - Direct connection (best for imports)
3. **Copy `POSTGRES_URL`** (this should work for TypeORM)

### Step 2: Verify Connection String Format

The connection string should be:
```
postgres://[user]:[password]@[host]:[port]/[database]?sslmode=require
```

NOT:
```
prisma+postgres://accelerate.prisma-data.net/...  ❌
```

### Step 3: Check What Vercel Actually Has

**In Vercel Dashboard → Settings → Environment Variables:**

Check if these exist:
- `POSTGRES_URL` - ✅ Use this (if it exists)
- `POSTGRES_URL_NON_POOLING` - ✅ Use this for imports
- `PRISMA_DATABASE_URL` - ❌ Cannot use with TypeORM

### Step 4: Update Backend Code (If Needed)

If Vercel only provides `POSTGRES_URL`, our code already supports it (line 52 in `data-source.ts`).

But **TypeORM cannot parse Prisma Accelerate URLs**. We need a direct PostgreSQL URL.

### Step 5: Re-Import Data (If Needed)

If we imported to the wrong database, we'll need to:
1. Get the correct `POSTGRES_URL` from Vercel
2. Re-import data to that database
3. Verify data is visible

## Quick Action Items

**Please provide:**

1. **Go to Vercel Dashboard → Settings → Environment Variables**
2. **Check what variables exist:**
   - Do you see `POSTGRES_URL`? (copy the value)
   - Do you see `POSTGRES_URL_NON_POOLING`? (copy the value)
   - What does `POSTGRES_URL` look like? (should start with `postgres://`)

3. **OR go to Storage → Your Database → Connection String**
   - Copy the "URI" tab connection string (not Prisma)

Once we have the correct connection string, I'll:
- Verify if data is already there
- Re-import if needed
- Test the connection

