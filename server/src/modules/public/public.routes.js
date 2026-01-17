const express = require('express')
const router = express.Router()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const OpenAI = require('openai')

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Get Morgan coach data
async function getMorganCoach() {
  const morgan = await prisma.coach.findFirst({
    where: {
      role: 'CHIEF_OF_STAFF',
      active: true
    }
  })
  
  if (!morgan) {
    return {
      name: 'Morgan',
      description: 'Your AI Chief of Staff',
      persona: 'You are Morgan, the AI Chief of Staff for 10XCoach.ai. You help visitors understand our platform, answer questions about coaching services, pricing, features, and guide them through the signup process. Be helpful, friendly, and professional. Keep responses concise and focused on helping visitors learn about 10XCoach.ai.'
    }
  }
  
  return {
    name: morgan.name,
    description: morgan.description || 'Your AI Chief of Staff',
    persona: morgan.personaJson?.persona || 'You are Morgan, the AI Chief of Staff for 10XCoach.ai. You help visitors understand our platform, answer questions about coaching services, pricing, features, and guide them through the signup process. Be helpful, friendly, and professional.'
  }
}

// Public endpoint for Morgan chat (no authentication required)
router.post('/morgan-chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' })
    }

    // Get Morgan's persona
    const morgan = await getMorganCoach()

    // Prepare conversation messages for OpenAI
    const messages = [
      {
        role: 'system',
        content: `${morgan.persona}

Your knowledge about 10XCoach.ai:
- We offer AI-powered business coaching with expert coaches like Alan Wozniak, Rob Mercer, Teresa Lane, and others
- Plans include Foundation, Growth, Scale, and Enterprise tiers
- Features include 10-minute huddles, quizzes, action steps, session notes, todos, and scorecards
- We offer a 14-day free trial
- Pricing starts at $97/month for Foundation plan
- Coaches specialize in strategy, sales, marketing, operations, finance, culture, and exit planning
- Users can schedule meetings, get personalized coaching, and track their business progress

If asked about pricing, plans, or signup, encourage them to visit /signup or /pricing.
If asked about coaches, direct them to /ai-coaches.
Be concise and helpful.`
      },
      // Include conversation history (last 10 messages to avoid token limits)
      ...conversationHistory.slice(-10).map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      })),
      {
        role: 'user',
        content: message.trim()
      }
    ]

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      temperature: 0.7,
      max_tokens: 500
    })

    const response = completion.choices[0]?.message?.content || "I'm here to help! Can you tell me more about what you'd like to know?"

    res.json({
      response: response,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error in Morgan chat:', error)
    res.status(500).json({
      error: 'Failed to process chat message',
      message: error.message
    })
  }
})

module.exports = router

