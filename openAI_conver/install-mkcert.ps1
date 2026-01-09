# PowerShell script to install mkcert and set up SSL certificates
# Run this script as Administrator

Write-Host "🔒 SSL Certificate Setup for openAI_conver" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ This script requires Administrator privileges!" -ForegroundColor Red
    Write-Host "   Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Check if mkcert is installed
Write-Host "Checking if mkcert is installed..." -ForegroundColor Yellow
$mkcertInstalled = $false
try {
    $null = Get-Command mkcert -ErrorAction Stop
    $mkcertInstalled = $true
    Write-Host "✅ mkcert is already installed" -ForegroundColor Green
} catch {
    Write-Host "❌ mkcert is not installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Installing mkcert..." -ForegroundColor Yellow
    
    # Try to install via Chocolatey
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        Write-Host "Installing via Chocolatey..." -ForegroundColor Yellow
        choco install mkcert -y
    } else {
        Write-Host "❌ Chocolatey not found. Please install mkcert manually:" -ForegroundColor Red
        Write-Host "   1. Download from: https://github.com/FiloSottile/mkcert/releases/latest" -ForegroundColor Yellow
        Write-Host "   2. Extract mkcert.exe" -ForegroundColor Yellow
        Write-Host "   3. Add to PATH or place in a folder in your PATH" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Or install Chocolatey first: https://chocolatey.org/install" -ForegroundColor Yellow
        exit 1
    }
}

# Verify mkcert is now available
try {
    $null = Get-Command mkcert -ErrorAction Stop
    Write-Host "✅ mkcert installed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ mkcert installation failed. Please install manually." -ForegroundColor Red
    exit 1
}

# Install local CA
Write-Host ""
Write-Host "Installing local CA..." -ForegroundColor Yellow
try {
    mkcert -install
    Write-Host "✅ Local CA installed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install local CA" -ForegroundColor Red
    exit 1
}

# Create certificates directory
$certDir = Join-Path $PSScriptRoot "certificates"
if (-not (Test-Path $certDir)) {
    New-Item -ItemType Directory -Path $certDir | Out-Null
    Write-Host "✅ Created certificates directory" -ForegroundColor Green
}

# Generate certificates
Write-Host ""
Write-Host "Generating SSL certificates..." -ForegroundColor Yellow
$serverHost = "95.216.225.37"
Set-Location $certDir
try {
    mkcert localhost $serverHost 127.0.0.1 0.0.0.0
    
    # Find and rename certificate files
    $certFile = Get-ChildItem -Filter "*.pem" | Where-Object { $_.Name -notlike "*-key.pem" } | Select-Object -First 1
    $keyFile = Get-ChildItem -Filter "*-key.pem" | Select-Object -First 1
    
    if ($certFile -and $keyFile) {
        if ($certFile.Name -ne "localhost.pem") {
            Rename-Item -Path $certFile.Name -NewName "localhost.pem"
            Write-Host "✅ Renamed certificate file" -ForegroundColor Green
        }
        if ($keyFile.Name -ne "localhost-key.pem") {
            Rename-Item -Path $keyFile.Name -NewName "localhost-key.pem"
            Write-Host "✅ Renamed key file" -ForegroundColor Green
        }
        
        Write-Host ""
        Write-Host "✅ SSL certificates generated successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📍 Certificate files:" -ForegroundColor Cyan
        Write-Host "   - $($certDir)\localhost.pem" -ForegroundColor White
        Write-Host "   - $($certDir)\localhost-key.pem" -ForegroundColor White
        Write-Host ""
        Write-Host "🎉 Setup complete! Restart your server and the browser warning will be gone!" -ForegroundColor Green
        Write-Host ""
        Write-Host "✅ Your server will automatically use these certificates." -ForegroundColor Green
        Write-Host "✅ No more 'Your connection is not private' warning!" -ForegroundColor Green
    } else {
        Write-Host "❌ Certificate files not found after generation" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Failed to generate certificates: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Set-Location $PSScriptRoot
}

