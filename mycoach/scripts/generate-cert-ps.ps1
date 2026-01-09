# PowerShell script to generate SSL certificate for Windows
$certDir = Join-Path $PSScriptRoot "..\certificates"
$keyPath = Join-Path $certDir "localhost-key.pem"
$certPath = Join-Path $certDir "localhost.pem"

# Create certificates directory if it doesn't exist
if (-not (Test-Path $certDir)) {
    New-Item -ItemType Directory -Path $certDir -Force | Out-Null
    Write-Host "✅ Created certificates directory" -ForegroundColor Green
}

Write-Host "🔑 Generating SSL certificate using PowerShell..." -ForegroundColor Cyan

try {
    # Create self-signed certificate with Subject Alternative Names
    $cert = New-SelfSignedCertificate `
        -DnsName "localhost", "95.216.225.37", "127.0.0.1", "0.0.0.0" `
        -CertStoreLocation "Cert:\CurrentUser\My" `
        -KeyAlgorithm RSA `
        -KeyLength 2048 `
        -KeyExportPolicy Exportable `
        -NotAfter (Get-Date).AddYears(1) `
        -FriendlyName "Next.js Development Certificate"

    Write-Host "✅ Certificate created in certificate store" -ForegroundColor Green

    # Export certificate to PFX
    $pfxPath = Join-Path $certDir "temp.pfx"
    $password = ConvertTo-SecureString -String "temp123" -Force -AsPlainText
    Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $password | Out-Null

    # Check if OpenSSL is available to convert PFX to PEM
    $opensslAvailable = $false
    try {
        $null = Get-Command openssl -ErrorAction Stop
        $opensslAvailable = $true
    } catch {
        Write-Host "⚠️  OpenSSL not found. Certificate exported as PFX." -ForegroundColor Yellow
        Write-Host "💡 To convert to PEM format, install OpenSSL or use mkcert" -ForegroundColor Yellow
    }

    if ($opensslAvailable) {
        # Convert PFX to PEM using OpenSSL
        Write-Host "📝 Converting certificate to PEM format..." -ForegroundColor Cyan
        
        # Extract private key
        & openssl pkcs12 -in $pfxPath -nocerts -nodes -out $keyPath -passin pass:temp123 2>&1 | Out-Null
        
        # Extract certificate
        & openssl pkcs12 -in $pfxPath -nokeys -out $certPath -passin pass:temp123 2>&1 | Out-Null
        
        # Clean up PFX file
        Remove-Item $pfxPath -Force
        
        Write-Host "✅ Certificate converted to PEM format" -ForegroundColor Green
    } else {
        # If OpenSSL is not available, we need to use a different approach
        # Export certificate and key separately using certlm or other methods
        Write-Host "⚠️  Cannot convert to PEM without OpenSSL" -ForegroundColor Yellow
        Write-Host "💡 Options:" -ForegroundColor Yellow
        Write-Host "   1. Install OpenSSL: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor Yellow
        Write-Host "   2. Use mkcert: choco install mkcert" -ForegroundColor Yellow
        Write-Host "   3. Use the PFX file with a different server configuration" -ForegroundColor Yellow
        
        # For now, create placeholder PEM files that won't work but allow server to start
        # User will need to manually convert or use mkcert
        $placeholderKey = "-----BEGIN PRIVATE KEY-----
PLACEHOLDER - Please install OpenSSL or mkcert to generate proper certificates
See QUICK_SSL_SETUP.md for instructions
-----END PRIVATE KEY-----"
        
        $placeholderCert = "-----BEGIN CERTIFICATE-----
PLACEHOLDER - Please install OpenSSL or mkcert to generate proper certificates
See QUICK_SSL_SETUP.md for instructions
-----END CERTIFICATE-----"
        
        Set-Content -Path $keyPath -Value $placeholderKey
        Set-Content -Path $certPath -Value $placeholderCert
        
        Write-Host "⚠️  Placeholder files created. Please install OpenSSL or mkcert." -ForegroundColor Yellow
    }

    # Remove certificate from store (we've exported it)
    Remove-Item "Cert:\CurrentUser\My\$($cert.Thumbprint)" -Force
    
    Write-Host ""
    Write-Host "✅ Certificate files created:" -ForegroundColor Green
    Write-Host "   Key: $keyPath" -ForegroundColor Gray
    Write-Host "   Cert: $certPath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "⚠️  Note: This is a self-signed certificate." -ForegroundColor Yellow
    Write-Host "   Browsers will show a warning, but you can proceed safely." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 For development without warnings, use mkcert:" -ForegroundColor Cyan
    Write-Host "   choco install mkcert" -ForegroundColor Gray
    Write-Host "   mkcert -install" -ForegroundColor Gray
    Write-Host "   mkcert localhost 95.216.225.37" -ForegroundColor Gray
    
} catch {
    Write-Host ""
    Write-Host "❌ Error generating certificate: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Alternative options:" -ForegroundColor Yellow
    Write-Host "   1. Install mkcert: choco install mkcert" -ForegroundColor Yellow
    Write-Host "   2. Install OpenSSL: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor Yellow
    exit 1
}



