import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = body.token === 'cookie' 
      ? request.cookies.get('auth_token')?.value 
      : body.token

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'No token provided' },
        { status: 401 }
      )
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number }
      return NextResponse.json({ valid: true, userId: decoded.userId })
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return NextResponse.json(
          { valid: false, error: 'Token expired' },
          { status: 401 }
        )
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return NextResponse.json(
          { valid: false, error: 'Invalid token' },
          { status: 401 }
        )
      }
      throw error
    }
  } catch (error) {
    return NextResponse.json(
      { valid: false, error: 'Token verification failed' },
      { status: 500 }
    )
  }
}

