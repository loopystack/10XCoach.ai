import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

// This endpoint helps debug JWT_SECRET issues
export async function POST(request: Request) {
  try {
    const { token } = await request.json()
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 400 })
    }
    
    // Try different secret encodings
    const results: any = {
      jwtSecret: JWT_SECRET,
      jwtSecretLength: JWT_SECRET.length,
      jwtSecretBytes: Array.from(new TextEncoder().encode(JWT_SECRET)),
      attempts: []
    }
    
    // Attempt 1: Direct string (as jsonwebtoken might use it)
    try {
      const secret1 = new TextEncoder().encode(JWT_SECRET)
      const { payload } = await jwtVerify(token, secret1)
      results.attempts.push({ method: 'TextEncoder.encode', success: true, payload })
    } catch (e: any) {
      results.attempts.push({ method: 'TextEncoder.encode', success: false, error: e.message })
    }
    
    // Attempt 2: Base64 encoded
    try {
      const secret2 = new TextEncoder().encode(btoa(JWT_SECRET))
      const { payload } = await jwtVerify(token, secret2)
      results.attempts.push({ method: 'Base64 encoded', success: true, payload })
    } catch (e: any) {
      results.attempts.push({ method: 'Base64 encoded', success: false, error: e.message })
    }
    
    return NextResponse.json(results)
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to process', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

