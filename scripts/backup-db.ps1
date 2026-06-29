param(
  [string]$Container = "real-business-suite-postgres-1",
  [string]$Database = "real_business_suite",
  [string]$User = "rbs",
  [string]$OutputDir = "backups"
)

$ErrorActionPreference = "Stop"

if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker is required for this backup helper."
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$workspace = Resolve-Path "."
$backupDir = Join-Path $workspace $OutputDir
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$backupFile = Join-Path $backupDir "$Database-$timestamp.sql"

Write-Host "Creating PostgreSQL backup from container $Container..."
docker exec $Container pg_dump -U $User -d $Database --clean --if-exists --no-owner --no-privileges | Set-Content -Encoding UTF8 $backupFile

if (!(Test-Path $backupFile) -or ((Get-Item $backupFile).Length -le 0)) {
  throw "Backup failed or produced an empty file."
}

Write-Host "Backup created: $backupFile"
