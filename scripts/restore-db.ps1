param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile,
  [string]$Container = "real-business-suite-postgres-1",
  [string]$Database = "real_business_suite",
  [string]$User = "rbs"
)

$ErrorActionPreference = "Stop"

if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker is required for this restore helper."
}

$resolved = Resolve-Path $BackupFile
if (!(Test-Path $resolved)) {
  throw "Backup file not found: $BackupFile"
}

Write-Host "Restoring $resolved into $Database on container $Container..."
Get-Content -Raw $resolved | docker exec -i $Container psql -U $User -d $Database
Write-Host "Restore completed."
