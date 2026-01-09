# QUICK FIX: "Invalid or expired token" Error

## The Problem
When clicking "Save Conversation", you get: `Invalid or expired token. Please log in again.`

This happens because the `openAI_conver` server doesn't have the same `JWT_SECRET` as your main server.

## IMMEDIATE FIX (2 Steps)

### Step 1: Find Your Main Server's JWT_SECRET

Open `server/.env` and find this line:
```env
JWT_SECRET=your-actual-secret-key-here
```

**Copy the EXACT value** (everything after the `=` sign)

### Step 2: Add JWT_SECRET to openAI_conver/.env

Open or create `openAI_conver/.env` and add:
```env
JWT_SECRET=your-actual-secret-key-here
```

**CRITICAL**: 
- Must be **EXACTLY THE SAME** as in `server/.env`
- No extra spaces
- Same case (uppercase/lowercase matters)
- Same characters

### Step 3: Restart openAI_conver Server

```bash
# Stop the server (Ctrl+C)
# Then restart
cd openAI_conver
npm start
```

## Example

If your `server/.env` has:
```env
JWT_SECRET=10Xdaniel2025
```

Then your `openAI_conver/.env` must have:
```env
JWT_SECRET=10Xdaniel2025
```

## Verification

After restarting, try saving a conversation again. Check the server console - you should see:
- `✅ Decoded user ID from token: [number]` 
- No "Invalid or expired token" errors

## Fallback (Already Implemented)

If JWT_SECRET doesn't match, the code will automatically try to get the user ID from the main server's API. This should work, but it's better to fix the JWT_SECRET configuration.

