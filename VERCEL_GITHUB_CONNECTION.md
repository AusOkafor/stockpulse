# Connecting Vercel to GitHub for Auto-Deploy

## Why Auto-Deploy Isn't Working

If pushing to GitHub doesn't trigger Vercel deployment, it usually means:
- ❌ Vercel project isn't connected to GitHub repository
- ❌ Wrong branch is being monitored (Vercel might be watching `master` but you pushed to `main`)
- ❌ GitHub integration needs to be reconnected

## Solution: Connect Vercel to GitHub

### Step 1: Check Current Setup

1. **Go to Vercel Dashboard:**
   - https://vercel.com/dashboard
   - Click on your project

2. **Go to Settings → Git:**
   - Click **"Settings"** tab
   - Click **"Git"** in the left sidebar
   - You'll see one of two scenarios:

---

### Scenario A: Project is NOT Connected to Git

If you see "No Git Repository Connected":

1. **Click "Connect Git Repository"** button
2. **Select GitHub** as your Git provider
3. **Authorize Vercel** (if first time - grant permissions)
4. **Find your repository:**
   - Search for: `AusOkafor/stockpulse`
   - Or browse to it
5. **Click on the repository**
6. **Configure Project:**
   - **Root Directory:** `backend` (important - since your backend is in a subfolder)
   - **Framework Preset:** Other (or leave as is)
   - **Build Command:** `npm run build` (or `cd backend && npm run build` if root)
   - **Output Directory:** `dist`
   - **Install Command:** `npm install` (or `cd backend && npm install` if root)
7. **Click "Deploy"**

---

### Scenario B: Project IS Connected but Wrong Branch/Root

If you see a connected repository but it's not deploying:

1. **Check Production Branch:**
   - Should be `main` (not `master`)
   - If wrong, change it: Settings → Git → Production Branch → Select `main`

2. **Check Root Directory:**
   - If your backend is in `backend/` subfolder
   - Go to Settings → General
   - Set **Root Directory:** `backend`
   - Save

3. **Redeploy:**
   - After changing settings, go to Deployments
   - Click "Redeploy" on latest deployment

---

## Alternative: Manual Deploy First (If Root Directory Issue)

If your backend is in a subfolder (`backend/`) and Vercel is looking at root:

**Option 1: Use Root Directory Setting (Recommended)**

1. Settings → General
2. Set **Root Directory:** `backend`
3. Save
4. Redeploy

**Option 2: Deploy from Root with Build Command**

If you can't set root directory:
1. Settings → General
2. **Build Command:** `cd backend && npm run build`
3. **Output Directory:** `backend/dist`
4. **Install Command:** `cd backend && npm install`
5. Save and redeploy

---

## Quick Fix: Manual Redeploy (While Setting Up)

While you're connecting GitHub, you can manually redeploy:

1. **Vercel Dashboard** → Your Project → **Deployments**
2. Find latest deployment
3. Click **"⋯"** (three dots)
4. Click **"Redeploy"**
5. Confirm

This will deploy your latest code, even if auto-deploy isn't set up yet.

---

## Verify Auto-Deploy Works

After connecting:

1. **Make a small change:**
   ```powershell
   # Add a comment or update a file
   echo "// Auto-deploy test" >> src/main.ts
   git add .
   git commit -m "Test auto-deploy"
   git push origin main
   ```

2. **Check Vercel Dashboard:**
   - Should see new deployment starting automatically
   - Usually within 10-30 seconds

---

## Common Issues

### Issue: "Repository not found"
- **Cause:** Vercel doesn't have access to your GitHub repo
- **Fix:** Re-authorize Vercel in GitHub settings, or reconnect the repository

### Issue: "Build failed" after connecting
- **Cause:** Wrong build commands or root directory
- **Fix:** Check Settings → General → Build & Development Settings

### Issue: Deploys but wrong files
- **Cause:** Root directory is wrong
- **Fix:** Set Root Directory to `backend` in Settings → General

---

## Recommended Settings for Your Project

Since your backend is in `backend/` folder:

**Settings → General:**
- **Root Directory:** `backend`
- **Framework Preset:** Other
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`
- **Development Command:** `npm run start:dev`

**Settings → Git:**
- **Production Branch:** `main`
- **Repository:** `AusOkafor/stockpulse`

---

## After Connecting: Test It

1. ✅ Push a small change to GitHub
2. ✅ Check Vercel Dashboard → Should see new deployment
3. ✅ Wait for deployment to complete
4. ✅ Test your endpoint

Once this works, every `git push` will automatically trigger a new deployment! 🚀

