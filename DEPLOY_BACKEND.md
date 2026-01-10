# Deploy Backend to Vercel

## Quick Deployment Steps

### 1. Push Your Code to GitHub
Make sure all your changes are committed and pushed:
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 2. Deploy to Vercel

#### Option A: Using Vercel Dashboard (Recommended)

1. **Go to Vercel**: https://vercel.com/new
2. **Sign in** with your GitHub account
3. **Import Git Repository**: Select your `stockpulse` repository
4. **Configure Project**:
   - **Project Name**: `stockpulse-backend` (or any name you prefer)
   - **Root Directory**: `backend` ⚠️ **IMPORTANT**: Set this to `backend`
   - **Framework Preset**: **Other** (or leave blank)
   - **Build Command**: `npm run build` (or leave blank - uses vercel.json)
   - **Output Directory**: (leave empty - not needed for serverless)
   - **Install Command**: `npm install`

5. **Add Environment Variables** (Click "Environment Variables" button):
   
   **Required Variables:**
   ```
   DATABASE_URL=your_production_database_url
   SHOPIFY_API_KEY=your_shopify_api_key
   SHOPIFY_API_SECRET=your_shopify_api_secret
   APP_URL=https://your-backend.vercel.app (you'll get this after first deploy)
   FRONTEND_URL=http://localhost:3000 (or your frontend URL if deployed)
   NODE_ENV=production
   ```
   
   **Optional Variables:**
   ```
   REDIS_URL=your_redis_url (if using background jobs)
   ENABLE_NOTIFICATIONS=false
   EMAIL_PROVIDER=postmark
   SMS_PROVIDER=twilio
   ```

6. **Deploy**: Click "Deploy" button

7. **Wait for Deployment**: Vercel will build and deploy your backend

8. **Get Your Backend URL**: After deployment, you'll get a URL like:
   ```
   https://stockpulse-backend.vercel.app
   ```

9. **Update Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Update `APP_URL` with your actual backend URL
   - Update `FRONTEND_URL` if you have a frontend deployed

#### Option B: Using Vercel CLI

```bash
# Install Vercel CLI globally
npm i -g vercel

# Navigate to backend directory
cd backend

# Deploy
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? (select your account)
# - Link to existing project? No
# - Project name? stockpulse-backend
# - Directory? ./
# - Override settings? No

# For production deployment
vercel --prod
```

### 3. Set Up Database

You need a PostgreSQL database. Options:

#### Option A: Vercel Postgres (Easiest)
1. In Vercel Dashboard → Your Project → Storage tab
2. Click "Create Database" → Select "Postgres"
3. Copy the connection string
4. Add to Environment Variables as `DATABASE_URL`

#### Option B: External Database
- **Supabase**: https://supabase.com (free tier available)
- **Railway**: https://railway.app (easy setup)
- **Neon**: https://neon.tech (serverless Postgres)
- **AWS RDS**: For production scale

### 4. Run Database Migrations

After deployment, you need to run migrations:

#### Option A: Create Migration Endpoint (Recommended)
Add a temporary migration endpoint in your backend (remove after use):

```typescript
// In a controller or create a migration service
@Post('migrate')
async migrate() {
  // Run migrations programmatically
  // This is a one-time setup
}
```

#### Option B: Use Vercel CLI
```bash
# Pull environment variables
vercel env pull .env.production

# Run migrations locally (pointing to production DB)
npm run migration:run
```

#### Option C: Direct Database Access
Connect to your production database and run migrations manually.

### 5. Update Shopify App Configuration

1. **Go to Shopify Partners Dashboard**: https://partners.shopify.com
2. **Select Your App**
3. **Update URLs**:
   - **App URL**: `https://your-backend.vercel.app` (or your frontend if deployed)
   - **Allowed redirection URL(s)**: `https://your-backend.vercel.app/auth/callback`
   - **Webhook URLs**:
     - `app/uninstalled`: `https://your-backend.vercel.app/webhooks/shopify`
     - `inventory_levels/update`: `https://your-backend.vercel.app/webhooks/shopify`

### 6. Test Your Deployment

1. **Health Check**: Visit `https://your-backend.vercel.app/health`
2. **OAuth Install**: Visit `https://your-backend.vercel.app/auth/install?shop=your-store.myshopify.com`
3. **Test Webhooks**: Use Shopify's webhook testing tool

## Environment Variables Checklist

Before deploying, make sure you have:

- [ ] `DATABASE_URL` - Production PostgreSQL connection string
- [ ] `SHOPIFY_API_KEY` - From Shopify Partners Dashboard
- [ ] `SHOPIFY_API_SECRET` - From Shopify Partners Dashboard
- [ ] `APP_URL` - Your backend Vercel URL (update after first deploy)
- [ ] `FRONTEND_URL` - Your frontend URL (or localhost for now)
- [ ] `NODE_ENV=production`
- [ ] `REDIS_URL` (optional - if using background jobs)

## Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Ensure TypeScript compiles: `npm run build` locally
- Check Vercel build logs for errors

### Database Connection Fails
- Verify `DATABASE_URL` format: `postgresql://user:password@host:port/database`
- Check database allows connections from Vercel IPs
- Ensure database is accessible (not behind firewall)

### Webhook HMAC Verification Fails
- Verify `SHOPIFY_API_SECRET` is correct
- Check webhook URL is correct in Shopify dashboard
- Ensure raw body is enabled (already configured in `api/index.ts`)

### CORS Errors
- Update `FRONTEND_URL` environment variable
- Check CORS configuration in `api/index.ts`

## Post-Deployment

1. ✅ Test OAuth flow
2. ✅ Test webhook endpoints
3. ✅ Run database migrations
4. ✅ Update Shopify app URLs
5. ✅ Monitor Vercel logs for errors

## Next Steps

After backend is deployed:
- Test the OAuth installation flow
- Set up your frontend deployment (when ready)
- Configure monitoring and logging
- Set up database backups

