param(
  [string]$ApiUrl = "http://localhost:4000/api",
  [string]$WebUrl = "http://localhost:3000",
  [int]$TimeoutSec = 15
)

$ErrorActionPreference = "Stop"
$checks = @()

function Add-Check {
  param(
    [string]$Name,
    [string]$Url,
    [int[]]$ExpectedStatus = @(200)
  )

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec $TimeoutSec
    $ok = $ExpectedStatus -contains [int]$response.StatusCode
    $script:checks += [pscustomobject]@{
      Name = $Name
      Url = $Url
      Status = [int]$response.StatusCode
      Result = if ($ok) { "PASS" } else { "FAIL" }
      Detail = if ($ok) { "Expected response received." } else { "Expected $($ExpectedStatus -join ', ') but got $($response.StatusCode)." }
    }
  } catch {
    $script:checks += [pscustomobject]@{
      Name = $Name
      Url = $Url
      Status = "-"
      Result = "FAIL"
      Detail = $_.Exception.Message
    }
  }
}

$api = $ApiUrl.TrimEnd("/")
$web = $WebUrl.TrimEnd("/")

Add-Check -Name "API health" -Url "$api/health"
Add-Check -Name "Web dashboard route" -Url "$web/dashboard"
Add-Check -Name "Login page" -Url "$web/login"
Add-Check -Name "Register page" -Url "$web/register"
Add-Check -Name "Pricing page" -Url "$web/pricing"
Add-Check -Name "Forgot password page" -Url "$web/forgot-password"
Add-Check -Name "Reset password page" -Url "$web/reset-password"
Add-Check -Name "Terms page" -Url "$web/terms"
Add-Check -Name "Privacy page" -Url "$web/privacy"
Add-Check -Name "Support page" -Url "$web/support"

$checks | Format-Table -AutoSize

$failed = @($checks | Where-Object { $_.Result -ne "PASS" })
if ($failed.Count -gt 0) {
  Write-Host ""
  Write-Host "Smoke test failed: $($failed.Count) check(s) need attention." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "Smoke test passed: local API and web routes are responding." -ForegroundColor Green
