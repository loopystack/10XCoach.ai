import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

// JWT Secret - should match the 10X Dashboard server
// Make sure to set this in your .env file to match the 10X Dashboard server's JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Dashboard URL - where users should be redirected if not authenticated
// IMPORTANT: This must be port 3000 (dashboard), not port 5000 (mycoach)
const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://95.216.225.37:3000'

// Log for debugging - remove after fixing
if (DASHBOARD_URL.includes(':5000')) {
  console.error('⚠️ WARNING: DASHBOARD_URL is set to port 5000! It should be port 3000.')
  console.error('⚠️ Check your mycoach/.env.local file - NEXT_PUBLIC_DASHBOARD_URL should be https://95.216.225.37:3000')
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only protect coach-alan routes
  if (pathname.startsWith('/coach-alan')) {
    // Check for token in query params (from redirect)
    const token = request.nextUrl.searchParams.get('token')
    
    // Check for token in cookies (for subsequent requests)
    const cookieToken = request.cookies.get('auth_token')?.value

    const authToken = token || cookieToken

    if (!authToken) {
      // No token - redirect to 10X Dashboard login (port 3000)
      // Use absolute URL to ensure redirect goes to dashboard, not mycoach
      const loginUrl = `${DASHBOARD_URL}/login?redirect=${encodeURIComponent('https://95.216.225.37:5000/coach-alan')}`
      console.log('No token found, redirecting to:', loginUrl)
      return NextResponse.redirect(loginUrl)
    }

    try {
      // Verify the token using jose (works in Edge Runtime)
      // IMPORTANT: jose requires the secret to be encoded, and it must match exactly
      // with the secret used by jsonwebtoken on the server
      const secret = new TextEncoder().encode(JWT_SECRET)
      
      console.log('Verifying token with JWT_SECRET length:', JWT_SECRET.length)
      console.log('JWT_SECRET preview:', JWT_SECRET.substring(0, 5) + '...' + JWT_SECRET.substring(JWT_SECRET.length - 5))
      
      const { payload } = await jwtVerify(authToken, secret)
      
      // If token is in query params, set it as a cookie for future requests
      if (token) {
        // Create a clean URL without the token parameter, staying on port 5000
        // Use the actual domain instead of request.nextUrl.origin (which might be 0.0.0.0)
        const cleanUrl = new URL('/coach-alan', 'https://95.216.225.37:5000')
        // Remove token from URL for security
        
        const response = NextResponse.redirect(cleanUrl)
        response.cookies.set('auth_token', authToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7 // 7 days
        })
        return response
      }

      return NextResponse.next()
    } catch (error) {
      // Log the error for debugging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const errorName = error instanceof Error ? error.name : 'Unknown'
      
      console.error('=== Token Verification Failed ===')
      console.error('Error:', errorMessage)
      console.error('Error Type:', errorName)
      console.error('JWT_SECRET is set:', !!JWT_SECRET)
      console.error('JWT_SECRET length:', JWT_SECRET?.length || 0)
      console.error('Token length:', authToken.length)
      console.error('Token preview:', authToken.substring(0, 50) + '...')
      console.error('================================')
      
      // Invalid or expired token - clear cookie and redirect to dashboard login (port 3000)
      // Use absolute URL to ensure redirect goes to dashboard, not mycoach
      const loginUrl = `${DASHBOARD_URL}/login?redirect=${encodeURIComponent('https://95.216.225.37:5000/coach-alan')}`
      
      console.error('Redirecting to:', loginUrl)
      console.error('DASHBOARD_URL:', DASHBOARD_URL)
      
      const response = NextResponse.redirect(loginUrl)
      response.cookies.delete('auth_token')
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/coach-alan/:path*']
}

