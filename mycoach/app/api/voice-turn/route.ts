import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processSessionForMemory } from '@/lib/coachMemory'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001'

// Test endpoint to verify route is accessible
export async function GET() {
  return NextResponse.json({ status: 'ok', route: 'voice-turn' })
}

export async function POST(request: NextRequest) {
  console.log('[voice-turn] POST request received, url:', request.url)
  
  let formData: FormData
  let audioFile: File | null
  let sessionId: string | null
  
  try {
    console.log('[voice-turn] Parsing formData...')
    formData = await request.formData()
    audioFile = formData.get('audio') as File
    sessionId = formData.get('sessionId') as string
    console.log('[voice-turn] audioFile:', audioFile?.name, 'size:', audioFile?.size, 'sessionId:', sessionId)
  } catch (parseError) {
    console.error('[voice-turn] FormData parse error:', parseError)
    return NextResponse.json(
      { error: 'Failed to parse form data', details: String(parseError) },
      { status: 400 }
    )
  }
  
  try {
    if (!audioFile || !sessionId) {
      console.log('[voice-turn] Missing audio or sessionId')
      return NextResponse.json(
        { error: 'Missing audio file or sessionId' },
        { status: 400 }
      )
    }

    // Validate audio file
    if (audioFile.size === 0) {
      return NextResponse.json(
        { error: 'Audio file is empty' },
        { status: 400 }
      )
    }

    // Convert File to Buffer for AI service
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    if (buffer.length === 0) {
      return NextResponse.json(
        { error: 'Audio buffer is empty' },
        { status: 400 }
      )
    }

    // Call AI service
    console.log('[voice-turn] Calling AI service at:', AI_SERVICE_URL)
    const base64Audio = buffer.toString('base64')
    console.log('[voice-turn] buffer length:', buffer.length, 'base64 length:', base64Audio.length)
    
    const requestBody = {
      sessionId,
      audioBase64: base64Audio,
      audioMimeType: audioFile.type || 'audio/webm',
    }
    console.log('[voice-turn] Sending request body keys:', Object.keys(requestBody), 'audioBase64 first 50 chars:', base64Audio.substring(0, 50))
    
    const aiServiceResponse = await fetch(`${AI_SERVICE_URL}/ai/coach-turn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })
    
    console.log('[voice-turn] AI service response status:', aiServiceResponse.status)

    if (!aiServiceResponse.ok) {
      // Try to parse error details from AI service
      let errorData: any = {}
      try {
        const errorText = await aiServiceResponse.text()
        console.log('[voice-turn] AI service error response:', errorText.substring(0, 500))
        errorData = JSON.parse(errorText)
      } catch {
        // If parsing fails, use the raw text
        const errorText = await aiServiceResponse.text()
        console.log('[voice-turn] AI service error (non-JSON):', errorText.substring(0, 500))
        errorData = { error: 'AI service failed', details: errorText }
      }
      
      // Preserve the status code from AI service (for quota errors, rate limits, etc.)
      const statusCode = aiServiceResponse.status
      
      // Log the error for debugging
      console.error('[voice-turn] AI service returned error:', statusCode, errorData)
      
      return NextResponse.json(
        {
          error: errorData.detail?.error || errorData.error || 'AI service failed',
          message: errorData.detail?.message || errorData.message || errorData.detail || errorData.details,
          ...errorData.detail, // Include any additional error details
        },
        { status: statusCode }
      )
    }

    const aiData = await aiServiceResponse.json()

    // Return response to frontend immediately (don't wait for database)
    // Database writes happen in background for faster response time
    const turnId = uuidv4()
    
    // Fire-and-forget database writes (non-blocking)
    // This improves response time by not waiting for DB operations
    Promise.all([
      // Update session with transcript
      (async () => {
        const session = await prisma.session.findUnique({ where: { id: sessionId } })
        const existingTranscript = session?.transcript || ''
        const newTranscript = `${existingTranscript}User: ${aiData.userText || ''}\nCoach: ${aiData.coachText || ''}\n`
        
        return prisma.session.upsert({
          where: { id: sessionId },
          update: {
            updatedAt: new Date(),
            transcript: newTranscript,
          },
          create: { 
            id: sessionId,
            transcript: newTranscript,
          },
        })
      })(),
      // Save user message
      prisma.sessionMessage.create({
        data: {
          id: `${turnId}-user`,
          sessionId,
          from: 'user',
          text: aiData.userText || '',
        },
      }),
      // Save coach message
      prisma.sessionMessage.create({
        data: {
          id: `${turnId}-coach`,
          sessionId,
          from: 'coach',
          text: aiData.coachText || '',
        },
      }),
    ]).then(async () => {
      // Periodically process session for long-term memory (every 10 messages)
      const messageCount = await prisma.sessionMessage.count({
        where: { sessionId },
      })
      
      // Process every 10 messages (10, 20, 30, etc.)
      if (messageCount > 0 && messageCount % 10 === 0) {
        processSessionForMemory(sessionId).catch((error) => {
          console.error('[Memory] Error processing session:', error)
        })
      }
    }).catch((error) => {
      // Log errors but don't block response
      console.error('Database write error (non-blocking):', error)
    })

    // Return response to frontend immediately
    return NextResponse.json({
      userText: aiData.userText,
      coachText: aiData.coachText,
      sessionId,
      turnId,
      audioBase64: aiData.audioBase64,
      audioMimeType: aiData.mimeType || 'audio/mpeg',
    })
  } catch (error) {
    console.error('Error in voice-turn API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}

