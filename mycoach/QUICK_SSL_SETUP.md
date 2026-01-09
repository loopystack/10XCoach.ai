# Quick SSL Setup - Avoid Browser Warnings

## Problem
When accessing `https://95.216.225.37:5000`, Chrome shows a security warning that blocks the page from loading automatically.

## Solution: Use mkcert (Recommended - No Warnings!)

mkcert creates **locally-trusted certificates** that browsers accept without any warnings.

### Step 1: Install mkcert

**Windows (PowerShell as Administrator):**
```powershell
choco install mkcert
```

**Or download manually:**
- Download from: https://github.com/FiloSottile/mkcert/releases
- Extract `mkcert-v1.4.4-windows-amd64.exe` to a folder in your PATH
- Rename to `mkcert.exe`

**macOS:**
```bash
brew install mkcert
```

**Linux:**
```bash
sudo apt install mkcert
```

### Step 2: Install Local CA
```bash
mkcert -install
```

This installs a local Certificate Authority that your browser will trust.

### Step 3: Generate Certificates
```bash
cd mycoach/certificates
mkcert localhost 95.216.225.37 127.0.0.1 0.0.0.0
```

This creates:
- `localhost+3.pem` (certificate)
- `localhost+3-key.pem` (private key)

### Step 4: Rename Files
```bash
mv localhost+3.pem localhost.pem
mv localhost+3-key.pem localhost-key.pem
```

### Step 5: Start Server
```bash
npm run dev:https
```

**Result**: No browser warnings! The page loads automatically. ✅

---

## Alternative: Auto-Generated Certificates (Still Shows Warning)

If you can't use mkcert, you can generate certificates automatically:

```bash
npm run generate-cert
npm run dev:https
```

**Note**: Browsers will still show a warning, but you can:
1. Click "Advanced"
2. Click "Proceed to 95.216.225.37 (unsafe)"
3. The warning won't appear again for this certificate

---

## Why mkcert is Better

- ✅ **No browser warnings** - certificates are locally trusted
- ✅ **Automatic loading** - page loads without manual intervention
- ✅ **Secure** - uses proper certificate chain
- ✅ **Easy setup** - one command to generate

---

## Troubleshooting

### "mkcert command not found"
- Make sure mkcert is installed and in your PATH
- On Windows, restart PowerShell after installation

### "Certificate still shows warning"
- Make sure you ran `mkcert -install` first
- Clear browser cache and restart browser
- Check that certificate files are in `certificates/` directory

### "Server won't start"
- Make sure certificates exist: `certificates/localhost.pem` and `certificates/localhost-key.pem`
- Check file permissions
- Try regenerating certificates



