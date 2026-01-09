import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * Periodically embed key conversation segments and save to CoachMemory
 * This creates long-term memory for the coach
 */
export async function saveToCoachMemory(
  sessionId: string,
  text: string,
  metadata?: Record<string, any>
) {
  try {
    // Create embedding using OpenAI
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small', // Fast and cost-effective
      input: text,
    })

    const embedding = embeddingResponse.data[0].embedding

    // Save to CoachMemory
    await prisma.coachMemory.create({
      data: {
        sessionId,
        text,
        embedding: JSON.stringify(embedding), // Store as JSON string for SQLite
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    })

    console.log(`[CoachMemory] Saved embedding for session ${sessionId}`)
  } catch (error) {
    console.error('[CoachMemory] Error saving embedding:', error)
    // Don't throw - memory is non-critical
  }
}

/**
 * Extract key segments from conversation for long-term memory
 * This should be called periodically (e.g., every 10 messages or at end of session)
 */
export async function processSessionForMemory(sessionId: string) {
  try {
    // Get recent messages from the session
    const messages = await prisma.sessionMessage.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'desc' },
      take: 20, // Last 20 messages
    })

    if (messages.length === 0) return

    // Group messages into meaningful segments (user question + coach answer)
    const segments: string[] = []
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].from === 'user') {
        const userMsg = messages[i].text
        // Find the next coach response
        if (i > 0 && messages[i - 1].from === 'coach') {
          const coachMsg = messages[i - 1].text
          segments.push(`User: ${userMsg}\nCoach: ${coachMsg}`)
        }
      }
    }

    // Save top 3-5 most important segments
    // In production, you might want to score segments by importance
    const importantSegments = segments.slice(0, 5)

    for (const segment of importantSegments) {
      await saveToCoachMemory(sessionId, segment, {
        type: 'conversation_segment',
        timestamp: new Date().toISOString(),
      })
    }

    console.log(`[CoachMemory] Processed ${importantSegments.length} segments for session ${sessionId}`)
  } catch (error) {
    console.error('[CoachMemory] Error processing session:', error)
  }
}

/**
 * Search long-term memory for relevant context
 * Returns similar conversation segments based on embedding similarity
 */
export async function searchCoachMemory(query: string, limit: number = 5) {
  try {
    // Create embedding for the query
    const queryEmbedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    })

    const queryVector = queryEmbedding.data[0].embedding

    // Get all memories (in production, use vector DB like Pinecone or pgvector)
    const memories = await prisma.coachMemory.findMany({
      take: 100, // Limit for now - in production use vector similarity search
      orderBy: { createdAt: 'desc' },
    })

    // Calculate cosine similarity (simplified - in production use proper vector DB)
    const scored = memories.map((memory) => {
      const memoryVector = JSON.parse(memory.embedding) as number[]
      const similarity = cosineSimilarity(queryVector, memoryVector)
      return { ...memory, similarity }
    })

    // Sort by similarity and return top results
    return scored
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .filter((item) => item.similarity > 0.7) // Only return reasonably similar results
  } catch (error) {
    console.error('[CoachMemory] Error searching memory:', error)
    return []
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

