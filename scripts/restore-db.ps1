param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile,
  [string]$Container = "real-business-suite-postgres-1",
  [string]$Database = "real_business_suite",
  [string]$User = "rbs",
  [string]$ExpectedSha256 = "",
  [switch]$Force
)

$ErrorActionPreference = "Stop"

function Assert-DockerContainerRunning {
  param([string]$Name)

  if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker is required for this restore helper."
  }

  $running = docker inspect -f "{{.State.Running}}" $Name 2>$null
  if ($LASTEXITCODE -ne 0 -or $running -ne "true") {
    throw "Docker container '$Name' is not running. Start the database container before restore."
  }
}

$resolved = (Resolve-Path -LiteralPath $BackupFile).Path
if (!(Test-Path -LiteralPath $resolved)) {
  throw "Backup file not found: $BackupFile"
}

if ((Get-Item -LiteralPath $resolved).Length -le 0) {
  throw "Backup file is empty: $resolved"
}

if ($ExpectedSha256) {
  $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $resolved).Hash
  if ($actual -ne $ExpectedSha256) {
    throw "Backup checksum mismatch. Expected $ExpectedSha256 but found $actual."
  }
  Write-Host "Checksum verified: $actual"
}

Assert-DockerContainerRunning -Name $Container

if (!$Force) {
  Write-Host "WARNING: This will restore '$resolved' into database '$Database' on container '$Container'."
  Write-Host "Existing records may be replaced depending on the backup contents."
  $confirmation = Read-Host "Type RESTORE to continue"
  if ($confirmation -ne "RESTORE") {
    throw "Restore cancelled."
  }
}

Write-Host "Restoring $resolved into $Database on container $Container..."
Get-Content -Raw -LiteralPath $resolved | docker exec -i $Container psql -U $User -d $Database
Write-Host "Restore completed."
