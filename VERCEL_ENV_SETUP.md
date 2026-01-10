# How to Add Environment Variables in Vercel

## Step-by-Step Guide

### 1. Access Environment Variables in Vercel

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select Your Project**: Click on `stockpulse-backend` (or your project name)
3. **Go to Settings**: Click "Settings" tab in the top navigation
4. **Click "Environment Variables"**: In the left sidebar, click "Environment Variables"
5. **Add Variables**: Click "Add New" button

### 2. How to Add Each Variable

For each variable, you'll need to:
- **Key**: Enter the variable name (e.g., `DATABASE_URL`)
- **Value**: Enter the variable value (e.g., `postgresql://user:pass@host:5432/dbname`)
- **Environment**: Select which environments to apply to:
  - ☑️ **Production** (for your live deployment)
  - ☑️ **Preview** (for preview deployments from branches)
  - ☑️ **Development** (if using Vercel CLI locally)
- **Click "Save"**: Repeat for each variable

### 3. Required Environment Variables

Based on your `.env` file, here's what you need to add:

#### Database Configuration

**Option A: Using DATABASE_URL (Recommended)**
- **Key**: `DATABASE_URL`
- **Value**: `postgresql://username:password@host:port/database`
- **Example**: `postgresql://user:password123@db.example.com:5432/stockpulse`

**Option B: Individual Variables (Alternative)**
- **Key**: `DB_HOST` → **Value**: `your-db-host.com`
- **Key**: `DB_PORT` → **Value**: `5432`
- **Key**: `DB_USERNAME` → **Value**: `your-username`
- **Key**: `DB_PASSWORD` → **Value**: `your-password`
- **Key**: `DB_NAME` → **Value**: `stockpulse` (or your database name)

#### Shopify OAuth (Required)

- **Key**: `SHOPIFY_API_KEY` → **Value**: Your API key from Shopify Partners
- **Key**: `SHOPIFY_API_SECRET` → **Value**: Your API secret from Shopify Partners
- **Key**: `SHOPIFY_SCOPES` → **Value**: `read_products,read_inventory,read_orders` (optional, has default)

#### App URLs (Required)

- **Key**: `APP_URL` → **Value**: `https://your-backend.vercel.app` (you'll get this after first deploy, then update it)
- **Key**: `FRONTEND_URL` → **Value**: `*` (for now, or your frontend URL if deployed)
- **Key**: `NODE_ENV` → **Value**: `production`

#### Optional Variables

- **Key**: `REDIS_URL` → **Value**: Your Redis connection string (if using background jobs)
- **Key**: `ENABLE_NOTIFICATIONS` → **Value**: `false`
- **Key**: `EMAIL_PROVIDER` → **Value**: `postmark`
- **Key**: `SMS_PROVIDER` → **Value**: `twilio`

### 4. Visual Guide

When you click "Add New", you'll see:

```
┌─────────────────────────────────────────┐
│ Add Environment Variable                │
├─────────────────────────────────────────┤
│ Key: [DATABASE_URL________________]    │
│ Value: [postgresql://...____________]  │
│                                         │
│ Environments:                           │
│ ☑️ Production                           │
│ ☑️ Preview                              │
│ ☑️ Development                          │
│                                         │
│ [Cancel]  [Save]                        │
└─────────────────────────────────────────┘
```

### 5. Quick Copy-Paste Checklist

Copy these one by one into Vercel:

```env
# Database (choose one option)

# Option A: DATABASE_URL (recommended)
DATABASE_URL=postgresql://user:password@host:5432/database

# OR Option B: Individual variables
DB_HOST=your-db-host
DB_PORT=5432
DB_USERNAME=your-username
DB_PASSWORD=your-password
DB_NAME=your-database-name

# Required
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
APP_URL=https://your-backend.vercel.app
FRONTEND_URL=*
NODE_ENV=production

# Optional
SHOPIFY_SCOPES=read_products,read_inventory,read_orders
REDIS_URL=redis://your-redis-url
ENABLE_NOTIFICATIONS=false
EMAIL_PROVIDER=postmark
SMS_PROVIDER=twilio
```

### 6. Important Notes

1. **No `.env` file in Vercel**: Vercel doesn't use `.env` files - you add variables through the dashboard
2. **Secure Values**: Values are encrypted and only shown when you click "Edit"
3. **After First Deploy**: You'll get your backend URL, then update `APP_URL` with the actual URL
4. **Redeploy**: After adding env vars, Vercel will auto-redeploy or click "Redeploy" button
5. **Different Environments**: You can set different values for Production, Preview, and Development

### 7. Get Your Database URL

**If using Vercel Postgres:**
1. Vercel Dashboard → Your Project → **Storage** tab
2. Click "Create Database" → Select "Postgres"
3. Copy the connection string
4. Add as `DATABASE_URL` environment variable

**If using external database:**
- **Supabase**: Dashboard → Settings → Database → Connection String
- **Railway**: Database → Connect → Connection String
- **Neon**: Dashboard → Connection Details → Connection String

### 8. Testing After Setup

After adding all variables:

1. **Redeploy** your project (or wait for auto-redeploy)
2. **Check Logs**: Vercel Dashboard → Functions → View Logs
3. **Test Health**: Visit `https://your-backend.vercel.app/health`
4. **Should see**: `{ status: 'ok', timestamp: '...' }`

### 9. Update APP_URL After First Deploy

After your first successful deployment:

1. Copy your backend URL: `https://stockpulse-backend.vercel.app` (or your URL)
2. Go to Environment Variables in Vercel
3. Update `APP_URL` with your actual backend URL
4. Redeploy

---

## Example: Your Current .env → Vercel Mapping

If your `.env` file looks like:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=user
DB_PASSWORD=password
DB_NAME=crypto
SHOPIFY_API_KEY=abc123
SHOPIFY_API_SECRET=xyz789
```

In Vercel, you would add:
1. `DB_HOST` = `localhost` → **BUT WAIT**: localhost won't work in Vercel! You need a **public database**.
2. `DB_PORT` = `5432`
3. `DB_USERNAME` = `user`
4. `DB_PASSWORD` = `password`
5. `DB_NAME` = `crypto`
6. `SHOPIFY_API_KEY` = `abc123`
7. `SHOPIFY_API_SECRET` = `xyz789`

**OR better yet**, if your database provider gives you a connection string, use:
- `DATABASE_URL` = `postgresql://user:password@public-host:5432/crypto`

---

## Common Mistake: localhost Database

⚠️ **IMPORTANT**: If your `.env` has `DB_HOST=localhost`, this **WON'T WORK** in Vercel!

- `localhost` refers to the Vercel server itself (not your local machine)
- You need a **publicly accessible database** (Supabase, Railway, Neon, Vercel Postgres, etc.)

**Solution**: Use a cloud database with a public hostname.

