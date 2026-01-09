# SSL Certificate Setup for HTTPS

The AI Coach requires HTTPS for microphone access. This guide explains how to set up SSL certificates.

## Quick Start

1. **Generate certificates** (first time only):
   ```bash
   npm run generate-cert
   ```

2. **Start the server with HTTPS**:
   ```bash
   npm run dev:https
   ```

## Certificate Options

### Option 1: Auto-Generated Certificates (Recommended for Development)

Run the certificate generation script:
```bash
npm run generate-cert
```

This creates self-signed certificates with Subject Alternative Names (SAN) that include:
- `localhost`
- `95.216.225.37` (your IP)
- `127.0.0.1`
- `0.0.0.0`

**Note**: Browsers will still show a warning for self-signed certificates, but you can proceed safely.

### Option 2: mkcert (No Browser Warnings - Best for Development)

[mkcert](https://github.com/FiloSottile/mkcert) creates locally-trusted certificates that browsers accept without warnings.

1. **Install mkcert**:
   ```bash
   # Windows (with Chocolatey)
   choco install mkcert
   
   # macOS
   brew install mkcert
   
   # Linux
   sudo apt install mkcert
   ```

2. **Install the local CA**:
   ```bash
   mkcert -install
   ```

3. **Generate certificates**:
   ```bash
   cd certificates
   mkcert localhost 95.216.225.37 127.0.0.1 0.0.0.0
   ```
   
   This creates:
   - `localhost+3.pem` (certificate)
   - `localhost+3-key.pem` (private key)

4. **Rename files** (to match server.js expectations):
   ```bash
   mv localhost+3.pem localhost.pem
   mv localhost+3-key.pem localhost-key.pem
   ```

### Option 3: Use Your Own Certificates

Place your SSL certificates in the `certificates/` directory:
- `localhost-key.pem` (private key)
- `localhost.pem` (certificate)

## Troubleshooting

### "OpenSSL not found"
Install OpenSSL:
- **Windows**: Download from [Win32OpenSSL](https://slproweb.com/products/Win32OpenSSL.html)
- **macOS**: `brew install openssl`
- **Linux**: `sudo apt-get install openssl`

### "Certificate errors in browser"
- Self-signed certificates will always show warnings
- Use mkcert for locally-trusted certificates (no warnings)
- For production, use certificates from a trusted CA (Let's Encrypt, etc.)

### "Server won't start"
- Make sure certificates exist in `certificates/` directory
- Check file permissions
- Verify certificate files are valid PEM format

## Production

For production, use proper SSL certificates from a trusted Certificate Authority:
- [Let's Encrypt](https://letsencrypt.org/) (free)
- [Cloudflare](https://www.cloudflare.com/ssl/) (free with CDN)
- Commercial CA (paid)

Place your production certificates in the `certificates/` directory with the same filenames.



