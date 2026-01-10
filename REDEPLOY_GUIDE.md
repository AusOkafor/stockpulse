# How to Redeploy Backend to Vercel

## Method 1: Git Push (Auto-Deploy) - Recommended

If your Vercel project is connected to GitHub, pushing to the repo will automatically trigger a redeploy.

### Steps:

1. **Commit your changes:**
   ```powershell
   git add .
   git commit -m "Add Vercel Postgres support and serverless configuration"
   ```

2. **Push to GitHub:**
   ```powershell
   git push origin main
   ```

3. **Check Vercel Dashboard:**
   - Go to Vercel Dashboard → Your Project → Deployments
   - You should see a new deployment starting automatically
   - Wait for it to complete (usually 1-2 minutes)

---

## Method 2: Vercel Dashboard (Manual Redeploy)

If you don't want to commit/push, or want to redeploy existing code:

1. **Go to Vercel Dashboard:**
   - https://vercel.com/dashboard
   - Click on your project (`stockpulse-backend` or similar)

2. **Go to Deployments Tab:**
   - Click **"Deployments"** in the top navigation

3. **Redeploy:**
   - Find the latest deployment
   - Click the **"⋯"** (three dots) menu on the right
   - Click **"Redeploy"**
   - Confirm if prompted

4. **Wait for Deployment:**
   - You'll see the deployment status updating
   - Usually takes 1-2 minutes
   - Check the logs if there are any errors

---

## Method 3: Vercel CLI (Alternative)

If you have Vercel CLI installed:

```powershell
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

---

## After Redeploy - Verify It Worked

1. **Check Deployment Status:**
   - Vercel Dashboard → Deployments
   - Should show "Ready" status (green checkmark)

2. **Check Logs:**
   - Click on the deployment
   - Go to "Functions" → "Logs"
   - Should see: "NestJS application initialized successfully"
   - Should NOT see database connection errors

3. **Test Health Endpoint:**
   ```powershell
   # Replace with your actual Vercel URL
   curl https://your-backend.vercel.app/health
   ```
   Should return: `{ "status": "ok", "timestamp": "..." }`

4. **Verify Environment Variables:**
   - Settings → Environment Variables
   - Should see `POSTGRES_URL` listed
   - Value should be hidden (shows as `••••••••`)

---

## Troubleshooting

### Deployment Failed
- **Check logs:** Deployments → Click on failed deployment → View logs
- **Common issues:**
  - Missing environment variables
  - Build errors (check `npm run build` locally)
  - TypeScript errors

### Still Getting 500 Errors
- **Check:** Did you connect the database to the project?
- **Check:** Did you redeploy AFTER connecting the database?
- **Check:** Functions → Logs for specific error messages

### Environment Variables Not Found
- **Solution:** Make sure you:
  1. Connected database to project (Storage → Connect Project)
  2. Checked all environments (Development, Preview, Production)
  3. Redeployed after connecting

---

## Recommended: Use Method 1 (Git Push)

This is the best practice because:
- ✅ Keeps your code in sync with deployment
- ✅ Automatic deployment on every push
- ✅ Full deployment history
- ✅ Easy to rollback if needed

