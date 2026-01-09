import { NextRequest, NextResponse } from 'next/server'

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://95.216.225.37:3000'

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie (set by middleware)
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      )
    }

    // Fetch coaches from dashboard API
    try {
      const coachesResponse = await fetch(`${DASHBOARD_URL}/api/coaches`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })

      if (coachesResponse.ok) {
        const coaches = await coachesResponse.json()
        return NextResponse.json(coaches)
      } else {
        // If dashboard API fails, return empty array
        console.warn('[coaches API] Dashboard fetch failed:', coachesResponse.status)
        return NextResponse.json([])
      }
    } catch (fetchError: any) {
      // Silently handle fetch errors - return empty array
      if (process.env.NODE_ENV === 'development') {
        console.warn('[coaches API] Dashboard fetch error (non-critical):', fetchError?.message || 'Unknown error')
      }
      return NextResponse.json([])
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch coaches' },
      { status: 500 }
    )
  }
}

