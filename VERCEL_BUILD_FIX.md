# Fixing Vercel Build Error: "No entrypoint found"

## The Problem

Vercel is trying to auto-detect your framework and looking for standard entry points like:
- `src/main.ts`
- `src/index.ts`
- `main.ts`
- etc.

But you're using a **custom serverless function** in `api/index.ts`, not a standard Node.js app entry point.

## The Solution

We've updated `vercel.json` to:
1. ✅ Set `"framework": null` - Disables auto-detection
2. ✅ Keep `buildCommand` - Still builds your NestJS app
3. ✅ Use `api/index.ts` - Your serverless function handler

## What Changed

**Before:**
```json
{
  "buildCommand": "npm run build",
  "rewrites": [...]
}
```

**After:**
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "framework": null,  // ← This tells Vercel not to auto-detect
  "rewrites": [...]
}
```

## How It Works

1. **Build Phase:**
   - Vercel runs `npm run build`
   - This compiles your NestJS app to `dist/`
   - Your `api/index.ts` imports from `dist/`

2. **Runtime:**
   - All requests go to `/api` (via rewrite)
   - `/api` maps to `api/index.ts` serverless function
   - `api/index.ts` loads your NestJS app from `dist/`

## If Build Still Fails

### Check 1: Root Directory
- Vercel Dashboard → Settings → General
- **Root Directory** should be: `.` (blank/default)
- **NOT** `backend` (since your repo root IS the backend)

### Check 2: Build Command
- Should be: `npm run build`
- This runs `nest build` which compiles to `dist/`

### Check 3: Output Directory
- `vercel.json` has `"outputDirectory": "dist"`
- This tells Vercel where build output is

### Check 4: API Function Exists
- File: `api/index.ts` must exist
- Export: `export default async function handler(...)`

## Next Steps

1. ✅ Code is fixed (committed and pushed)
2. ⏳ **Redeploy** in Vercel Dashboard
3. ⏳ Check build logs for any other errors

The build should now succeed! 🚀

