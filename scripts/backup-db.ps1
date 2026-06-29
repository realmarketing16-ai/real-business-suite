param(
  [string]$Container = "real-business-suite-postgres-1",
  [string]$Database = "real_business_suite",
  [string]$User = "rbs",
  [string]$OutputDir = "backups"
)

$ErrorActionPreference = "Stop"

function Assert-DockerContainerRunning {
  param([string]$Name)

  if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker is required for this backup helper."
  }

  $running = docker inspect -f "{{.State.Running}}" $Name 2>$null
  if ($LASTEXITCODE -ne 0 -or $running -ne "true") {
    throw "Docker container '$Name' is not running. Start the database container before backup."
  }
}

Assert-DockerContainerRunning -Name $Container

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$workspace = (Resolve-Path ".").Path
$backupDir = Join-Path $workspace $OutputDir
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$backupFile = Join-Path $backupDir "$Database-$timestamp.sql"
$checksumFile = "$backupFile.sha256"

Write-Host "Creating PostgreSQL backup from container '$Container'..."
docker exec $Container pg_dump -U $User -d $Database --clean --if-exists --no-owner --no-privileges | Set-Content -Encoding UTF8 $backupFile

if (!(Test-Path $backupFile) -or ((Get-Item $backupFile).Length -le 0)) {
  throw "Backup failed or produced an empty file."
}

$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $backupFile).Hash
Set-Content -Encoding UTF8 -LiteralPath $checksumFile -Value $hash

Write-Host "Backup created: $backupFile"
Write-Host "SHA256: $hash"
Write-Host "Checksum file: $checksumFile"
