# One-Time Migration: Local PostgreSQL → Vercel Postgres

## ⚠️ CRITICAL WARNINGS

### ❌ DO NOT:
- ❌ Use `synchronize: true` in TypeORM (data loss risk)
- ❌ Auto-run migrations on Vercel serverless runtime
- ❌ Import using pooled connection URLs (`POSTGRES_URL`)
- ❌ Recreate tables manually (will lose data)
- ❌ Rely on Shopify reinstall to repopulate (won't work for existing data)

### ✅ DO:
- ✅ Use `POSTGRES_URL_NON_POOLING` for data import
- ✅ Use `pg_dump` and `pg_restore` for migration
- ✅ Verify data after import
- ✅ Run migrations ONLY after import is complete
- ✅ Keep backups before migration

---

## 📋 Prerequisites

1. **Local PostgreSQL database** with existing data
2. **Vercel Postgres connection strings** (provided below)
3. **PostgreSQL client tools** installed:
   - `pg_dump` (for export)
   - `pg_restore` (for import)
   - `psql` (for verification)
   
   If not installed, download from: https://www.postgresql.org/download/windows/

4. **Environment variables** set up:
   - Local database connection info
   - Vercel Postgres connection strings

---

## 🔑 Connection Strings

### Local Database (Source)
```env
# Your local database - adjust as needed
DB_HOST=localhost
DB_PORT=5432
DB_USER=user
DB_PASSWORD=okwy@1986
DB_NAME=crypto
```

### Vercel Postgres (Destination)

**For Import (USE THIS ONE):**
```env
POSTGRES_URL_NON_POOLING=postgres://6d6bfbba81b7f633d0288ec99f239be5d556745ac6f812d4a96d2f3098575333:sk_agcWkjp0W9WV61o-yQP--@db.prisma.io:5432/postgres?sslmode=require
```

**Note:** You mentioned `POSTGRES_URL_NON_POOLING` but I see `POSTGRES_URL` in your provided strings. If Vercel created `POSTGRES_URL_NON_POOLING`, use that. Otherwise, the non-pooling connection is typically the direct connection without pooling parameters.

**For Application (After Migration):**
```env
POSTGRES_URL=postgres://6d6bfbba81b7f633d0288ec99f239be5d556745ac6f812d4a96d2f3098575333:sk_agcWkjp0W9WV61o-yQP--@db.prisma.io:5432/postgres?sslmode=require
```

---

## 📝 Step-by-Step Migration Process

### Step 1: Verify Local Database

**PowerShell:**
```powershell
# Test connection to local database
$env:PGPASSWORD = "okwy@1986"
psql -h localhost -p 5432 -U user -d crypto -c "\dt"
```

**Expected:** Should list all tables (shops, products, variants, demand_requests, etc.)

---

### Step 2: Export from Local Database

**PowerShell:**
```powershell
# Navigate to backend directory
cd D:\Desktop\Stock-pulse\backend

# Set password (to avoid prompts)
$env:PGPASSWORD = "okwy@1986"

# Create backup directory
New-Item -ItemType Directory -Force -Path "migrations\backup" | Out-Null

# Export database schema and data
# Format: custom (binary) - best for pg_restore
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "migrations\backup\local_db_backup_$timestamp.custom"

pg_dump -h localhost -p 5432 -U user -d crypto `
  --format=custom `
  --verbose `
  --no-owner `
  --no-acl `
  --file=$backupFile

# Verify backup file was created
if (Test-Path $backupFile) {
    $fileSize = (Get-Item $backupFile).Length / 1MB
    Write-Host "✅ Backup created: $backupFile ($([math]::Round($fileSize, 2)) MB)" -ForegroundColor Green
} else {
    Write-Host "❌ Backup failed!" -ForegroundColor Red
    exit 1
}
```

**Alternative: Plain SQL format** (if custom format doesn't work):
```powershell
# Export as plain SQL
$backupFile = "migrations\backup\local_db_backup_$timestamp.sql"

pg_dump -h localhost -p 5432 -U user -d crypto `
  --format=plain `
  --verbose `
  --no-owner `
  --no-acl `
  --file=$backupFile
```

---

### Step 3: Verify Backup Contents

**PowerShell:**
```powershell
# List contents of backup (if custom format)
pg_restore --list $backupFile | Select-Object -First 50

# Or for SQL format, check file contents
if ($backupFile.EndsWith('.sql')) {
    Get-Content $backupFile | Select-Object -First 50
}
```

**Expected Output:** Should show tables, sequences, constraints, data, etc.

---

### Step 4: Check Vercel Postgres (Empty Database)

**PowerShell:**
```powershell
# Test connection to Vercel Postgres
# Extract connection details from URL
$vercelUrl = "postgres://6d6bfbba81b7f633d0288ec99f239be5d556745ac6f812d4a96d2f3098575333:sk_agcWkjp0W9WV61o-yQP--@db.prisma.io:5432/postgres?sslmode=require"

# Parse URL for psql (you'll need to extract manually or use a script)
# For now, test with psql directly:
$env:PGPASSWORD = "sk_agcWkjp0W9WV61o-yQP--"
psql "postgres://6d6bfbba81b7f633d0288ec99f239be5d556745ac6f812d4a96d2f3098575333:sk_agcWkjp0W9WV61o-yQP--@db.prisma.io:5432/postgres?sslmode=require" -c "\dt"
```

**Expected:** Should be empty or show only system tables (if database is new)

**Verify it's empty:**
```sql
-- Run this in psql connected to Vercel Postgres
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';
```

---

### Step 5: Import to Vercel Postgres

**⚠️ CRITICAL: Use NON-POOLING connection for import!**

**PowerShell:**
```powershell
# Set the backup file path (use the one created in Step 2)
$backupFile = "migrations\backup\local_db_backup_YYYYMMDD_HHMMSS.custom"  # Update with actual filename

# Vercel Postgres connection (non-pooling)
$vercelConnectionString = "postgres://6d6bfbba81b7f633d0288ec99f239be5d556745ac6f812d4a96d2f3098575333:sk_agcWkjp0W9WV61o-yQP--@db.prisma.io:5432/postgres?sslmode=require"

# Import using pg_restore (for custom format)
Write-Host "🔄 Importing data to Vercel Postgres..." -ForegroundColor Cyan

pg_restore `
  --dbname=$vercelConnectionString `
  --verbose `
  --no-owner `
  --no-acl `
  --clean `  # Drops existing objects before recreating
  --if-exists `  # Don't error if object doesn't exist
  $backupFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Import completed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Import failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    exit 1
}
```

**For SQL format backup:**
```powershell
# If you used SQL format instead
$backupFile = "migrations\backup\local_db_backup_YYYYMMDD_HHMMSS.sql"

