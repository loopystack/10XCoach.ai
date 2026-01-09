import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId' },
        { status: 400 }
      )
    }

    // Get last 15 messages for the session
    const messages = await prisma.sessionMessage.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' },
      take: 15,
    })

    // Convert to message format for LLM
    const llmMessages = messages.map((msg) => ({
      role: msg.from === 'user' ? 'user' : 'assistant',
      content: msg.text,
    }))

    return NextResponse.json({ messages: llmMessages })
  } catch (error) {
    console.error('Error fetching session context:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

