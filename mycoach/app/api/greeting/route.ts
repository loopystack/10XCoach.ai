import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// AI service URL - use environment variable or try to detect
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || (typeof window === 'undefined' ? 'http://localhost:8001' : 'http://localhost:8001')

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId' },
        { status: 400 }
      )
    }

    // Call AI service to generate greeting
    console.log('[greeting API] Calling AI service at:', `${AI_SERVICE_URL}/ai/greeting`)
    console.log('[greeting API] AI_SERVICE_URL env:', process.env.AI_SERVICE_URL)
    
    let aiServiceResponse
    try {
      aiServiceResponse = await fetch(`${AI_SERVICE_URL}/ai/greeting`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      })
    } catch (fetchError) {
      console.error('[greeting API] Fetch error:', fetchError)
      // If AI service is not available, return a fallback greeting (voice-appropriate)
      return NextResponse.json({
        coachText: "Hey there! I'm Alan, your business coach. What's on your mind today?",
        audioBase64: null, // No audio for fallback
        audioMimeType: 'audio/mpeg',
      })
    }

    if (!aiServiceResponse.ok) {
      const errorData = await aiServiceResponse.json().catch(() => ({ error: 'Unknown error' }))
      console.error('[greeting API] AI service error:', errorData, 'Status:', aiServiceResponse.status)
      
      // Return fallback greeting instead of error (voice-appropriate)
      return NextResponse.json({
        coachText: "Hey there! I'm Alan, your business coach. What's on your mind today?",
        audioBase64: null, // No audio for fallback
        audioMimeType: 'audio/mpeg',
      })
    }

    const data = await aiServiceResponse.json()
    
    console.log('[greeting API] Received from AI service:', {
      hasCoachText: !!data.coachText,
      hasAudioBase64: !!data.audioBase64,
      audioBase64Length: data.audioBase64?.length,
      mimeType: data.mimeType
    })

    return NextResponse.json({
      coachText: data.coachText,
      audioBase64: data.audioBase64,
      audioMimeType: data.mimeType || 'audio/mpeg',
    })
  } catch (error) {
    console.error('Error in greeting API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}

