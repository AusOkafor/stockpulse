# StockPulse Database Migration Script
# Local PostgreSQL → Vercel Postgres
# Usage: .\migrate-to-vercel.ps1 -VercelConnectionString "postgres://..."

param(
    [string]$LocalDbName = "crypto",
    [string]$LocalDbUser = "user",
    [string]$LocalDbPassword = "okwy@1986",
    [string]$LocalDbHost = "localhost",
    [int]$LocalDbPort = 5432,
    [Parameter(Mandatory=$true)]
    [string]$VercelConnectionString
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "🚀 Starting Migration: Local DB → Vercel Postgres" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# Step 1: Export
Write-Host "📤 Step 1: Exporting from local database..." -ForegroundColor Yellow
Write-Host "   Source: $LocalDbHost:$LocalDbPort/$LocalDbName" -ForegroundColor Gray

$env:PGPASSWORD = $LocalDbPassword
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "migrations\backup"
$backupFile = "$backupDir\local_db_backup_$timestamp.custom"

# Create backup directory
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

# Export database
pg_dump -h $LocalDbHost -p $LocalDbPort -U $LocalDbUser -d $LocalDbName `
    --format=custom `
    --verbose `
    --no-owner `
    --no-acl `
    --file=$backupFile

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Export failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $backupFile)) {
    Write-Host "❌ Backup file was not created!" -ForegroundColor Red
    exit 1
}

$fileSize = (Get-Item $backupFile).Length / 1MB
Write-Host "✅ Backup created: $backupFile" -ForegroundColor Green
Write-Host "   Size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Gray
Write-Host ""

# Step 2: Verify backup
Write-Host "🔍 Step 2: Verifying backup contents..." -ForegroundColor Yellow
$backupContents = pg_restore --list $backupFile 2>&1
$objectCount = ($backupContents | Measure-Object -Line).Lines

if ($objectCount -eq 0) {
    Write-Host "⚠️  Warning: Backup appears to be empty" -ForegroundColor Yellow
} else {
    Write-Host "✅ Backup contains $objectCount objects" -ForegroundColor Green
}
Write-Host ""

# Step 3: Import
Write-Host "📥 Step 3: Importing to Vercel Postgres..." -ForegroundColor Yellow
Write-Host "   Destination: Vercel Postgres (db.prisma.io)" -ForegroundColor Gray
Write-Host "   ⚠️  Using NON-POOLING connection for import" -ForegroundColor Yellow
Write-Host ""

# Import database
pg_restore `
    --dbname=$VercelConnectionString `
    --verbose `
    --no-owner `
    --no-acl `
    --clean `
    --if-exists `
    $backupFile 2>&1 | ForEach-Object {
        if ($_ -match "ERROR" -or $_ -match "FATAL") {
            Write-Host $_ -ForegroundColor Red
        } else {
            Write-Host $_ -ForegroundColor Gray
        }
    }

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Import failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    Write-Host "   Check the errors above for details" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "✅ Import completed!" -ForegroundColor Green
Write-Host ""

# Step 4: Verify
Write-Host "🔍 Step 4: Verifying imported data..." -ForegroundColor Yellow

try {
    $tableCounts = psql $VercelConnectionString -t -A -c "
        SELECT 
            'shops: ' || COUNT(*)::text
        FROM shops
        UNION ALL
        SELECT 'products: ' || COUNT(*)::text FROM products
        UNION ALL
        SELECT 'variants: ' || COUNT(*)::text FROM variants
        UNION ALL
        SELECT 'demand_requests: ' || COUNT(*)::text FROM demand_requests
        UNION ALL
        SELECT 'recovery_links: ' || COUNT(*)::text FROM recovery_links
        UNION ALL
        SELECT 'order_attributions: ' || COUNT(*)::text FROM order_attributions
        UNION ALL
        SELECT 'shop_settings: ' || COUNT(*)::text FROM shop_settings
        UNION ALL
        SELECT 'shop_plans: ' || COUNT(*)::text FROM shop_plans;
    " 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "📊 Row counts:" -ForegroundColor Cyan
        $tableCounts | ForEach-Object {
            if ($_ -match "ERROR" -or $_ -match "FATAL") {
                Write-Host "   ⚠️  $_" -ForegroundColor Yellow
            } else {
                Write-Host "   $_" -ForegroundColor White
            }
        }
    } else {
        Write-Host "⚠️  Could not retrieve row counts (some tables may not exist)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Verification query failed: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "✅ Migration completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Verify data in Vercel Postgres dashboard" -ForegroundColor White
Write-Host "   2. Compare row counts with local database" -ForegroundColor White
Write-Host "   3. Test API endpoints with Vercel Postgres" -ForegroundColor White
Write-Host "   4. Run TypeORM migrations only if needed (schema changes)" -ForegroundColor White
Write-Host ""
Write-Host "💾 Backup saved: $backupFile" -ForegroundColor Gray
Write-Host "   Keep this backup as a safety measure!" -ForegroundColor Gray
Write-Host ""

