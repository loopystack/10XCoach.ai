# Authentication Setup for mycoach

## Critical: JWT_SECRET Configuration

The mycoach project **MUST** have the same `JWT_SECRET` as your 10X Dashboard server, otherwise token verification will fail and users will be redirected to the login page.

## Setup Steps

### 1. Find Your 10X Dashboard Server's JWT_SECRET

Check your `server/.env` file (or wherever your server environment variables are stored) and find the `JWT_SECRET` value.

### 2. Create `.env.local` in mycoach Directory

Create a file named `.env.local` in the `mycoach` directory with the following content:

```env
# JWT Secret - MUST match the 10X Dashboard server's JWT_SECRET exactly
JWT_SECRET=your-actual-secret-key-here

# 10X Dashboard URL (where users will be redirected if not authenticated)
NEXT_PUBLIC_DASHBOARD_URL=https://95.216.225.37:3000
```

**IMPORTANT**: Replace `your-actual-secret-key-here` with the **exact same value** from your 10X Dashboard server's `.env` file.

### 3. Restart the mycoach Server

After creating/updating `.env.local`, you **must restart** the mycoach server for the changes to take effect:

```bash
# Stop the server (Ctrl+C)
# Then restart it
cd mycoach
npm run dev
```

## Testing Authentication

### Option 1: Check Server Logs

When you click "Talk to Coach", check the mycoach server console. You should see logs like:

```
=== Token Verification Failed ===
Error: invalid signature
Error Type: JsonWebTokenError
JWT_SECRET is set: true
...
```

If you see `JWT_SECRET is set: false`, the environment variable is not being loaded.

### Option 2: Test Token Verification

You can test token verification by making a POST request to `/api/test-auth`:

```javascript
// In browser console on 10X Dashboard (after logging in)
const token = localStorage.getItem('token') || sessionStorage.getItem('token')
fetch('https://95.216.225.37:5000/api/test-auth', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token })
})
.then(r => r.json())
.then(console.log)
```

This will show you:
- Whether the token is valid
- What error occurred if invalid
- Whether JWT_SECRET is set correctly

## Common Issues

### Issue: "Redirected to port 3000" even when logged in

**Cause**: JWT_SECRET mismatch between 10X Dashboard server and mycoach

**Solution**: 
1. Verify both projects have the same `JWT_SECRET` value
2. Make sure `.env.local` is in the `mycoach` directory (not `mycoach/.env`)
3. Restart the mycoach server after changing `.env.local`

### Issue: "JWT_SECRET is set: false" in logs

**Cause**: Environment variable not being loaded

**Solution**:
1. Make sure the file is named `.env.local` (not `.env`)
2. Make sure it's in the `mycoach` directory root
3. Restart the server
4. In Next.js, environment variables must be prefixed with `NEXT_PUBLIC_` to be available in the browser, but `JWT_SECRET` should work in middleware/server code

### Issue: "invalid signature" error

**Cause**: JWT_SECRET values don't match

**Solution**: Copy the exact JWT_SECRET from your 10X Dashboard server's `.env` file to mycoach's `.env.local` file

## Verification

After setup, when you:
1. Log in to 10X Dashboard
2. Click "Talk to Coach"
3. You should be redirected to `https://95.216.225.37:5000/coach-alan` (not port 3000)

If you're still redirected to port 3000, check the mycoach server logs for the error details.

