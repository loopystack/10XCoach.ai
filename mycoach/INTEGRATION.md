# 10X Dashboard Integration

This document explains how the mycoach project is integrated with the 10X Dashboard.

## Overview

The mycoach project is protected by authentication from the 10X Dashboard. Users must be logged into the 10X Dashboard to access the coach-alan page.

## How It Works

1. **User clicks "Talk to Coach" button** in the 10X Dashboard Coaches page
2. **Authentication check**: The system verifies the user is logged in
3. **Token transfer**: If authenticated, the JWT token is passed to mycoach via URL query parameter
4. **Middleware protection**: Next.js middleware verifies the token and sets it as a cookie
5. **Access granted**: User can interact with Coach Alan

## Environment Variables

Create a `.env.local` file in the `mycoach` directory with the following variables:

```env
# JWT Secret - MUST match the 10X Dashboard server's JWT_SECRET
JWT_SECRET=your-secret-key

# 10X Dashboard URL (where users will be redirected if not authenticated)
NEXT_PUBLIC_DASHBOARD_URL=https://95.216.225.37:3000
```

**Important**: The `JWT_SECRET` must match exactly with the 10X Dashboard server's `JWT_SECRET` environment variable.

## Security Features

1. **Route Protection**: The `/coach-alan` route is protected by Next.js middleware
2. **Token Verification**: JWT tokens are verified using the shared secret
3. **Cookie Storage**: Tokens are stored in httpOnly cookies for security
4. **Automatic Redirect**: Unauthenticated users are redirected to the 10X Dashboard login page
5. **URL Cleanup**: Token is removed from URL after being stored in cookie

## Testing

1. Access the 10X Dashboard at https://95.216.225.37:3000
2. Log in to the 10X Dashboard
3. Navigate to the Coaches page
4. Click "Talk to Coach" on any coach card (all coaches currently redirect to Alan)
5. You should be redirected to mycoach at https://95.216.225.37:5000/coach-alan and see Coach Alan

**Note**: Currently only Alan AI coach is implemented. All "Talk to Coach" buttons redirect to Alan's coach page.

## Troubleshooting

### "Redirected to login" when clicking "Talk to Coach"
- Check that you're logged into the 10X Dashboard
- Verify the JWT_SECRET matches between both projects
- Check browser console for errors

### "Invalid token" error
- Token may have expired (default: 7 days)
- JWT_SECRET mismatch between projects
- Try logging out and back in to the 10X Dashboard

### Cannot access mycoach directly via URL
- This is expected behavior - the route is protected
- You must access it through the 10X Dashboard after logging in

