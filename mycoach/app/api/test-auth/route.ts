import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({
        error: 'No token provided',
        debug: {
          jwtSecretSet: !!JWT_SECRET,
          jwtSecretLength: JWT_SECRET.length,
          jwtSecretPreview: JWT_SECRET.substring(0, 10) + '...'
        }
      }, { status: 400 })
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number }
      return NextResponse.json({
        valid: true,
        userId: decoded.userId,
        debug: {
          jwtSecretSet: !!JWT_SECRET,
          jwtSecretLength: JWT_SECRET.length
        }
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const errorName = error instanceof Error ? error.name : 'Unknown'
      
      return NextResponse.json({
        valid: false,
        error: errorMessage,
        errorType: errorName,
        debug: {
          jwtSecretSet: !!JWT_SECRET,
          jwtSecretLength: JWT_SECRET.length,
          tokenLength: token.length,
          tokenPreview: token.substring(0, 20) + '...'
        }
      }, { status: 401 })
    }
  } catch (error) {
    return NextResponse.json({
      error: 'Request processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

