# Debug Token Verification Issue

## Current Status
✅ Redirect is now going to correct port (3000)
❌ Token verification is still failing

## What to Check

### 1. Check mycoach Server Logs

When you click "Talk to Coach", check your **mycoach server console** for:

```
=== Token Verification Failed ===
Error: [ERROR MESSAGE]
Error Type: [ERROR TYPE]
JWT_SECRET is set: true
JWT_SECRET length: 29
Token length: [number]
Token preview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
================================
```

**Common Errors:**
- `invalid signature` → JWT_SECRET values don't match
- `Token expired` → Token has expired (default: 7 days)
- `jwt malformed` → Token format is wrong

### 2. Verify JWT_SECRET Matches

**Check server/.env:**
```env
JWT_SECRET=10X_Dashboard_2025!Secure@JWT
```

**Check mycoach/.env.local:**
```env
JWT_SECRET=10X_Dashboard_2025!Secure@JWT
NEXT_PUBLIC_DASHBOARD_URL=https://95.216.225.37:3000
```

**They must match EXACTLY:**
- Same value
- Same length (29 characters)
- No extra spaces
- Same case

### 3. Test Token Verification Directly

**In browser console on 10X Dashboard (after logging in):**

```javascript
// Get your token
const token = localStorage.getItem('token') || sessionStorage.getItem('token')
console.log('Token:', token)

// Test verification
fetch('https://95.216.225.37:5000/api/verify-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token })
})
.then(r => r.json())
.then(console.log)
```

**Expected (if working):**
```json
{
  "valid": true,
  "userId": 7
}
```

**Expected (if failing):**
```json
{
  "valid": false,
  "error": "invalid signature",
  "errorType": "JsonWebTokenError"
}
```

### 4. Check Token in URL

When you click "Talk to Coach", check the URL:
```
https://95.216.225.37:5000/coach-alan?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

The token should be in the URL. Copy it and test it with the API above.

## Most Likely Issue

**JWT_SECRET mismatch** - The server and mycoach have different JWT_SECRET values.

## Solution

1. Open `server/.env` → Copy the exact `JWT_SECRET` value
2. Open `mycoach/.env.local` → Paste the exact same value
3. Make sure they match character-for-character
4. Restart both servers
5. Test again

## Next Steps

1. ✅ Check mycoach server logs for the exact error
2. ✅ Verify both JWT_SECRET values match exactly
3. ✅ Test token verification with the API endpoint
4. ✅ Share the error message from logs

