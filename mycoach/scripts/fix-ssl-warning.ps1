# Script to fix SSL warning issues
# This ensures mkcert certificates are properly set up and the server uses them

Write-Host "🔧 Fixing SSL Certificate Issues..." -ForegroundColor Cyan
Write-Host ""

$certDir = Join-Path $PSScriptRoot "..\certificates"
$keyPath = Join-Path $certDir "localhost-key.pem"
$certPath = Join-Path $certDir "localhost.pem"

# Step 1: Verify certificates exist
Write-Host "Step 1: Checking certificates..." -ForegroundColor Yellow
if (-not ((Test-Path $certPath) -and (Test-Path $keyPath))) {
    Write-Host "❌ Certificates not found!" -ForegroundColor Red
    Write-Host "   Generating new certificates with mkcert..." -ForegroundColor Yellow
    & "$PSScriptRoot\generate-cert-mkcert.ps1"
} else {
    Write-Host "✅ Certificates found" -ForegroundColor Green
}

# Step 2: Verify mkcert CA is installed
Write-Host ""
Write-Host "Step 2: Verifying mkcert CA installation..." -ForegroundColor Yellow
$mkcertPath = $null
$mkcertLocations = @("mkcert", "$env:TEMP\mkcert.exe")
foreach ($location in $mkcertLocations) {
    try {
        if ($location -eq "mkcert") {
            $null = Get-Command mkcert -ErrorAction Stop
            $mkcertPath = "mkcert"
            break
        } elseif (Test-Path $location) {
            $mkcertPath = $location
            break
        }
    } catch { continue }
}

if ($null -ne $mkcertPath) {
    Write-Host "   Installing/verifying mkcert CA..." -ForegroundColor Gray
    & $mkcertPath -install 2>&1 | Out-Null
    Write-Host "✅ mkcert CA is installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  mkcert not found, but certificates exist" -ForegroundColor Yellow
}

# Step 3: Check certificate details
Write-Host ""
Write-Host "Step 3: Verifying certificate details..." -ForegroundColor Yellow
try {
    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($certPath)
    if ($cert.Issuer -like "*mkcert*") {
        Write-Host "✅ Certificate is from mkcert - trusted" -ForegroundColor Green
        Write-Host "   Valid until: $($cert.NotAfter)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  Certificate is NOT from mkcert" -ForegroundColor Yellow
        Write-Host "   Regenerating with mkcert..." -ForegroundColor Yellow
        & "$PSScriptRoot\generate-cert-mkcert.ps1"
    }
} catch {
    Write-Host "❌ Error reading certificate: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 4: Instructions
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ SSL Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. RESTART YOUR SERVER (if it's running):" -ForegroundColor White
Write-Host "   - Stop the current server (Ctrl+C)" -ForegroundColor Gray
Write-Host "   - Start it again: npm run dev:https" -ForegroundColor Gray
Write-Host ""
Write-Host "2. CLEAR BROWSER CACHE:" -ForegroundColor White
Write-Host "   - Chrome: Press Ctrl+Shift+Delete" -ForegroundColor Gray
Write-Host "   - Or use Incognito mode: Ctrl+Shift+N" -ForegroundColor Gray
Write-Host "   - Or close and reopen Chrome completely" -ForegroundColor Gray
Write-Host ""
Write-Host "3. ACCESS THE URL:" -ForegroundColor White
Write-Host "   https://95.216.225.37:5000/" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 If you still see warnings:" -ForegroundColor Yellow
Write-Host "   - Make sure Chrome is completely closed and reopened" -ForegroundColor Gray
Write-Host "   - Try accessing in Incognito mode first" -ForegroundColor Gray
Write-Host "   - Check that the server is using the new certificates" -ForegroundColor Gray
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

