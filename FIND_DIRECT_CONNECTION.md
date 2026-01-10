# Finding the Direct PostgreSQL Connection String

## Problem

Vercel is showing you:
```
prisma+postgres://accelerate.prisma-data.net/?api_key=...
```

This is a **Prisma Accelerate proxy URL** and **cannot be used with pg_restore** or TypeORM directly.

## Solution: Find the Direct Connection String

### Method 1: Check Environment Variables in Vercel

1. **Go to:** Vercel Dashboard → Your Project → **Settings** → **Environment Variables**

2. **Look for these variables:**
   - `POSTGRES_URL` - Should be `postgres://...` (direct connection)
   - `POSTGRES_URL_NON_POOLING` - Direct connection without pooling
   - `PRISMA_DATABASE_URL` - This is the Accelerate proxy (what you're seeing)

3. **Copy `POSTGRES_URL`** - This should be the direct connection

### Method 2: Storage Dashboard Connection String

1. **Go to:** Vercel Dashboard → **Storage** → Your Postgres Database

2. **Click on the database name** (e.g., `stockpulse-db`)

3. **Look for "Connection String" section**

4. **Check for tabs or options:**
   - **"URI"** tab - Direct connection
   - **"Pooled"** tab - With connection pooling
   - **"Non-Pooling"** tab - Direct connection (best for imports)
   - **"Prisma"** tab - Accelerate proxy (what you're seeing)

5. **Copy from "URI" or "Non-Pooling" tab**

### Method 3: Extract from Accelerate URL (If Possible)

The Prisma Accelerate URL contains information, but we can't directly convert it. However, the underlying database should be accessible.

## What the Direct Connection Should Look Like

**Correct format:**
```
postgres://[user]:[password]@[host]:5432/[database]?sslmode=require
```

**Example:**
```
postgres://6d6bfbba81b7f633d0288ec99f239be5d556745ac6f812d4a96d2f3098575333:sk_xxx@db.prisma.io:5432/postgres?sslmode=require
```

**Wrong format (cannot use):**
```
prisma+postgres://accelerate.prisma-data.net/?api_key=...  ❌
```

## Alternative: Use SQL Format Instead

If we can't find the direct connection, we can:

1. **Export as SQL format** (works with any connection)
2. **Import via SQL** (if Vercel supports it)

Let me know what you find in the Environment Variables or Storage dashboard!