psql $vercelConnectionString -f $backupFile
```

---

### Step 6: Verify Import

**PowerShell - Check Tables:**
```powershell
# Connect and list tables
psql $vercelConnectionString -c "\dt"

# Expected: Should see all your tables:
# - shops
# - products
# - variants
# - demand_requests
# - recovery_links
# - order_attributions
# - shop_settings
# - shop_plans
# - migrations
```

**PowerShell - Check Row Counts:**
```powershell
# Verify data was imported
$vercelConnectionString = "postgres://6d6bfbba81b7f633d0288ec99f239be5d556745ac6f812d4a96d2f3098575333:sk_agcWkjp0W9WV61o-yQP--@db.prisma.io:5432/postgres?sslmode=require"

psql $vercelConnectionString -c "
SELECT 
    'shops' as table_name, COUNT(*) as row_count FROM shops
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'variants', COUNT(*) FROM variants
UNION ALL
SELECT 'demand_requests', COUNT(*) FROM demand_requests
UNION ALL
SELECT 'recovery_links', COUNT(*) FROM recovery_links
UNION ALL
SELECT 'order_attributions', COUNT(*) FROM order_attributions
UNION ALL
SELECT 'shop_settings', COUNT(*) FROM shop_settings
UNION ALL
SELECT 'shop_plans', COUNT(*) FROM shop_plans;
"
```

**Compare with local:**
```powershell
# Get local database row counts
$env:PGPASSWORD = "okwy@1986"
psql -h localhost -p 5432 -U user -d crypto -c "
SELECT 
    'shops' as table_name, COUNT(*) as row_count FROM shops
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'variants', COUNT(*) FROM variants
UNION ALL
SELECT 'demand_requests', COUNT(*) FROM demand_requests
UNION ALL
SELECT 'recovery_links', COUNT(*) FROM recovery_links
UNION ALL
SELECT 'order_attributions', COUNT(*) FROM order_attributions
UNION ALL
SELECT 'shop_settings', COUNT(*) FROM shop_settings
UNION ALL
SELECT 'shop_plans', COUNT(*) FROM shop_plans;
"
```

**Row counts should match!**

---

### Step 7: Verify Constraints and Indexes

**PowerShell:**
```powershell
# Check foreign keys
psql $vercelConnectionString -c "
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
"

