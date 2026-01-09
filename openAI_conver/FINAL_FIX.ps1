# Final Fix Script - Run as Administrator
# This will verify and fix everything

Write-Host "🔒 FINAL FIX: Removing Browser Warning" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan

# Step 1: Verify mkcert is installed
Write-Host "Step 1: Checking mkcert installation..." -ForegroundColor Yellow
try {
    $null = Get-Command mkcert -ErrorAction Stop
    Write-Host "✅ mkcert is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ mkcert is NOT installed!" -ForegroundColor Red
    Write-Host "   Install with: choco install mkcert" -ForegroundColor Yellow
    exit 1
}

# Step 2: Install/reinstall mkcert CA
Write-Host "`nStep 2: Installing mkcert CA (this makes browser trust certificates)..." -ForegroundColor Yellow
try {
    mkcert -install | Out-Null
    Write-Host "✅ mkcert CA installed successfully" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Warning: mkcert -install failed (may already be installed)" -ForegroundColor Yellow
}

# Step 3: Verify certificates exist
Write-Host "`nStep 3: Checking certificate files..." -ForegroundColor Yellow
$certDir = "C:\Users\Administrator\Pictures\10X Dashboard\openAI_conver\certificates"
$keyPath = Join-Path $certDir "localhost-key.pem"
$certPath = Join-Path $certDir "localhost.pem"

if (Test-Path $keyPath) {
    Write-Host "✅ Key file exists: $keyPath" -ForegroundColor Green
} else {
    Write-Host "❌ Key file NOT found: $keyPath" -ForegroundColor Red
    Write-Host "   Generating certificates..." -ForegroundColor Yellow
    Set-Location $certDir
    mkcert localhost 95.216.225.37 127.0.0.1 0.0.0.0 | Out-Null
    $certFile = Get-ChildItem -Filter "*.pem" | Where-Object { $_.Name -notlike "*-key.pem" } | Select-Object -First 1
    $keyFile = Get-ChildItem -Filter "*-key.pem" | Select-Object -First 1
    if ($certFile) { Rename-Item $certFile.Name "localhost.pem" -Force }
    if ($keyFile) { Rename-Item $keyFile.Name "localhost-key.pem" -Force }
    Write-Host "✅ Certificates generated" -ForegroundColor Green
}

if (Test-Path $certPath) {
    Write-Host "✅ Certificate file exists: $certPath" -ForegroundColor Green
} else {
    Write-Host "❌ Certificate file NOT found: $certPath" -ForegroundColor Red
    exit 1
}

# Step 4: Verify Windows Certificate Store
Write-Host "`nStep 4: Verifying mkcert CA in Windows Certificate Store..." -ForegroundColor Yellow
$certStore = certutil -store -user Root 2>&1 | Select-String -Pattern "mkcert"
if ($certStore) {
    Write-Host "✅ mkcert CA found in certificate store" -ForegroundColor Green
} else {
    Write-Host "⚠️  mkcert CA not found in certificate store" -ForegroundColor Yellow
    Write-Host "   Re-running mkcert -install..." -ForegroundColor Yellow
    mkcert -install | Out-Null
}

# Step 5: Summary
Write-Host "`n" -NoNewline
Write-Host "======================================`n" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!`n" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. RESTART your server completely (stop with Ctrl+C, then start again)" -ForegroundColor White
Write-Host "2. When server starts, check console - it should say:" -ForegroundColor White
Write-Host "   '✅ Using valid SSL certificates from certificates/ directory'" -ForegroundColor Green
Write-Host "3. Close ALL browser windows" -ForegroundColor White
Write-Host "4. Open a NEW incognito/private window" -ForegroundColor White
Write-Host "5. Go to: https://95.216.225.37:5000" -ForegroundColor White
Write-Host "`n✅ The warning should be GONE!`n" -ForegroundColor Green

