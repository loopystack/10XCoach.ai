import { NextResponse } from 'next/server'

// This endpoint helps debug if JWT_SECRET is loaded correctly
// DO NOT use this in production - remove after debugging
export async function GET() {
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
  
  return NextResponse.json({
    jwtSecretSet: !!JWT_SECRET,
    jwtSecretLength: JWT_SECRET.length,
    jwtSecretPreview: JWT_SECRET.substring(0, 5) + '...' + JWT_SECRET.substring(JWT_SECRET.length - 5),
    // Only show first and last 5 characters for security
    message: 'Check if JWT_SECRET matches your server/.env file'
  })
}

