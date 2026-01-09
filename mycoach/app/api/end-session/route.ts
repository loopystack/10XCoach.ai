import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, generateNotesEmailHTML, generateNotesEmailText } from '@/lib/emailService'

export const dynamic = 'force-dynamic'

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001'

/**
 * End a session and generate coaching notes
 * This should be called when the user ends their coaching session
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId, userEmail } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId' },
        { status: 400 }
      )
    }

    // Check if session exists
    let session
    try {
      session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { transcript: true },
    })
    } catch (dbError: any) {
      console.error('[end-session] Database connection error:', dbError)
      // Check if it's a database file error
      if (dbError.message?.includes('Unable to open the database file') || dbError.code === 14) {
        return NextResponse.json(
          { 
            error: 'Database connection failed', 
            details: 'Unable to access the database file. Please check DATABASE_URL environment variable and ensure the database file exists and is accessible.',
            hint: 'The database should be at: prisma/dev.db'
          },
          { status: 500 }
        )
      }
      throw dbError
    }

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    if (!session.transcript) {
      return NextResponse.json(
        { error: 'Session has no transcript available' },
        { status: 400 }
      )
    }

    // Check if notes already exist
    const existingNotes = await prisma.sessionNotes.findUnique({
      where: { sessionId },
    })

    if (existingNotes) {
      return NextResponse.json({
        success: true,
        message: 'Session already ended and notes generated',
        notes: existingNotes,
      })
    }

    console.log('[end-session] Generating notes for session:', sessionId)

    // Call AI service to generate notes directly (no HTTP fetch)
    const aiServiceResponse = await fetch(`${AI_SERVICE_URL}/ai/coach/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        transcript: session.transcript,
      }),
    })

    if (!aiServiceResponse.ok) {
      const errorData = await aiServiceResponse.json().catch(() => ({ error: 'AI service failed' }))
      console.error('[end-session] AI service error:', errorData, 'Status:', aiServiceResponse.status)
      return NextResponse.json(
        { error: 'Failed to generate coaching notes', details: errorData },
        { status: aiServiceResponse.status }
      )
    }

    const notesData = await aiServiceResponse.json()
    
    console.log('[end-session] Notes data received:', {
      hasSummary: !!notesData.summary,
      hasPillars: !!notesData.pillars,
      hasInsights: !!notesData.insights,
      hasActions: !!notesData.actions,
    })

    // Save notes to database
    let savedNotes
    try {
      savedNotes = await prisma.sessionNotes.create({
        data: {
          sessionId,
          summary: notesData.summary || 'Session completed successfully.',
          pillarsJson: JSON.stringify(notesData.pillars || []),
          actionsJson: JSON.stringify(notesData.actions || []),
          redFlags: notesData.redFlags || null,
          nextFocus: notesData.nextFocus || null,
        },
      })
      console.log('[end-session] Notes saved to database:', savedNotes.id)
    } catch (dbError) {
      console.error('[end-session] Database error:', dbError)
      throw dbError
    }

    // Send email (non-blocking) - don't let email errors fail the request
    if (userEmail) {
      console.log('[end-session] Sending email to:', userEmail)
      sendEmail({
        to: userEmail,
        subject: 'Your Coaching Session Summary and Action Steps',
        html: generateNotesEmailHTML(notesData),
        text: generateNotesEmailText(notesData),
      }).catch((error) => {
        console.error('[end-session] Error sending notes email (non-blocking):', error)
        // Don't fail the request if email fails - email is optional
      })
    } else {
      console.log('[end-session] No user email provided, skipping email send')
    }

    return NextResponse.json({
      success: true,
      message: 'Session ended and notes generated successfully',
      notes: savedNotes,
    })
  } catch (error) {
    console.error('[end-session] Error ending session:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('[end-session] Error details:', { errorMessage, errorStack })
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: errorMessage,
        ...(process.env.NODE_ENV === 'development' && errorStack ? { stack: errorStack } : {})
      },
      { status: 500 }
    )
  }
}