# Check indexes
psql $vercelConnectionString -c "
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
"
```

---

### Step 8: Verify Data Integrity

**PowerShell - Sample Data Check:**
```powershell
# Check sample records from each table
psql $vercelConnectionString -c "
-- Shops
SELECT id, shopify_domain, is_active, installed_at FROM shops LIMIT 5;

-- Products
SELECT id, shop_id, shopify_product_id, title FROM products LIMIT 5;

-- Demand Requests
SELECT id, variant_id, channel, status, created_at FROM demand_requests LIMIT 5;
"
```

**PowerShell - Foreign Key Integrity:**
```powershell
# Verify no orphaned records
psql $vercelConnectionString -c "
-- Check for orphaned products (no shop)
SELECT COUNT(*) as orphaned_products
FROM products p
LEFT JOIN shops s ON p.shop_id = s.id
WHERE s.id IS NULL;

-- Check for orphaned variants (no product)
SELECT COUNT(*) as orphaned_variants
FROM variants v
LEFT JOIN products p ON v.product_id = p.id
WHERE p.id IS NULL;

-- Check for orphaned demand requests (no variant)
SELECT COUNT(*) as orphaned_demand_requests
FROM demand_requests dr
LEFT JOIN variants v ON dr.variant_id = v.id
WHERE v.id IS NULL;
"
```

**Expected:** All counts should be 0 (no orphaned records)

---

## 🔄 After Migration: TypeORM Migrations

### ⚠️ IMPORTANT: When to Run Migrations

**Only run TypeORM migrations AFTER import is complete:**

1. ✅ Migration is complete
2. ✅ Data is verified
3. ✅ All tables exist in Vercel Postgres

**When to run:**
- When you create NEW migrations (future changes)
- When you need to update schema (not data)

**How to run (locally, using Vercel connection):**
```powershell
# Set Vercel Postgres connection temporarily
$env:POSTGRES_URL = "postgres://6d6bfbba81b7f633d0288ec99f239be5d556745ac6f812d4a96d2f3098575333:sk_agcWkjp0W9WV61o-yQP--@db.prisma.io:5432/postgres?sslmode=require"

# Run migrations
npm run migration:run
```

**⚠️ DO NOT:**
- Don't run migrations during import
- Don't use `synchronize: true` in production
- Don't auto-run migrations in Vercel serverless runtime

---

## 📋 Complete Migration Script

**PowerShell Script: `backend/scripts/migrate-to-vercel.ps1`**

```powershell
# StockPulse Database Migration Script
# Local PostgreSQL → Vercel Postgres

param(
    [string]$LocalDbName = "crypto",
    [string]$LocalDbUser = "user",
    [string]$LocalDbPassword = "okwy@1986",
    [string]$LocalDbHost = "localhost",
    [int]$LocalDbPort = 5432,
    [Parameter(Mandatory=$true)]
    [string]$VercelConnectionString
)

Write-Host "🚀 Starting Migration: Local DB → Vercel Postgres" -ForegroundColor Cyan
Write-Host ""

# Step 1: Export
Write-Host "📤 Step 1: Exporting from local database..." -ForegroundColor Yellow
$env:PGPASSWORD = $LocalDbPassword
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "migrations\backup"
$backupFile = "$backupDir\local_db_backup_$timestamp.custom"

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

pg_dump -h $LocalDbHost -p $LocalDbPort -U $LocalDbUser -d $LocalDbName `
    --format=custom `
    --verbose `
    --no-owner `
    --no-acl `
    --file=$backupFile

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Export failed!" -ForegroundColor Red
    exit 1
}

$fileSize = (Get-Item $backupFile).Length / 1MB
Write-Host "✅ Backup created: $backupFile ($([math]::Round($fileSize, 2)) MB)" -ForegroundColor Green
Write-Host ""

# Step 2: Verify backup
Write-Host "🔍 Step 2: Verifying backup..." -ForegroundColor Yellow
$backupContents = pg_restore --list $backupFile | Measure-Object -Line
Write-Host "✅ Backup contains $($backupContents.Lines) objects" -ForegroundColor Green
Write-Host ""

# Step 3: Import
Write-Host "📥 Step 3: Importing to Vercel Postgres..." -ForegroundColor Yellow
Write-Host "⚠️  Using NON-POOLING connection: $VercelConnectionString" -ForegroundColor Yellow

pg_restore `
    --dbname=$VercelConnectionString `
    --verbose `
    --no-owner `
    --no-acl `
    --clean `
    --if-exists `
    $backupFile

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Import failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Import completed!" -ForegroundColor Green
Write-Host ""

