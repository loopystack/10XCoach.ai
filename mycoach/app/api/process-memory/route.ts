import { NextRequest, NextResponse } from 'next/server'
import { processSessionForMemory } from '@/lib/coachMemory'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Process a session for long-term memory
 * Call this periodically (e.g., every 10 messages or at end of session)
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId' },
        { status: 400 }
      )
    }

    // Process the session for memory
    await processSessionForMemory(sessionId)

    return NextResponse.json({ 
      success: true,
      message: 'Session processed for memory'
    })
  } catch (error) {
    console.error('Error processing memory:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Process all recent sessions for memory (batch processing)
 */
export async function GET() {
  try {
    // Get recent sessions (last 24 hours)
    const recentSessions = await prisma.session.findMany({
      where: {
        updatedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      select: { id: true },
    })

    // Process each session
    const results = await Promise.allSettled(
      recentSessions.map((session) => processSessionForMemory(session.id))
    )

    const successful = results.filter((r) => r.status === 'fulfilled').length

    return NextResponse.json({
      success: true,
      processed: successful,
      total: recentSessions.length,
    })
  } catch (error) {
    console.error('Error batch processing memory:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

