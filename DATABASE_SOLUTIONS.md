# Database Solutions for Vercel Deployment

## Problem: localhost Database Won't Work

When you deploy to Vercel:
- `localhost` refers to the Vercel server (not your computer)
- Your local database is not accessible from the internet
- You need a **publicly accessible cloud database**

## Solution Options

### Option 1: Vercel Postgres (Easiest - Recommended)

**Pros:** 
- Integrated with Vercel
- Free tier available
- Easy setup
- Automatic connection string

**Steps:**
1. Go to Vercel Dashboard → Your Project
2. Click **"Storage"** tab
3. Click **"Create Database"**
4. Select **"Postgres"**
5. Choose a name (e.g., `stockpulse-db`)
6. Click **"Create"**
7. Copy the connection string (looks like: `postgres://default:xxx@xxx.postgres.vercel-storage.com:5432/verceldb`)
8. Add as `DATABASE_URL` in Environment Variables

**Free Tier Limits:**
- 256 MB storage
- 60 hours compute/month
- Good for development/testing

---

### Option 2: Supabase (Free Tier Available)

**Pros:**
- Generous free tier (500 MB storage)
- Easy to use
- Great dashboard
- Built-in auth (bonus)

**Steps:**
1. Go to https://supabase.com
2. Sign up (free)
3. Click **"New Project"**
4. Choose organization
5. Fill in:
   - **Name**: `stockpulse` (or any name)
   - **Database Password**: (create a strong password - save it!)
   - **Region**: Choose closest to you
6. Click **"Create new project"**
7. Wait ~2 minutes for setup
8. Go to **Settings** → **Database**
9. Copy **Connection String** (URI mode)
   - Format: `postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres`
   - Replace `[YOUR-PASSWORD]` with the password you created
10. Add to Vercel as `DATABASE_URL`

**Free Tier:**
- 500 MB database
- 2 GB bandwidth
- Unlimited API requests
- Great for production

---

### Option 3: Railway (Easy Setup)

**Pros:**
- Very easy setup
- Free trial with $5 credit
- Simple UI

**Steps:**
1. Go to https://railway.app
2. Sign up with GitHub
3. Click **"New Project"**
4. Click **"Provision PostgreSQL"**
5. Wait for database to provision
6. Click on the PostgreSQL service
7. Go to **"Variables"** tab
8. Copy `DATABASE_URL` connection string
9. Add to Vercel as `DATABASE_URL`

**Pricing:**
- $5 free credit
- Pay-as-you-go after
- ~$5-10/month for small apps

---

### Option 4: Neon (Serverless Postgres)

**Pros:**
- Serverless PostgreSQL
- Auto-scaling
- Free tier available
- Modern architecture

**Steps:**
1. Go to https://neon.tech
2. Sign up (free)
3. Click **"Create Project"**
4. Choose:
   - **Name**: `stockpulse`
   - **Region**: Closest to you
   - **PostgreSQL version**: 15 or 16
5. Click **"Create Project"**
6. Copy **Connection String** from dashboard
7. Add to Vercel as `DATABASE_URL`

**Free Tier:**
- 0.5 GB storage
- Unlimited projects
- Good for development

---

### Option 5: Render (Free Tier)

**Pros:**
- Free PostgreSQL tier
- Easy setup

**Steps:**
1. Go to https://render.com
2. Sign up
3. Click **"New +"** → **"PostgreSQL"**
4. Configure:
   - **Name**: `stockpulse-db`
   - **Database**: `stockpulse`
   - **User**: `stockpulse_user`
   - **Region**: Closest to you
   - **PostgreSQL Version**: Latest
5. Click **"Create Database"**
6. Copy **Internal Database URL** (for Vercel, you may need the public URL)
7. Add to Vercel as `DATABASE_URL`

**Free Tier:**
- 90 days free
- Then $7/month
- Good for testing

---

## Migrating Your Data (If Needed)

If you have data in your local database that you want to keep:

### Step 1: Export from Local Database

```bash
# Export database to SQL file
pg_dump -h localhost -U user -d crypto > backup.sql
```

### Step 2: Import to Cloud Database

Once you have your cloud database:

```bash
# Import to cloud database
psql -h cloud-db-host.com -U user -d database_name < backup.sql
```

Or use a GUI tool like pgAdmin or DBeaver.

---

## Recommended: Supabase (Best Balance)

For your use case, I recommend **Supabase** because:
- ✅ Free tier is generous (500 MB)
- ✅ Easy setup and good dashboard
- ✅ Connection string works immediately
- ✅ No credit card required for free tier
- ✅ Good for production use

---

## Quick Setup: Supabase

1. **Sign up**: https://supabase.com (takes 2 minutes)
2. **Create project**: Click "New Project"
3. **Wait**: ~2 minutes for database to be ready
4. **Get connection string**:
   - Settings → Database → Connection String
   - Select "URI" format
   - Copy the string (looks like: `postgresql://postgres.xxx:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres`)
5. **Add to Vercel**: Copy the connection string as `DATABASE_URL`
6. **Run migrations**: After deployment, run migrations to create tables

---

## After Getting Cloud Database

1. **Add DATABASE_URL to Vercel** (as described in VERCEL_ENV_SETUP.md)
2. **Redeploy** your Vercel project
3. **Run migrations**:
   - Option A: Create a migration endpoint in your backend
   - Option B: Use Vercel CLI to run migrations
   - Option C: Connect directly and run migration SQL

---

## Testing Database Connection

After adding `DATABASE_URL`:

1. Deploy to Vercel
2. Check logs: Vercel Dashboard → Functions → Logs
3. Test health endpoint: `https://your-backend.vercel.app/health`
4. Should work if database is accessible

---

## Security Note

⚠️ **Never commit** `.env` files or database passwords to Git!

The `.gitignore` file already excludes `.env` - keep it that way.

---

## Next Steps

1. Choose a database provider (Supabase recommended)
2. Create a database
3. Copy the connection string
4. Add to Vercel environment variables
5. Redeploy
6. Run migrations

