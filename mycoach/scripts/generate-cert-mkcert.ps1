# PowerShell script to generate SSL certificates using mkcert
# This creates locally trusted certificates that browsers won't warn about

$certDir = Join-Path $PSScriptRoot "..\certificates"
$keyPath = Join-Path $certDir "localhost-key.pem"
$certPath = Join-Path $certDir "localhost.pem"
$ipAddress = "95.216.225.37"

# Create certificates directory if it doesn't exist
if (-not (Test-Path $certDir)) {
    New-Item -ItemType Directory -Path $certDir -Force | Out-Null
    Write-Host "✅ Created certificates directory" -ForegroundColor Green
}

# Check if mkcert is available
$mkcertPath = $null
$mkcertLocations = @(
    "mkcert",
    "$env:TEMP\mkcert.exe",
    "$env:LOCALAPPDATA\mkcert\mkcert.exe",
    "C:\Program Files\mkcert\mkcert.exe"
)

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
    } catch {
        continue
    }
}

if ($null -eq $mkcertPath) {
    Write-Host "❌ mkcert not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 To install mkcert:" -ForegroundColor Yellow
    Write-Host "   1. Download from: https://github.com/FiloSottile/mkcert/releases/latest" -ForegroundColor Gray
    Write-Host "   2. Or use: winget install FiloSottile.mkcert" -ForegroundColor Gray
    Write-Host "   3. Or use: choco install mkcert" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   After installing, run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "🔑 Generating trusted SSL certificates using mkcert..." -ForegroundColor Cyan

try {
    # Install local CA if not already installed
    Write-Host "📋 Checking local CA installation..." -ForegroundColor Cyan
    & $mkcertPath -install 2>&1 | Out-Null
    
    # Generate certificates
    Write-Host "📜 Generating certificates for localhost, $ipAddress, 127.0.0.1, and 0.0.0.0..." -ForegroundColor Cyan
    & $mkcertPath -key-file $keyPath -cert-file $certPath localhost $ipAddress 127.0.0.1 0.0.0.0
    
    if ((Test-Path $certPath) -and (Test-Path $keyPath)) {
        Write-Host ""
        Write-Host "✅ Trusted certificates generated successfully!" -ForegroundColor Green
        Write-Host "   Private Key: $keyPath" -ForegroundColor Gray
        Write-Host "   Certificate: $certPath" -ForegroundColor Gray
        Write-Host ""
        Write-Host "🎉 These certificates are trusted by your browser!" -ForegroundColor Green
        Write-Host "   No more security warnings when accessing https://95.216.225.37:5000/" -ForegroundColor Gray
        Write-Host ""
        Write-Host "💡 To use these certificates, restart your server:" -ForegroundColor Cyan
        Write-Host "   npm run dev:https" -ForegroundColor Gray
    } else {
        Write-Host "❌ Certificate files were not created" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ Error generating certificates: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Make sure mkcert is properly installed and you have admin privileges" -ForegroundColor Yellow
    exit 1
}

