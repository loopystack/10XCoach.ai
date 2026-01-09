import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, generateNotesEmailHTML, generateNotesEmailText } from '@/lib/emailService'

export const dynamic = 'force-dynamic'

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001'

/**
 * Generate coaching notes for a session
 * Called at the end of a session
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

    // Get session transcript
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { transcript: true },
    })

    if (!session || !session.transcript) {
      return NextResponse.json(
        { error: 'Session not found or no transcript available' },
        { status: 404 }
      )
    }

    // Check if notes already exist
    const existingNotes = await prisma.sessionNotes.findUnique({
      where: { sessionId },
    })

    if (existingNotes) {
      return NextResponse.json({
        success: true,
        message: 'Notes already generated',
        notes: existingNotes,
      })
    }

    // Call AI service to generate notes
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
      return NextResponse.json(
        { error: 'Failed to generate notes', details: errorData },
        { status: aiServiceResponse.status }
      )
    }

    const notesData = await aiServiceResponse.json()
    
    console.log('[generate-notes] Notes data received:', {
      hasSummary: !!notesData.summary,
      hasPillars: !!notesData.pillars,
      hasInsights: !!notesData.insights,
      hasActions: !!notesData.actions,
    })

    // Save notes to database
    // Note: insights are not stored in the database schema, but are included in email
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
      console.log('[generate-notes] Notes saved to database:', savedNotes.id)
    } catch (dbError) {
      console.error('[generate-notes] Database error:', dbError)
      throw dbError
    }

    // Send email (non-blocking) - don't let email errors fail the request
    if (userEmail) {
      console.log('[generate-notes] Sending email to:', userEmail)
      sendEmail({
        to: userEmail,
        subject: 'Your Coaching Session Summary and Action Steps',
        html: generateNotesEmailHTML(notesData),
        text: generateNotesEmailText(notesData),
      }).catch((error) => {
        console.error('[Email] Error sending notes email (non-blocking):', error)
        // Don't fail the request if email fails - email is optional
      })
    } else {
      console.log('[Email] No user email provided, skipping email send')
    }

    return NextResponse.json({
      success: true,
      notes: savedNotes,
    })
  } catch (error) {
    console.error('[generate-notes] Error generating coaching notes:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('[generate-notes] Error details:', { errorMessage, errorStack })
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

