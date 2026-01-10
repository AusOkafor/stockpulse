# Vercel Postgres Connection Strings - Important!

## Problem

You're seeing this in Vercel:
```
prisma+postgres://accelerate.prisma-data.net/?api_key=...
```

**This is a Prisma Accelerate connection string** - it's a PROXY/connection pooler, NOT the direct database connection.

## Understanding Vercel Postgres Connection Strings

Vercel Postgres typically provides **3 types of connection strings**:

1. **`POSTGRES_URL`** - Pooled connection (for application use)
2. **`POSTGRES_URL_NON_POOLING`** - Direct connection (for migrations/imports)
3. **`PRISMA_DATABASE_URL`** - Prisma Accelerate proxy (what you're seeing)

## What We Need

For **data import**, we need the **direct database connection**, not the proxy.

## How to Find the Direct Connection String

### Option 1: Vercel Dashboard

1. Go to **Vercel Dashboard** → Your Project
2. Click **"Storage"** tab
3. Click on your **Postgres database** (`stockpulse-db`)
4. Look for **"Connection String"** section
5. You should see multiple tabs/options:
   - **URI** - Direct connection
   - **Pooled** - With connection pooling
   - **Prisma** - Accelerate proxy (what you're seeing)

6. **Copy the URI or NON-POOLING connection string**

### Option 2: Environment Variables

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Look for:
   - `POSTGRES_URL` - Pooled connection
   - `POSTGRES_URL_NON_POOLING` - Direct connection (THIS ONE for imports)
   - `PRISMA_DATABASE_URL` - Accelerate proxy (what you're seeing)

3. **Copy `POSTGRES_URL_NON_POOLING`** value

## Issue: We May Have Imported to Wrong Database

The connection string I used earlier:
```
postgres://6d6bfbba81b7f633d0288ec99f239be5d556745ac6f812d4a96d2f3098575333:sk_agcWkjp0W9WV61o-yQP--@db.prisma.io:5432/postgres
```

This might be:
- A different database instance
- Not the same one Vercel is using
- An old/stale connection string

## Solution: Verify and Re-Import

### Step 1: Get the Correct Connection String

From Vercel Dashboard → Storage → Your Database → Connection String

**You need the DIRECT connection string**, which should look like:
```
postgres://[user]:[password]@[host]:5432/[database]?sslmode=require
```

NOT the Prisma Accelerate one:
```
prisma+postgres://accelerate.prisma-data.net/...
```

### Step 2: Check Current Data

Let's verify what's in the database we imported to vs what Vercel sees.

### Step 3: Re-Import If Needed

If the databases are different, we'll need to import to the correct one.

## Quick Check: Which Database Does Vercel See?

The Prisma Accelerate proxy should connect to the same underlying database. Let's verify by:

1. Checking what Vercel environment variables actually contain
2. Testing if the Accelerate connection can see our data
3. If not, getting the direct connection string and re-importing