# Step 4: Verify
Write-Host "🔍 Step 4: Verifying import..." -ForegroundColor Yellow

$tableCounts = psql $VercelConnectionString -t -c "
SELECT 
    string_agg(table_name || ': ' || row_count::text, ', ')
FROM (
    SELECT 'shops' as table_name, COUNT(*) as row_count FROM shops
    UNION ALL SELECT 'products', COUNT(*) FROM products
    UNION ALL SELECT 'variants', COUNT(*) FROM variants
    UNION ALL SELECT 'demand_requests', COUNT(*) FROM demand_requests
    UNION ALL SELECT 'recovery_links', COUNT(*) FROM recovery_links
    UNION ALL SELECT 'order_attributions', COUNT(*) FROM order_attributions
    UNION ALL SELECT 'shop_settings', COUNT(*) FROM shop_settings
    UNION ALL SELECT 'shop_plans', COUNT(*) FROM shop_plans
) t;
"

Write-Host "📊 Row counts: $tableCounts" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Verify data in Vercel Postgres dashboard" -ForegroundColor White
Write-Host "   2. Test API endpoints" -ForegroundColor White
Write-Host "   3. Run TypeORM migrations only if schema changes are needed" -ForegroundColor White
```

**Usage:**
```powershell
.\scripts\migrate-to-vercel.ps1 -VercelConnectionString "postgres://6d6bfbba81b7f633d0288ec99f239be5d556745ac6f812d4a96d2f3098575333:sk_agcWkjp0W9WV61o-yQP--@db.prisma.io:5432/postgres?sslmode=require"
```

---

## ✅ Verification Checklist

After migration, verify:

- [ ] All tables exist in Vercel Postgres
- [ ] Row counts match local database
- [ ] Foreign keys are intact
- [ ] Indexes are created
- [ ] Constraints are preserved
- [ ] Sample data looks correct
- [ ] No orphaned records
- [ ] API endpoints work with Vercel Postgres
- [ ] Migrations table exists (if you had migrations)

---

## 🔒 Safety Notes for Serverless Environments

### 1. Connection Pooling
- **Import:** Always use `POSTGRES_URL_NON_POOLING` or direct connection
- **Application:** Use `POSTGRES_URL` (with pooling) for runtime
- **Why:** Pooling can cause connection issues during bulk import

### 2. TypeORM Configuration
- ✅ `synchronize: false` (never true in production)
- ✅ `migrationsRun: false` (run manually, not auto)
- ✅ Connection limit: `max: 1` (for serverless)
- ✅ Explicit entity imports (better for serverless)

### 3. Migration Timing
- ❌ Don't run migrations during serverless function cold start
- ✅ Run migrations separately, before deploying
- ✅ Use direct connection (non-pooling) for migrations

### 4. Data Integrity
- Always backup before migration
- Verify data after import
- Test in staging/preview environment first
- Monitor for connection timeouts

---

## 🆘 Troubleshooting

### Issue: "Connection refused"
**Solution:** Check connection string format, SSL mode, firewall

### Issue: "Permission denied"
**Solution:** Verify credentials, check if database allows connections

### Issue: "Relation already exists"
**Solution:** Use `--clean --if-exists` flags in pg_restore

### Issue: "Out of memory"
**Solution:** Import in smaller batches, use custom format instead of SQL

### Issue: "Timeout during import"
**Solution:** Increase timeout, use non-pooling connection, import during off-peak

---

## 📚 Additional Resources

- [pg_dump documentation](https://www.postgresql.org/docs/current/app-pgdump.html)
- [pg_restore documentation](https://www.postgresql.org/docs/current/app-pgrestore.html)
- [Vercel Postgres documentation](https://vercel.com/docs/storage/vercel-postgres)
- [TypeORM migrations](https://typeorm.io/migrations)

---

**Migration Date:** _[Fill after migration]_  
**Status:** _[Fill after migration]_  
**Verified By:** _[Fill after verification]_

