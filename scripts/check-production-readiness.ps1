param(
  [string]$EnvFile = ".env",
  [string]$ApiUrl = "",
  [string]$WebUrl = ""
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$envPath = Join-Path $root $EnvFile
$checks = New-Object System.Collections.Generic.List[object]

function Add-Check {
  param(
    [string]$Name,
    [bool]$Pass,
    [string]$Message
  )

  $checks.Add([pscustomobject]@{
    Name = $Name
    Pass = $Pass
    Message = $Message
  })
}

function Load-EnvFile {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    Add-Check "Environment file" $false "Could not find $Path."
    return
  }

  Get-Content -LiteralPath $Path | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#") -or $line -notmatch "=") {
      return
    }

    $name, $value = $line -split "=", 2
    $name = $name.Trim()
    $value = $value.Trim().Trim('"').Trim("'")
    if ($name) {
      [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
  }

  Add-Check "Environment file" $true "Loaded $Path."
}

function Has-Value {
  param([string]$Value)
  return -not [string]::IsNullOrWhiteSpace($Value)
}

function Is-Strong-Secret {
  param([string]$Value)
  if (-not (Has-Value $Value)) { return $false }
  $lower = $Value.ToLowerInvariant()
  return $Value.Length -ge 32 -and
    -not $lower.Contains("change-me") -and
    -not $lower.Contains("development") -and
    -not $lower.Contains("secret")
}

function Is-Https-Url {
  param([string]$Value)
  if (-not (Has-Value $Value)) { return $false }
  try {
    $uri = [Uri]$Value
    return $uri.Scheme -eq "https"
  } catch {
    return $false
  }
}

function Test-HttpEndpoint {
  param(
    [string]$Name,
    [string]$Url
  )

  if (-not (Has-Value $Url)) {
    Add-Check $Name $false "No URL provided."
    return
  }

  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 20
    Add-Check $Name ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) "HTTP $($response.StatusCode) from $Url."
  } catch {
    Add-Check $Name $false $_.Exception.Message
  }
}

Load-EnvFile $envPath

Add-Check "DATABASE_URL" (Has-Value $env:DATABASE_URL) "Production database connection string is required."
Add-Check "JWT_SECRET" (Is-Strong-Secret $env:JWT_SECRET) "Use at least 32 random characters and avoid placeholder words."
Add-Check "WEB_URL" (Is-Https-Url $env:WEB_URL) "Production WEB_URL should be an https:// URL."
Add-Check "NEXT_PUBLIC_API_URL" (Is-Https-Url $env:NEXT_PUBLIC_API_URL) "Production web app should call an https:// API URL ending in /api."

$emailDryRunValue = ""
if ($env:EMAIL_DRY_RUN) {
  $emailDryRunValue = $env:EMAIL_DRY_RUN
}
$emailDryRun = $emailDryRunValue.ToLowerInvariant() -eq "true"
if ($emailDryRun) {
  Add-Check "Email mode" $true "EMAIL_DRY_RUN=true, safe for private pilot."
} else {
  Add-Check "RESEND_API_KEY" (Has-Value $env:RESEND_API_KEY) "Required when EMAIL_DRY_RUN is false."
  Add-Check "EMAIL_FROM" (Has-Value $env:EMAIL_FROM) "Required when EMAIL_DRY_RUN is false."
}

if ((Has-Value $env:STRIPE_SECRET_KEY) -or (Has-Value $env:STRIPE_WEBHOOK_SECRET)) {
  Add-Check "Stripe config" ((Has-Value $env:STRIPE_SECRET_KEY) -and (Has-Value $env:STRIPE_WEBHOOK_SECRET)) "Set both Stripe secret and webhook secret, or leave both blank for Free plan pilot."
} else {
  Add-Check "Stripe config" $true "Blank, which is okay for Free plan/private pilot."
}

if (Has-Value $ApiUrl) {
  $healthUrl = $ApiUrl.TrimEnd("/")
  if (-not $healthUrl.EndsWith("/api/health")) {
    $healthUrl = "$healthUrl/api/health"
  }
  Test-HttpEndpoint "API health endpoint" $healthUrl
}

if (Has-Value $WebUrl) {
  Test-HttpEndpoint "Web app endpoint" $WebUrl
}

$failed = $checks | Where-Object { -not $_.Pass }

foreach ($check in $checks) {
  $prefix = if ($check.Pass) { "[PASS]" } else { "[FAIL]" }
  Write-Host "$prefix $($check.Name): $($check.Message)"
}

if ($failed.Count -gt 0) {
  Write-Host ""
  Write-Host "Production readiness: NOT READY ($($failed.Count) issue(s) found)."
  exit 1
}

Write-Host ""
Write-Host "Production readiness: READY for private pilot checks."
