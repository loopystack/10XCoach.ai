import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://95.216.225.37:3000'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      )
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number }
      
      // Fetch user info from dashboard API (non-critical - gracefully degrade if it fails)
      try {
        const userResponse = await fetch(`${DASHBOARD_URL}/api/users/${decoded.userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          // Add timeout to prevent hanging
          signal: AbortSignal.timeout(3000) // 3 second timeout
        })

        if (userResponse.ok) {
          const userData = await userResponse.json()
          return NextResponse.json({
            userId: decoded.userId,
            email: userData.email || null,
            name: userData.name || null
          })
        }
      } catch (fetchError: any) {
        // Silently handle fetch errors - this is expected if dashboard is unreachable
        // The app works fine without email/name - only userId is required
        // Only log in development mode for debugging
        if (process.env.NODE_ENV === 'development') {
          const errorCode = fetchError?.code || 'UNKNOWN'
          // Don't log SSL errors - they're expected and handled gracefully
          if (errorCode !== 'ERR_SSL_PACKET_LENGTH_TOO_LONG' && !fetchError?.message?.includes('SSL')) {
            console.warn('[user-info] Dashboard fetch failed (non-critical):', fetchError?.message || 'Unknown error')
          }
        }
        // Continue gracefully - return userId without email/name
      }

      // If we can't fetch from dashboard, just return userId
      return NextResponse.json({
        userId: decoded.userId,
        email: null,
        name: null
      })
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return NextResponse.json(
          { error: 'Token expired' },
          { status: 401 }
        )
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        )
      }
      throw error
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Token verification failed' },
      { status: 500 }
    )
  }
}

