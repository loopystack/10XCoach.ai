# Quick Fix: Remove "Your connection is not private" Warning

## Automatic Setup (Easiest)

Run this command in the `openAI_conver` folder:

```bash
npm run setup-ssl
```

This will:
1. Check if mkcert is installed
2. Install the local CA (may require admin)
3. Generate valid SSL certificates
4. Set everything up automatically

**After running this, restart your server and the warning will be gone!**

## Manual Setup (If automatic doesn't work)

### Step 1: Install mkcert

**Windows:**
```powershell
# Run PowerShell as Administrator
choco install mkcert
```

Or download from: https://github.com/FiloSottile/mkcert/releases/latest

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

### Step 3: Generate Certificates

```bash
cd openAI_conver
mkdir certificates
cd certificates
mkcert localhost 95.216.225.37 127.0.0.1 0.0.0.0
```

### Step 4: Rename Files

**Windows PowerShell:**
```powershell
Rename-Item localhost+3.pem localhost.pem
Rename-Item localhost+3-key.pem localhost-key.pem
```

**Linux/Mac:**
```bash
mv localhost+3.pem localhost.pem
mv localhost+3-key.pem localhost-key.pem
```

### Step 5: Restart Server

Restart your server - it will automatically use the certificates and the warning will be gone!

## Verify It Works

After setup, when you access `https://95.216.225.37:5000`:
- ✅ No browser warning
- ✅ Green padlock in address bar
- ✅ Microphone works perfectly

## Troubleshooting

**"mkcert command not found"**
- Make sure mkcert is installed and in your PATH
- Restart your terminal after installing

**"Permission denied" when installing CA**
- Run as Administrator (Windows) or use `sudo` (Linux/Mac)

**"Certificate still not trusted"**
- Make sure you ran `mkcert -install`
- Restart your browser completely
- Clear browser cache

**"Server still shows warning"**
- Make sure certificates are in `openAI_conver/certificates/` folder
- Check file names: `localhost.pem` and `localhost-key.pem`
- Restart the server after adding certificates

