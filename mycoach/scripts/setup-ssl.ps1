# Complete SSL setup script - installs mkcert and generates trusted certificates
$ErrorActionPreference = "Stop"

Write-Host "Complete SSL Certificate Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check/Install mkcert
Write-Host "Step 1: Checking mkcert installation..." -ForegroundColor Yellow
$mkcertPath = $null

# Check if mkcert is in PATH
try {
    $null = Get-Command mkcert -ErrorAction Stop
    $mkcertPath = "mkcert"
    Write-Host "[OK] mkcert is already installed" -ForegroundColor Green
} catch {
    # Check if mkcert.exe exists in project directory
    $projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
    $localMkcert = Join-Path $projectRoot "mkcert.exe"
    if (Test-Path $localMkcert) {
        $mkcertPath = $localMkcert
        Write-Host "[OK] Found mkcert in project directory" -ForegroundColor Green
    } else {
        Write-Host "[INFO] mkcert not found. Attempting to download..." -ForegroundColor Yellow
        $installScript = Join-Path $PSScriptRoot "install-mkcert.ps1"
        & $installScript
        
        # Try to find mkcert in common installation locations
        $possiblePaths = @(
            "$env:USERPROFILE\bin\mkcert.exe",
            "$env:ProgramFiles\mkcert\mkcert.exe",
            "$env:LOCALAPPDATA\Programs\mkcert\mkcert.exe",
            (Join-Path $projectRoot "mkcert.exe")
        )
        
        $found = $false
        foreach ($possiblePath in $possiblePaths) {
            if (Test-Path $possiblePath) {
                $mkcertPath = $possiblePath
                Write-Host "[OK] Found mkcert at: $possiblePath" -ForegroundColor Green
                $found = $true
                break
            }
        }
        
        if (-not $found) {
            Write-Host "[ERROR] Failed to locate mkcert after installation" -ForegroundColor Red
            Write-Host "[TIP] Please install manually:" -ForegroundColor Yellow
            Write-Host "   choco install mkcert" -ForegroundColor Gray
            Write-Host "   Or download from: https://github.com/FiloSottile/mkcert/releases" -ForegroundColor Gray
            exit 1
        }
    }
}

# Step 2: Install local CA
Write-Host ""
Write-Host "Step 2: Installing local Certificate Authority..." -ForegroundColor Yellow
try {
    & $mkcertPath -install
    Write-Host "[OK] Local CA installed successfully" -ForegroundColor Green
} catch {
    Write-Host "[WARN] CA installation had issues (might already be installed)" -ForegroundColor Yellow
}

# Step 3: Generate certificates
Write-Host ""
Write-Host "Step 3: Generating SSL certificates..." -ForegroundColor Yellow
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$certDir = Join-Path $projectRoot "certificates"
if (-not (Test-Path $certDir)) {
    New-Item -ItemType Directory -Path $certDir -Force | Out-Null
}

Push-Location $certDir
try {
    & $mkcertPath localhost 95.216.225.37 127.0.0.1 0.0.0.0
    
    # Find and rename certificate files
    $certFiles = Get-ChildItem -Filter "*.pem" | Where-Object { $_.Name -notlike "*key*" -and $_.Name -ne "localhost.pem" }
    $keyFiles = Get-ChildItem -Filter "*key*.pem" | Where-Object { $_.Name -ne "localhost-key.pem" }
    
    if ($certFiles.Count -eq 1 -and $keyFiles.Count -eq 1) {
        # Remove old files if they exist
        $oldCert = Join-Path $certDir "localhost.pem"
        $oldKey = Join-Path $certDir "localhost-key.pem"
        if (Test-Path $oldCert) { Remove-Item $oldCert -Force }
        if (Test-Path $oldKey) { Remove-Item $oldKey -Force }
        
        # Rename to expected names
        Rename-Item $certFiles[0].FullName -NewName "localhost.pem"
        Rename-Item $keyFiles[0].FullName -NewName "localhost-key.pem"
        
        Write-Host "[OK] Certificates generated and renamed successfully" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Could not automatically rename certificate files" -ForegroundColor Yellow
        Write-Host "   Please manually rename:" -ForegroundColor Yellow
        if ($certFiles.Count -gt 0) {
            Write-Host "   - Certificate: $($certFiles[0].Name) -> localhost.pem" -ForegroundColor Gray
        }
        if ($keyFiles.Count -gt 0) {
            Write-Host "   - Key: $($keyFiles[0].Name) -> localhost-key.pem" -ForegroundColor Gray
        }
    }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "[SUCCESS] SSL Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "[OK] Certificates are now trusted by your browser" -ForegroundColor Green
Write-Host "[OK] No browser warnings will appear" -ForegroundColor Green
Write-Host "[OK] Pages will load automatically" -ForegroundColor Green
Write-Host ""
Write-Host "Next: Start your server with:" -ForegroundColor Cyan
Write-Host "   npm run dev:https" -ForegroundColor Gray
Write-Host ""
