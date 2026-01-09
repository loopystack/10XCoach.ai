# PowerShell script to download and install mkcert on Windows
$ErrorActionPreference = "Stop"

Write-Host "Installing mkcert for Windows..." -ForegroundColor Cyan

# Check if mkcert is already installed
try {
    $null = Get-Command mkcert -ErrorAction Stop
    Write-Host "[OK] mkcert is already installed!" -ForegroundColor Green
    mkcert -version
    exit 0
} catch {
    Write-Host "[INFO] mkcert not found, downloading..." -ForegroundColor Yellow
}

# Create temp directory
$tempDir = Join-Path $env:TEMP "mkcert-install"
if (-not (Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
}

# Download mkcert
$mkcertUrl = "https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-windows-amd64.exe"
$mkcertExe = Join-Path $tempDir "mkcert.exe"

Write-Host "Downloading mkcert from GitHub..." -ForegroundColor Cyan
try {
    Invoke-WebRequest -Uri $mkcertUrl -OutFile $mkcertExe -UseBasicParsing
    Write-Host "[OK] Downloaded mkcert" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to download mkcert: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "[TIP] Please download manually from: https://github.com/FiloSottile/mkcert/releases" -ForegroundColor Yellow
    exit 1
}

# Try to install to a location in PATH
$installPaths = @(
    "$env:USERPROFILE\bin",
    "$env:ProgramFiles\mkcert",
    "$env:LOCALAPPDATA\Programs\mkcert"
)

$installed = $false
foreach ($installPath in $installPaths) {
    try {
        if (-not (Test-Path $installPath)) {
            New-Item -ItemType Directory -Path $installPath -Force | Out-Null
        }
        
        $targetPath = Join-Path $installPath "mkcert.exe"
        Copy-Item $mkcertExe -Destination $targetPath -Force
        
        # Add to PATH if not already there
        $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
        if ($currentPath -notlike "*$installPath*") {
            [Environment]::SetEnvironmentVariable("Path", "$currentPath;$installPath", "User")
            Write-Host "[OK] Added $installPath to PATH" -ForegroundColor Green
        }
        
        Write-Host "[OK] mkcert installed to: $targetPath" -ForegroundColor Green
        $installed = $true
        break
    } catch {
        continue
    }
}

if (-not $installed) {
    # Fallback: copy to project root
    $projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
    $localPath = Join-Path $projectRoot "mkcert.exe"
    Copy-Item $mkcertExe -Destination $localPath -Force
    Write-Host "[OK] mkcert copied to: $localPath" -ForegroundColor Green
    Write-Host "[WARN] Note: You may need to add this directory to your PATH" -ForegroundColor Yellow
}

# Clean up
Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "[SUCCESS] mkcert installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Close and reopen PowerShell/terminal" -ForegroundColor Gray
Write-Host "2. Run: mkcert -install" -ForegroundColor Gray
Write-Host "3. Run: npm run generate-cert-mkcert" -ForegroundColor Gray
Write-Host "4. Run: npm run dev:https" -ForegroundColor Gray
Write-Host ""
