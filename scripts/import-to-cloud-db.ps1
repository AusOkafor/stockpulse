# PowerShell script to import database backup to cloud database
# Run this after you get your cloud database connection string

param(
    [Parameter(Mandatory=$true)]
    [string]$DatabaseUrl,
    
    [Parameter(Mandatory=$true)]
    [string]$BackupFile
)

Write-Host "Importing database backup to cloud database..." -ForegroundColor Cyan
Write-Host "Backup file: $BackupFile" -ForegroundColor Yellow
Write-Host "Target: $DatabaseUrl" -ForegroundColor Yellow

# Parse DATABASE_URL to extract components
$uri = [System.Uri]$DatabaseUrl
$host = $uri.Host
$port = if ($uri.Port -ne -1) { $uri.Port } else { 5432 }
$database = $uri.AbsolutePath.TrimStart('/')
$username = $uri.UserInfo.Split(':')[0]
$password = $uri.UserInfo.Split(':')[1]

Write-Host "Connecting to: $host:$port/$database" -ForegroundColor Cyan

# Set password for psql
$env:PGPASSWORD = $password

# Import using psql
psql -h $host -p $port -U $username -d $database -f $BackupFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database imported successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Import failed. Check:" -ForegroundColor Red
    Write-Host "  1. Database URL is correct" -ForegroundColor Yellow
    Write-Host "  2. Database is accessible from your IP" -ForegroundColor Yellow
    Write-Host "  3. Backup file exists: $BackupFile" -ForegroundColor Yellow
}

