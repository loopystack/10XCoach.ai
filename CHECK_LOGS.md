# Check Server Logs - No Routes Found

If grep returns nothing, check the full logs:

## Step 1: Check Full Logs

```bash
pm2 logs 10x-unified-server --lines 100 | tail -50
```

This will show the last 50 lines of logs. Look for:
- Server startup messages
- Any errors
- Route-related messages

## Step 2: Check if Server Started

```bash
pm2 status
pm2 info 10x-unified-server
```

Check if the server is actually running.

## Step 3: Restart and Watch Logs

```bash
# Stop server
pm2 stop 10x-unified-server

# Start and watch logs
pm2 start ecosystem.config.js
pm2 logs 10x-unified-server --lines 0
```

Watch the startup logs - you should see route setup messages.

## Step 4: If Still Nothing

Check if the server file is the right one:

```bash
cd /var/www/10XCoach.ai
cat ecosystem.config.js | grep script
# Should show: script: 'server/index.js'

# Check if file exists
ls -la server/index.js
```

## Step 5: Check for Errors

```bash
pm2 logs 10x-unified-server --err --lines 100
```

This shows only errors.

