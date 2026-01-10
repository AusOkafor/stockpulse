# PowerShell script to export local PostgreSQL database
# Run this from backend/ directory

# Set your local database connection details
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_NAME = "crypto"
$DB_USER = "user"  # Change to your PostgreSQL username
$DB_PASSWORD = "okwy@1986"  # Your password

# Output file
$OUTPUT_FILE = "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"

Write-Host "Exporting database '$DB_NAME' to $OUTPUT_FILE..." -ForegroundColor Cyan

# Export database
$env:PGPASSWORD = $DB_PASSWORD
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -F c -f $OUTPUT_FILE

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database exported successfully to: $OUTPUT_FILE" -ForegroundColor Green
    Write-Host "File size: $((Get-Item $OUTPUT_FILE).Length / 1MB) MB" -ForegroundColor Green
} else {
    Write-Host "❌ Export failed. Make sure:" -ForegroundColor Red
    Write-Host "  1. PostgreSQL is running" -ForegroundColor Yellow
    Write-Host "  2. pg_dump is installed (comes with PostgreSQL)" -ForegroundColor Yellow
    Write-Host "  3. Database credentials are correct" -ForegroundColor Yellow
}

