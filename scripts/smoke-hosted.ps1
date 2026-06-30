param(
  [Parameter(Mandatory = $true)]
  [string]$ApiUrl,

  [Parameter(Mandatory = $true)]
  [string]$WebUrl,

  [int]$TimeoutSec = 25
)

$ErrorActionPreference = "Stop"
$smokeLocal = Join-Path $PSScriptRoot "smoke-local.ps1"

if (-not $ApiUrl.StartsWith("https://")) {
  Write-Host "Hosted API URL should use https://." -ForegroundColor Red
  exit 1
}

if (-not $WebUrl.StartsWith("https://")) {
  Write-Host "Hosted web URL should use https://." -ForegroundColor Red
  exit 1
}

Write-Host "Running hosted smoke test..." -ForegroundColor Cyan
Write-Host "API: $ApiUrl"
Write-Host "Web: $WebUrl"
Write-Host ""

& powershell -ExecutionPolicy Bypass -File $smokeLocal -ApiUrl $ApiUrl -WebUrl $WebUrl -TimeoutSec $TimeoutSec
