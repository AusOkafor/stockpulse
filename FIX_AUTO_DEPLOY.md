# Fix Vercel Auto-Deploy from GitHub

## Problem
Your backend is in `backend/` subfolder, but Vercel needs to know:
1. Where to find the project (Root Directory)
2. Which branch to watch
3. How to build it

## ✅ Solution: Configure Vercel Settings

### Step 1: Go to Vercel Dashboard

1. Open: https://vercel.com/dashboard
2. Click on your project (`stockpulse-backend` or similar name)

### Step 2: Set Root Directory

1. Click **"Settings"** tab
2. Click **"General"** in left sidebar
3. Scroll to **"Root Directory"**
4. Click **"Edit"**
5. Enter: `backend`
6. Click **"Save"**

**This tells Vercel:** "Look for `vercel.json` and build files in the `backend/` folder"

### Step 3: Connect GitHub (If Not Connected)

1. Still in **Settings** → Click **"Git"** in left sidebar
2. Check if repository is connected:
   - **If connected:** Should see `AusOkafor/stockpulse` listed
   - **If NOT connected:** Continue to Step 4

3. **If connected but not deploying:**
   - Check **"Production Branch"** → Should be `main`
   - If it says `master`, change it to `main`
   - Click **"Save"**

### Step 4: Connect Repository (If Needed)

If repository is NOT connected:

1. Click **"Connect Git Repository"**
2. Select **GitHub**
3. Authorize Vercel (if first time)
4. Find repository: `AusOkafor/stockpulse`
5. Click on it
6. **Important:** Make sure Root Directory is set to `backend` (from Step 2)
7. Click **"Deploy"**

### Step 5: Verify Build Settings

1. **Settings** → **General**
2. Scroll to **"Build & Development Settings"**
3. Should show:
   - **Framework Preset:** Other (or detect from vercel.json)
   - **Root Directory:** `backend`
   - **Build Command:** (inherited from vercel.json)
   - **Output Directory:** (inherited from vercel.json)

**Note:** Since you have `vercel.json` in `backend/`, it will use those settings.

### Step 6: Test Auto-Deploy

After configuring:

1. **Make a small test change:**
   ```powershell
   cd backend
   echo "// Test auto-deploy" >> src/app.controller.ts
   git add .
   git commit -m "Test auto-deploy"
   git push origin main
   ```

2. **Watch Vercel Dashboard:**
   - Go to **Deployments** tab
   - Should see new deployment starting within 10-30 seconds
   - Status: "Building..." → "Ready"

3. **If it works:**
   - ✅ Auto-deploy is configured!
   - You can revert the test change

---

## Alternative: Move vercel.json to Root (Not Recommended)

If setting Root Directory doesn't work, you could move `vercel.json` to root, but you'd need to update paths:

```json
{
  "version": 2,
  "buildCommand": "cd backend && npm run build",
  "installCommand": "cd backend && npm install",
  "outputDirectory": "backend/dist",
  "builds": [
    {
      "src": "backend/api/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "backend/api/index.ts"
    }
  ]
}
```

**But the Root Directory approach is cleaner!**

---

## Troubleshooting

### Issue: "Root Directory cannot be set"

**Possible causes:**
- You're on the free tier (some restrictions)
- Project was imported differently

**Solution:**
- Re-import the project: Settings → General → Scroll to bottom → "Delete Project"
- Create new project → Import from GitHub → Set root directory during import

### Issue: Still not deploying after connecting

**Check:**
1. **Production Branch:** Settings → Git → Should be `main`
2. **Repository:** Settings → Git → Should show correct repo
3. **Root Directory:** Settings → General → Should be `backend`
4. **Deploy again:** Go to Deployments → Redeploy manually once

### Issue: Build fails after connecting

**Check:**
- **Logs:** Deployments → Click on failed deployment → View logs
- **Build Command:** Should work in `backend/` directory
- **Dependencies:** Make sure `package.json` is in `backend/`

---

## Quick Checklist

Before pushing to GitHub, verify:

- [ ] Root Directory set to `backend` in Vercel Settings
- [ ] GitHub repository connected (Settings → Git)
- [ ] Production Branch is `main` (not `master`)
- [ ] `vercel.json` exists in `backend/` folder ✅ (already done)
- [ ] `api/index.ts` exists in `backend/api/` ✅ (already done)

After all checked:

- [ ] Push to GitHub
- [ ] Watch Vercel Dashboard → Should auto-deploy
- [ ] Test endpoint after deployment

---

## Current Status Check

To see what Vercel sees:

1. Go to **Settings** → **General**
2. Check:
   - ✅ Root Directory: Should say `backend`
   - ✅ Build Command: Inherited or explicit
   - ✅ Output Directory: Inherited or explicit

3. Go to **Settings** → **Git**
4. Check:
   - ✅ Repository: `AusOkafor/stockpulse`
   - ✅ Production Branch: `main`

If all ✅, auto-deploy should work on next push!

