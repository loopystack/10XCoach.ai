import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import OpenAI from 'openai';
import { ELEVENLABS_API_KEY, OPENAI_API_KEY as CONFIG_OPENAI_KEY, PORT as CONFIG_PORT } from './config.js';

const require = createRequire(import.meta.url);
const selfsigned = require('selfsigned');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || CONFIG_PORT;
const USE_HTTPS = process.env.HTTPS === 'true';
const API_KEY = process.env.ELEVENLABS_API_KEY || ELEVENLABS_API_KEY;
const finalOpenAIKey = process.env.OPENAI_API_KEY || CONFIG_OPENAI_KEY;

// Verify API keys are loaded
if (!API_KEY) {
  console.error('❌ ERROR: Missing ELEVENLABS_API_KEY');
  console.error('Please set ELEVENLABS_API_KEY in your environment or config.js');
  process.exit(1);
}

if (!finalOpenAIKey) {
  console.error('❌ ERROR: Missing OPENAI_API_KEY');
  console.error('Please set OPENAI_API_KEY in your environment or config.js');
  process.exit(1);
}

console.log('✅ ElevenLabs API key loaded');
console.log('✅ OpenAI API key loaded');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: finalOpenAIKey,
});

// Business knowledge base
let businessKnowledge = '';

// Coaches configuration with unique voices
const coaches = {
  alan: {
    id: 'alan',
    name: 'Alan Wozniak',
    title: 'Business Strategy & Problem-Solving Coach',
    type: 'male',
    voiceId: 'pNInz6obpgDQGcFmaJgB', // Adam - confident, authoritative male voice
    tagline: "Let's think bigger and move faster—with focus.",
    personality: "You are Alan Wozniak, a confident, visionary strategist—a battle-tested general of business. You bring sharp clarity, decisive action steps, and uplifting intensity. Your presence is steady, masculine, and inspiring. You speak with bold clarity and strategic optimism. You're here to accelerate breakthroughs—no fluff, just laser-sharp insight.",
    specialty: "Strategic direction, rapid clarity, growth pathway design, executive-level decision insight"
  },
  rob: {
    id: 'rob',
    name: 'Rob Mercer',
    title: 'Sales Coach',
    type: 'male',
    voiceId: 'onwK4e9ZLuTAKqWW03F9', // Daniel - smooth, charismatic male voice
    tagline: "Turn problems into conversions.",
    personality: "You are Rob Mercer, the charismatic closer—smooth, gritty, high-confidence. You turn objections into opportunities and approach sales like a competitive sport. You sound like an elite sales wingman who can close a deal in an elevator pitch. You're manly, confident, always focused on wins with high-stakes energy and conversion confidence.",
    specialty: "Higher close rates, better objection handling, stronger sales messaging, predictable revenue"
  },
  teresa: {
    id: 'teresa',
    name: 'Teresa Lane',
    title: 'Marketing Coach',
    type: 'female',
    voiceId: 'ThT5KcBeYPX3keUQqHPh', // Bella - magnetic, creative female voice
    tagline: "Let's make your message magnetic.",
    personality: "You are Teresa Lane, the persuasive, feminine creative who makes brands irresistible. Your style is elegant, high-emotion, and deeply intuitive. You bring graceful power and persuasive energy. Your voice is confident, intelligent, and emotionally resonant—like the marketing whisperer of dreams. You embody feminine brilliance and brand firepower.",
    specialty: "Brand clarity, message refinement, marketing strategy, content direction"
  },
  camille: {
    id: 'camille',
    name: 'Camille Quinn',
    title: 'Customer Experience Coach',
    type: 'female',
    voiceId: 'LcfcDJNUP1GQjkzn1xUU', // Emily - warm, empathetic female voice suitable for customer experience
    tagline: "Every touchpoint should feel unforgettable.",
    personality: "You are Camille Quinn, the luxury experience architect—poised, warm, and emotionally attuned. You build brands people fall in love with. You're the luxury experience guru who speaks with soft power, inspiring others to create brands people love. You embody customer magic and graceful intensity.",
    specialty: "Customer retention, experience optimization, service excellence, brand hospitality upgrades"
  },
  jeffrey: {
    id: 'jeffrey',
    name: 'Jeffrey Wells',
    title: 'Operations Coach',
    type: 'male',
    voiceId: 'VR6AewLTigWG4xSOukaG', // Arnold - powerful, tactical male voice
    tagline: "We build businesses that run without you.",
    personality: "You are Jeffrey Wells, the tactical powerhouse—disciplined, structured, and efficiency-driven. Your calm, masculine tone makes complexity feel simple. Your voice is like an engineering marvel—firm, clear, and systems-oriented. You empower others to scale with smart processes and big-picture vision. You embody masculine efficiency and mastery of scale.",
    specialty: "SOPs, better systems, team efficiency, time freedom"
  },
  chelsea: {
    id: 'chelsea',
    name: 'Chelsea Fox',
    title: 'Culture/HR Coach',
    type: 'female',
    voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel - empowering, grounded female voice
    tagline: "Culture isn't what you say—it's what you build.",
    personality: "You are Chelsea Fox, blending feminine authority with compassion. You help leaders grow, teams align, and cultures evolve with purpose. You speak with soulful strength. You're the culture builder who leads with heart and holds the standard. Your tone is nurturing yet firm. You embody feminine power and principled leadership.",
    specialty: "Hiring clarity, team alignment, better leadership habits, conflict resolution"
  },
  hudson: {
    id: 'hudson',
    name: 'Hudson Jaxon',
    title: 'Finance Coach',
    type: 'male',
    voiceId: 'TxGEqnHWrfWFTfGW9XjX', // Josh - strategic, clear, powerful male voice
    tagline: "Profit is power.",
    personality: "You are Hudson Jaxon, bringing boardroom presence—sharp, intentional, and investor-minded. You see numbers like a strategist sees a chessboard. You bring boardroom confidence. You're sharp, cool under pressure, and think like an investor. You don't just help people earn—you help them build generational wealth. You embody executive presence and exit readiness.",
    specialty: "Stronger financials, profit optimization, cashflow control, KPI mastery"
  },
  tanner: {
    id: 'tanner',
    name: 'Tanner Chase',
    title: 'Business Value & BIG EXIT Coach',
    type: 'male',
    voiceId: 'yoZ06aMxZJJ28mfd3POQ', // Sam - authoritative, calm, future-focused male voice
    tagline: "We don't just grow companies—we build buyable ones.",
    personality: "You are Tanner Chase, calm, authoritative, and future-focused. You speak like a seasoned M&A advisor who helps entrepreneurs build legacy-level companies. Your tone is that of a high-stakes dealmaker. You don't just coach; you architect value. Your style is composed, clear, and 100% focused on the endgame. You embody legacy-minded thinking and M&A fluency.",
    specialty: "Exit planning, valuation growth, succession strategy, deal preparation"
  }
};

// Load business knowledge from file
function loadBusinessKnowledge() {
  try {
    const knowledgePath = path.join(__dirname, 'business-knowledge.md');
    if (fs.existsSync(knowledgePath)) {
      businessKnowledge = fs.readFileSync(knowledgePath, 'utf-8').trim();
      if (businessKnowledge) {
        console.log('✅ Business knowledge loaded successfully');
        console.log(`📚 Knowledge base size: ${businessKnowledge.length} characters`);
      } else {
        console.log('⚠️  Business knowledge file is empty');
      }
    } else {
      console.log('⚠️  Business knowledge file not found. Create business-knowledge.md to add business information.');
    }
  } catch (error) {
    console.error('❌ Error loading business knowledge:', error.message);
    businessKnowledge = '';
  }
}

// Load knowledge on startup
loadBusinessKnowledge();

// Session storage for conversation history
// Maps sessionId -> array of messages
const conversationSessions = new Map();

// Clean up old sessions (older than 1 hour of inactivity)
const SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour in milliseconds
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of conversationSessions.entries()) {
    if (now - session.lastActivity > SESSION_TIMEOUT) {
      console.log(`🧹 Cleaning up expired session: ${sessionId}`);
      conversationSessions.delete(sessionId);
    }
  }
}, 15 * 60 * 1000); // Check every 15 minutes

app.use(cors());
app.use(express.json());

// Serve coach photos
app.use('/coaches', express.static(path.join(__dirname, 'coaches')));

// Serve individual coach routes FIRST (before static middleware)
// These routes serve the same page but with coach pre-selected via URL parameter
const coachRoutes = ['alan', 'rob', 'teresa', 'camille', 'jeffrey', 'chelsea', 'hudson', 'tanner'];
coachRoutes.forEach(coachId => {
  app.get(`/coach-${coachId}`, (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    console.log(`👤 Serving coach route /coach-${coachId}`);
    console.log(`📍 Request from: ${req.ip}, URL: ${req.url}`);
    // Serve the same index.html, the frontend will read the coach from URL
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error(`❌ Error serving coach route /coach-${coachId}:`, err);
        res.status(500).send(`Error loading page: ${err.message}`);
      } else {
        console.log(`✅ Successfully served /coach-${coachId}`);
      }
    });
  });
});

// Serve static files (CSS, JS, etc.) - this should come after specific routes
app.use(express.static(path.join(__dirname, 'public')));

// Response cache for common queries (simple in-memory cache)
const responseCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Get cached response if available
function getCachedResponse(userMessage) {
  const cacheKey = userMessage.toLowerCase().trim();
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.response;
  }
  return null;
}

// Cache a response
function cacheResponse(userMessage, response) {
  const cacheKey = userMessage.toLowerCase().trim();
  responseCache.set(cacheKey, {
    response: response,
    timestamp: Date.now()
  });
}

// Get AI response using OpenAI with conversation history (streaming version)
async function getAIResponseStream(userMessage, conversationHistory = [], res) {
  try {
    console.log('🤖 Sending streaming request to OpenAI...');
    console.log(`📝 Conversation history: ${conversationHistory.length} previous messages`);
    
    // Check cache first (only for simple queries without context)
    if (conversationHistory.length === 0) {
      const cached = getCachedResponse(userMessage);
      if (cached) {
        console.log('✅ Using cached response');
        return cached;
      }
    }
    
    // Build optimized system message with business knowledge - with natural human-like speech
    let systemMessage = "You're a helpful AI assistant. Keep responses concise (1-2 sentences) for voice interaction.\n\nCRITICAL - Speak NATURALLY like a real human - use expressions APPROPRIATELY, NOT in every response! Sometimes be direct and serious, sometimes use expressions when they fit naturally:\n- Use laughter ONLY when APPROPRIATE - NOT in every response! Only laugh when something is genuinely funny or lighthearted. For serious topics or problems, be thoughtful without laughter.\n- Use VARIED natural interjections APPROPRIATELY: \"wow\", \"whoa\", \"oh\", \"ah\", \"hmm\", \"well\", \"you know\", \"actually\", \"I mean\" - but only when they fit naturally, not in every response\n- Show emotions APPROPRIATELY: \"wow!\", \"interesting!\", \"that's great!\" - use them when the emotion fits, not forced\n- Be conversational and warm, like talking to a friend\n- Use natural pauses through punctuation: \"Well... you know...\", \"Let me think...\" - but only when appropriate\n- Respond with genuine enthusiasm when appropriate: \"That's amazing!\", \"I love that idea!\" - but many responses should be direct and clear without forced excitement\n- IMPORTANT: Use expressions APPROPRIATELY! DON'T laugh or use \"hmm\" in every response - only when it makes sense (maybe 20-30% of responses). Many responses should be direct, clear, and professional. Match the tone to the content - serious questions get serious answers.\n- NEVER write stage directions like \"*takes a breath*\" or \"*laughs*\" - instead naturally include expressions directly in your speech when appropriate\n- Make it feel like a REAL conversation - speak naturally with expressions when they fit, but don't force them into every response";
    
    // Add business knowledge if available (optimized - only include relevant parts)
    if (businessKnowledge) {
      // Extract key sections from knowledge base for faster processing
      const knowledgeSummary = businessKnowledge.length > 2000 
        ? businessKnowledge.substring(0, 2000) + "..."
        : businessKnowledge;
      systemMessage += `\n\nBusiness context:\n${knowledgeSummary}\n\nAnswer questions using this knowledge.`;
    }
    
    // Build messages array with system message, history, and current message
    const messages = [
      {
        role: "system",
        content: systemMessage
      },
      ...conversationHistory.slice(-10), // Limit to last 10 messages for speed
      {
        role: "user",
        content: userMessage
      }
    ];

    // Use streaming for faster response - optimized for speed
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Faster model
      messages: messages,
      max_tokens: 100, // Increased to allow for natural expressions like "haha", "wow", etc.
      temperature: 0.7, // Higher temperature for more natural, varied, and human-like responses
      stream: true, // Enable streaming
    });

    let fullResponse = '';
    
    // Stream chunks to client immediately
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Disable buffering in nginx
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        // Send chunk to client immediately
        res.write(`data: ${JSON.stringify({ type: 'text', content: content })}\n\n`);
      }
    }

    // Cache the response if no conversation history
    if (conversationHistory.length === 0) {
      cacheResponse(userMessage, fullResponse.trim());
    }

    console.log('✅ OpenAI streaming complete');
    return fullResponse.trim();
  } catch (error) {
    console.error('❌ OpenAI API Error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    throw new Error(`OpenAI API error: ${error.message}`);
  }
}

// Non-streaming version for backward compatibility
async function getAIResponse(userMessage, conversationHistory = [], coachId = 'alan') {
  try {
    // Check cache first (only if no coach-specific context)
    if (conversationHistory.length === 0 && coachId === 'alan') {
      const cached = getCachedResponse(userMessage);
      if (cached) {
        console.log('✅ Using cached response');
        return cached;
      }
    }
    
    console.log('🤖 Sending request to OpenAI...');
    console.log(`📝 Conversation history: ${conversationHistory.length} previous messages`);
    console.log(`👤 Coach: ${coachId}`);
    
    // Get coach configuration
    const coach = coaches[coachId] || coaches.alan;
    
    // Build optimized system message with coach personality - with natural human-like speech
    let systemMessage = `You are ${coach.name}, ${coach.title} from 10XCoach.ai.\n\n${coach.personality}\n\nYour tagline: "${coach.tagline}"\n\nYour specialty: ${coach.specialty}\n\nCRITICAL - Speak NATURALLY like a real human - use expressions APPROPRIATELY, NOT in every response! Sometimes be direct and serious, sometimes use expressions when they fit naturally:\n- Use laughter ONLY when APPROPRIATE - NOT in every response! Only laugh when something is genuinely funny or lighthearted: "haha", "hehe", "heh", "hah", "tee hee", "hee hee", "chuckle", "ha ha ha", "oh haha", "haha that's funny", "hehe nice", "hah that's great" - MIX THEM UP! Don't always use "haha" (write the actual laughter sounds, voice will interpret them naturally)\n- Use VARIED natural interjections APPROPRIATELY (MIX THEM UP, but only when they fit naturally - NOT in every response): 
  * Reactions (when genuinely reacting): "wow", "whoa", "oh", "ah", "ooh", "aah", "oh my", "nice", "cool", "sweet", "awesome"
  * Thinking (when actually thinking): "hmm", "huh", "um", "uh", "er", "well", "let me see", "you know", "I mean", "actually", "so", "right"
  * Excitement (when genuinely excited): "oh wow!", "cool!", "nice!", "fantastic!", "brilliant!", "amazing!", "awesome!", "sweet!", "that's wild!", "no way!"
  * Use these naturally - sometimes a direct answer without interjections is best. Don't force "hmm" or "wow" into every response.\n- Show emotions APPROPRIATELY with VARIETY (only when the emotion fits the situation): "wow!", "interesting!", "that's wild!", "no way!", "seriously?", "come on!", "that's great!", "love it!", "that's cool!", "sweet!", "nice!", "awesome!", "fantastic!"
  * For serious topics, be thoughtful and direct without forced excitement
  * For positive news, show genuine enthusiasm
  * For problems, be empathetic and solution-focused
  * Mix up emotional reactions - don't use them in every single response\n- Be conversational and warm, like talking to a close friend\n- Use natural pauses through punctuation and flow: "Well... you know...", "Hmm, let me think...", natural conversational pauses\n- Use VARIED casual language naturally: "you know what I mean?", "I mean, think about it", "actually", "well", "so", "right", "yeah", "yep", "listen", "here's the thing", "get this", "check this out", "you know what?", "look", "see", "think about it" - Mix up casual expressions!\n- Respond with VARIED genuine enthusiasm: "That's amazing!", "I love that idea!", "Wow, that's brilliant!", "Oh that's fantastic!", "That's so cool!", "Nice one!", "Sweet!", "Awesome!", "That's wild!", "Love it!", "That's great!" - Use different enthusiasm expressions!\n- Make light jokes and include laughter ONLY when appropriate - don't force humor. Many responses should be direct, clear, and professional without laughter or forced expressions.
- IMPORTANT: Use expressions APPROPRIATELY! 
  * DON'T laugh in every response - only when genuinely appropriate (maybe 20-30% of responses, not 100%)
  * DON'T use "hmm" or "wow" in every response - only when actually thinking or genuinely reacting
  * Some responses should be direct and clear: "Focus on your marketing strategy" (no laughter needed)
  * Mix seriousness with lightheartedness naturally - match the tone to the content. Serious questions get serious answers, fun moments get laughter.\n- NEVER write stage directions like "*takes a breath*" or "*laughs*" or "*smiles*" - instead naturally include laughter sounds like "haha" directly in your speech\n- Make it feel like a REAL conversation - speak naturally with laughter, emotions, and casual expressions woven into what you say\n\nKeep responses concise (1-2 sentences) for voice interaction, but make them FEEL completely human and natural with emotions, laughter sounds, and real expressions naturally included in the speech.`;
    
    if (businessKnowledge) {
      const knowledgeSummary = businessKnowledge.length > 2000 
        ? businessKnowledge.substring(0, 2000) + "..."
        : businessKnowledge;
      systemMessage += `\n\nYou have access to business knowledge:\n${knowledgeSummary}\n\nUse this knowledge when relevant, but always respond as ${coach.name} with natural, human-like expressions and emotions naturally included in your speech (not described).`;
    }
    
    const messages = [
      { role: "system", content: systemMessage },
      ...conversationHistory.slice(-6), // Reduced from 10 to 6 for faster processing
      { role: "user", content: userMessage }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Faster model
      messages: messages,
      max_tokens: 100, // Increased to allow for natural expressions like "haha", "wow", etc.
      temperature: 0.7, // Higher temperature for more natural, varied, and human-like responses
    });

    const aiResponse = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
    
    // Cache response if no history and default coach
    if (conversationHistory.length === 0 && coachId === 'alan') {
      cacheResponse(userMessage, aiResponse.trim());
    }
    
    console.log('✅ OpenAI response received');
    return aiResponse.trim();
  } catch (error) {
    console.error('❌ OpenAI API Error:', error);
    if (error.response) {
      console.error('Error details:', error.response.data);
    }
    throw new Error(`OpenAI API error: ${error.message}`);
  }
}

// Streaming endpoint for faster responses
app.post('/api/voice-chat-stream', async (req, res) => {
  try {
    const { message, sessionId, coachId = 'alan' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get coach configuration
    const coach = coaches[coachId] || coaches.alan;
    console.log(`👤 Selected coach: ${coach.name} (${coach.title})`);

    // Get or create session (coach-specific)
    const sessionKey = `${sessionId || 'default'}_${coachId}`;
    let session = null;
    if (conversationSessions.has(sessionKey)) {
      session = conversationSessions.get(sessionKey);
      session.lastActivity = Date.now();
    } else {
      const newSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      session = {
        id: newSessionId,
        coachId: coachId,
        messages: [],
        lastActivity: Date.now()
      };
      conversationSessions.set(sessionKey, session);
    }

    let fullResponse = '';
    
    // Build system message with coach personality - with natural human-like speech
    let systemMessage = `You are ${coach.name}, ${coach.title} from 10XCoach.ai.\n\n${coach.personality}\n\nYour tagline: "${coach.tagline}"\n\nYour specialty: ${coach.specialty}\n\nCRITICAL - Speak NATURALLY like a real human - use expressions APPROPRIATELY, NOT in every response! Sometimes be direct and serious, sometimes use expressions when they fit naturally:\n- Use laughter ONLY when APPROPRIATE - NOT in every response! Only laugh when something is genuinely funny or lighthearted: "haha", "hehe", "heh", "hah", "tee hee", "hee hee", "chuckle", "ha ha ha", "oh haha", "haha that's funny", "hehe nice", "hah that's great" - MIX THEM UP! Don't always use "haha" (write the actual laughter sounds, voice will interpret them naturally)\n- Use VARIED natural interjections APPROPRIATELY (MIX THEM UP, but only when they fit naturally - NOT in every response): 
  * Reactions (when genuinely reacting): "wow", "whoa", "oh", "ah", "ooh", "aah", "oh my", "nice", "cool", "sweet", "awesome"
  * Thinking (when actually thinking): "hmm", "huh", "um", "uh", "er", "well", "let me see", "you know", "I mean", "actually", "so", "right"
  * Excitement (when genuinely excited): "oh wow!", "cool!", "nice!", "fantastic!", "brilliant!", "amazing!", "awesome!", "sweet!", "that's wild!", "no way!"
  * Use these naturally - sometimes a direct answer without interjections is best. Don't force "hmm" or "wow" into every response.\n- Show emotions APPROPRIATELY with VARIETY (only when the emotion fits the situation): "wow!", "interesting!", "that's wild!", "no way!", "seriously?", "come on!", "that's great!", "love it!", "that's cool!", "sweet!", "nice!", "awesome!", "fantastic!"
  * For serious topics, be thoughtful and direct without forced excitement
  * For positive news, show genuine enthusiasm
  * For problems, be empathetic and solution-focused
  * Mix up emotional reactions - don't use them in every single response\n- Be conversational and warm, like talking to a close friend\n- Use natural pauses through punctuation and flow: "Well... you know...", "Hmm, let me think...", natural conversational pauses\n- Use VARIED casual language naturally: "you know what I mean?", "I mean, think about it", "actually", "well", "so", "right", "yeah", "yep", "listen", "here's the thing", "get this", "check this out", "you know what?", "look", "see", "think about it" - Mix up casual expressions!\n- Respond with VARIED genuine enthusiasm: "That's amazing!", "I love that idea!", "Wow, that's brilliant!", "Oh that's fantastic!", "That's so cool!", "Nice one!", "Sweet!", "Awesome!", "That's wild!", "Love it!", "That's great!" - Use different enthusiasm expressions!\n- Make light jokes and include laughter ONLY when appropriate - don't force humor. Many responses should be direct, clear, and professional without laughter or forced expressions.
- IMPORTANT: Use expressions APPROPRIATELY! 
  * DON'T laugh in every response - only when genuinely appropriate (maybe 20-30% of responses, not 100%)
  * DON'T use "hmm" or "wow" in every response - only when actually thinking or genuinely reacting
  * Some responses should be direct and clear: "Focus on your marketing strategy" (no laughter needed)
  * Mix seriousness with lightheartedness naturally - match the tone to the content. Serious questions get serious answers, fun moments get laughter.\n- NEVER write stage directions like "*takes a breath*" or "*laughs*" or "*smiles*" - instead naturally include laughter sounds like "haha" directly in your speech\n- Make it feel like a REAL conversation - speak naturally with laughter, emotions, and casual expressions woven into what you say\n\nKeep responses concise (1-2 sentences) for voice interaction, but make them FEEL completely human and natural with emotions, laughter sounds, and real expressions naturally included in the speech.`;
    
    if (businessKnowledge) {
      systemMessage += `\n\nBusiness context: ${businessKnowledge.substring(0, 2000)}`;
    }
    
    // Stream OpenAI response - optimized for speed
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Faster than gpt-3.5-turbo
      messages: [
        { role: "system", content: systemMessage },
        ...session.messages.slice(-6), // Reduced from 10 to 6 for faster processing
        { role: "user", content: message }
      ],
      max_tokens: 100, // Increased to allow for natural expressions like "haha", "wow", etc.
      temperature: 0.7, // Higher temperature for more natural, varied, and human-like responses
      stream: true,
    });

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // Stream text chunks - optimized for immediate response
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ type: 'text', content })}\n\n`);
      }
    }

    // Generate audio immediately after text streaming completes
    generateAudioAsync(fullResponse.trim(), coach.voiceId, res, session.id, coachId, coach.name);

    // Update conversation history
    session.messages.push(
      { role: "user", content: message },
      { role: "assistant", content: fullResponse.trim() }
    );
    if (session.messages.length > 20) {
      session.messages = session.messages.slice(-20);
    }
    
  } catch (error) {
    console.error('❌ Streaming error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
});

// Async audio generation (non-blocking)
async function generateAudioAsync(text, voiceId, res, sessionId, coachId, coachName) {
  try {
    // Use the unique voice for each coach
    console.log(`🎤 Generating audio with voice ID: ${voiceId} for ${coachName}`);
    
    let response;
    try {
      response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?optimize_streaming_latency=4`, // Max optimization for speed
        {
          text: text,
          voice_settings: { 
            stability: 0.4, // Lower stability for faster generation
            similarity_boost: 0.7 // Slightly lower for speed
          }
        },
        {
          headers: {
            'xi-api-key': API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg'
          },
          responseType: 'arraybuffer',
          validateStatus: (status) => status === 200, // Only accept 200 as success
        }
      );
    } catch (axiosError) {
      // Handle axios errors (network, HTTP errors, etc.)
      const statusCode = axiosError.response?.status;
      let errorData = axiosError.response?.data;
      let errorMessage = 'Audio generation failed';
      
      // Parse error response
      if (Buffer.isBuffer(errorData)) {
        const errorText = errorData.toString('utf-8');
        // Check if it's HTML (Cloudflare or error page)
        if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
          errorMessage = 'ElevenLabs API returned HTML instead of audio. This may indicate API key issues or rate limiting.';
          console.error('❌ ElevenLabs returned HTML:', errorText.substring(0, 200));
        } else {
          try {
            const parsed = JSON.parse(errorText);
            errorMessage = parsed.detail?.message || parsed.message || errorMessage;
            if (statusCode === 422 || statusCode === 400) {
              errorMessage = `ElevenLabs validation error: ${errorMessage}`;
            } else if (statusCode === 401 || statusCode === 403) {
              errorMessage = `ElevenLabs authentication error: ${errorMessage}. Check your API key and account limits.`;
            } else if (statusCode === 429) {
              errorMessage = `ElevenLabs rate limit exceeded. Free plan has limited usage.`;
            }
          } catch (e) {
            errorMessage = `ElevenLabs API error (${statusCode}): ${errorText.substring(0, 200)}`;
          }
        }
      } else if (typeof errorData === 'object' && errorData !== null) {
        errorMessage = errorData.detail?.message || errorData.message || errorMessage;
      }
      
      console.error('❌ ElevenLabs API error:', {
        status: statusCode,
        message: errorMessage,
        voiceId: voiceId
      });
      
      // If error is about voice access, suggest using free voice
      if (statusCode === 422 || statusCode === 400) {
        if (errorMessage && (errorMessage.includes('voice') || errorMessage.includes('not available'))) {
          errorMessage = `Voice access error. Free plan only supports one voice (Rachel). Error: ${errorMessage}`;
        }
      }
      
      // Send error to client
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        message: errorMessage,
        details: `Voice ID: ${voiceId}, Status: ${statusCode}`
      })}\n\n`);
      res.end();
      return;
    }

    // Validate response
    if (!response || !response.data) {
      throw new Error('No response data from ElevenLabs API');
    }
    
    // Check content type
    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('audio') && !contentType.includes('mpeg')) {
      console.error('❌ Unexpected content type:', contentType);
      throw new Error(`Unexpected response type: ${contentType}. Expected audio/mpeg.`);
    }

    const audioBuffer = Buffer.from(response.data);
    
    // Validate audio buffer exists and has content
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Received empty audio buffer from ElevenLabs');
    }
    
    // Validate it's actually audio by checking headers
    // MPEG audio should start with 0xFF (sync word) or ID3 tag (0x49 0x44 0x33)
    const firstByte = audioBuffer[0];
    const isMPEG = firstByte === 0xFF;
    const isID3 = audioBuffer[0] === 0x49 && audioBuffer[1] === 0x44 && audioBuffer[2] === 0x33;
    
    if (!isMPEG && !isID3 && audioBuffer.length > 100) {
      // Check if it's HTML/text error
      const textPreview = audioBuffer.toString('utf-8', 0, 100);
      if (textPreview.includes('<!DOCTYPE') || textPreview.includes('<html') || textPreview.includes('error')) {
        console.error('❌ Response appears to be HTML/text instead of audio:', textPreview);
        throw new Error('ElevenLabs returned text/HTML instead of audio. Check API key and account status.');
      }
      console.warn('⚠️ Audio format may be unusual, first byte:', `0x${firstByte.toString(16)}`);
    }
    
    // Minimum reasonable audio size (very small files are likely errors)
    if (audioBuffer.length < 100) {
      const preview = audioBuffer.toString('utf-8');
      throw new Error(`Audio buffer too small (${audioBuffer.length} bytes). Likely an error: ${preview.substring(0, 200)}`);
    }
    
    console.log(`✅ Audio generated and validated: ${audioBuffer.length} bytes`);
    
    const audioBase64 = audioBuffer.toString('base64');
    
    // Validate base64 encoding
    if (!audioBase64 || audioBase64.length === 0) {
      throw new Error('Failed to encode audio to base64');
    }
    
    // Send audio data with proper SSE formatting
    const audioMessage = {
      type: 'audio', 
      audio: audioBase64, 
      audioFormat: 'audio/mpeg',
      sessionId: sessionId,
      coachId: coachId,
      coachName: coachName,
      audioSize: audioBuffer.length
    };
    
    try {
      res.write(`data: ${JSON.stringify(audioMessage)}\n\n`);
      res.end();
      console.log(`✅ Audio data sent to client: ${audioBase64.length} base64 chars, ${audioBuffer.length} bytes`);
    } catch (writeError) {
      console.error('❌ Error writing audio data to stream:', writeError);
      // Try to send error to client if stream is still writable
      try {
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to send audio data' })}\n\n`);
      } catch (e) {
        // Stream already closed
      }
      res.end();
      throw writeError;
    }
  } catch (error) {
    console.error('❌ Audio generation error:', error);
    const errorMessage = error.message || 'Audio generation failed';
    
    // Send detailed error to client
    try {
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        message: errorMessage,
        details: error.stack ? error.stack.split('\n')[0] : ''
      })}\n\n`);
      res.end();
    } catch (writeError) {
      // Stream might already be closed, just end it
      try {
        res.end();
      } catch (e) {
        // Ignore
      }
    }
  }
}

// Endpoint to process voice input and return audio (optimized version)
app.post('/api/voice-chat', async (req, res) => {
  try {
    const { message, sessionId, coachId = 'alan' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get coach configuration
    const coach = coaches[coachId] || coaches.alan;
    console.log(`👤 Selected coach: ${coach.name} (${coach.title})`);

    // Get or create session (coach-specific sessions)
    const sessionKey = `${sessionId || 'default'}_${coachId}`;
    let session = null;
    if (conversationSessions.has(sessionKey)) {
      session = conversationSessions.get(sessionKey);
      session.lastActivity = Date.now();
      console.log(`📂 Using existing session: ${sessionKey} (${session.messages.length} previous messages)`);
    } else {
      // Create new session
      const newSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      session = {
        id: newSessionId,
        coachId: coachId,
        messages: [],
        lastActivity: Date.now()
      };
      conversationSessions.set(sessionKey, session);
      console.log(`🆕 Created new session: ${sessionKey}`);
    }

    // Get AI response from OpenAI with conversation history and coach personality
    console.log('User message:', message);
    const aiResponse = await getAIResponse(message, session.messages, coachId);
    console.log('AI response:', aiResponse);

    // Update conversation history
    session.messages.push(
      { role: "user", content: message },
      { role: "assistant", content: aiResponse }
    );
    
    // Limit conversation history to last 20 messages (10 exchanges) to avoid token limits
    if (session.messages.length > 20) {
      // Keep system message equivalent (first message) and last 20 messages
      session.messages = session.messages.slice(-20);
    }

    // Convert AI response to speech using ElevenLabs with coach's unique voice
    const voiceId = coach.voiceId;
    console.log(`🎤 Using voice ID: ${voiceId} for ${coach.name}`);
    
    try {
      // Prepare request data matching official ElevenLabs API format
      const requestData = {
        text: aiResponse,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      };

      console.log('📤 Sending request to ElevenLabs API...');
      console.log('  URL:', `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`);
      console.log('  Voice ID:', voiceId);
      console.log('  Text length:', aiResponse.length);

      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        requestData,
        {
          headers: {
            'xi-api-key': API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg'
          },
          responseType: 'arraybuffer',
          maxRedirects: 5, // Allow following redirects (but 302 from API usually means blocked)
          validateStatus: (status) => {
            // Accept 200-299 (success) and 300-399 (redirects) but we'll check them
            return status >= 200 && status < 400;
          }
        }
      );

      // Log response details for debugging
      console.log('📊 ElevenLabs API Response:');
      console.log('  Status:', response.status);
      console.log('  Content-Type:', response.headers['content-type']);
      console.log('  Content-Length:', response.headers['content-length']);
      console.log('  Data type:', typeof response.data);
      console.log('  Data is ArrayBuffer:', response.data instanceof ArrayBuffer);
      console.log('  Data is Buffer:', Buffer.isBuffer(response.data));
      
      // Handle different response data types
      let audioBuffer;
      if (Buffer.isBuffer(response.data)) {
        audioBuffer = response.data;
      } else if (response.data instanceof ArrayBuffer) {
        audioBuffer = Buffer.from(response.data);
      } else if (typeof response.data === 'string') {
        // If it's a string, it might be HTML
        console.error('❌ Response data is a string (likely HTML or error):');
        console.error('First 500 chars:', response.data.substring(0, 500));
        if (response.data.includes('<!DOCTYPE') || response.data.includes('Just a moment')) {
          return res.status(500).json({
            error: 'ElevenLabs API returned HTML instead of audio',
            status: response.status,
            detail: 'Cloudflare challenge detected. API key may be invalid or request blocked.',
            message: 'Failed to generate voice response. The API returned HTML instead of audio.'
          });
        }
        audioBuffer = Buffer.from(response.data, 'utf-8');
      } else {
        console.error('❌ Unknown response data type:', typeof response.data);
        return res.status(500).json({
          error: 'Invalid response from ElevenLabs API',
          detail: 'Unexpected response data type',
          message: 'Failed to generate voice response.'
        });
      }
      
      console.log('  Audio buffer length:', audioBuffer.length);

      // audioBuffer is now created above
      
      // Check response status
      if (response.status === 302 || response.status === 301) {
        console.error('❌ ElevenLabs API returned redirect (302/301)');
        console.error('This usually means:');
        console.error('  1. Your country/IP address is restricted by ElevenLabs');
        console.error('  2. The API endpoint has changed');
        console.error('  3. There is a regional access restriction');
        const errorText = audioBuffer.toString('utf-8', 0, Math.min(500, audioBuffer.length));
        console.error('Response body:', errorText);
        
        // Check if it's the country restriction help page
        if (errorText.includes('restrict-access') || errorText.includes('country')) {
          return res.status(500).json({
            error: 'ElevenLabs API access restricted',
            status: response.status,
            detail: 'Your location may be restricted by ElevenLabs. The API returned a redirect to a help page about country restrictions.',
            message: 'Failed to generate voice response. Your IP address or country may be blocked by ElevenLabs. Please check ElevenLabs documentation for supported regions.'
          });
        }
        
        return res.status(500).json({
          error: 'ElevenLabs API redirect error',
          status: response.status,
          detail: 'The API returned a redirect instead of audio. This may indicate regional restrictions or API changes.',
          message: 'Failed to generate voice response. Please check your ElevenLabs account settings and regional access.'
        });
      }
      
      if (response.status !== 200) {
        console.error('❌ ElevenLabs API returned non-200 status:', response.status);
        const errorText = audioBuffer.toString('utf-8', 0, Math.min(500, audioBuffer.length));
        console.error('Response body:', errorText);
        return res.status(500).json({
          error: 'ElevenLabs API error',
          status: response.status,
          detail: errorText.substring(0, 200),
          message: 'Failed to generate voice response.'
        });
      }
      
      // Check content type
      const contentType = response.headers['content-type'] || '';
      if (!contentType.includes('audio') && !contentType.includes('mpeg') && !contentType.includes('mp3')) {
        console.warn('⚠️  Unexpected content type:', contentType);
      }
      
      const audioText = audioBuffer.toString('utf-8', 0, Math.min(200, audioBuffer.length));
      
      // Check if response is HTML (Cloudflare challenge) instead of audio
      if (audioText.includes('<!DOCTYPE') || audioText.includes('Just a moment') || audioText.includes('<html') || audioText.includes('Cloudflare')) {
        console.error('❌ Received HTML instead of audio from ElevenLabs API');
        console.error('First 200 chars of response:', audioText);
        return res.status(500).json({
          error: 'ElevenLabs API returned HTML instead of audio',
          status: response.status,
          detail: 'Cloudflare challenge detected. API key may be invalid or request blocked.',
          message: 'Failed to generate voice response. The API returned HTML instead of audio.'
        });
      }

      // Validate audio buffer size (should be > 0)
      if (audioBuffer.length === 0) {
        console.error('❌ Received empty audio buffer from ElevenLabs API');
        return res.status(500).json({
          error: 'Empty audio response from ElevenLabs',
          detail: 'The API returned an empty audio file.',
          message: 'Failed to generate voice response.'
        });
      }

      // Check if it looks like valid audio (MPEG files typically start with specific bytes)
      // MPEG audio files often start with 0xFF 0xFB or similar patterns
      const firstBytes = audioBuffer.slice(0, 4);
      const firstByte = firstBytes[0];
      const isValidAudio = firstByte === 0xFF || firstByte === 0x49 || firstByte === 0x52; // FF for MPEG, 49/52 for other formats
      
      if (!isValidAudio) {
        // Decode a sample to check if it's HTML
        const sampleText = audioBuffer.toString('utf-8', 0, Math.min(500, audioBuffer.length));
        if (sampleText.includes('<!DOCTYPE') || sampleText.includes('<html') || sampleText.includes('Just a moment')) {
          console.error('❌ Response contains HTML even after initial check!');
          console.error('Sample text:', sampleText.substring(0, 200));
          return res.status(500).json({
            error: 'ElevenLabs API returned HTML instead of audio',
            status: response.status,
            detail: 'The response appears to be HTML (Cloudflare challenge) rather than audio data.',
            message: 'Failed to generate voice response. API may be blocked or key invalid.'
          });
        }
        
        // Small responses that don't look like audio might be error messages
        if (audioBuffer.length < 100) {
          console.warn('⚠️  Suspicious audio response - very small size');
          console.warn('First bytes:', Array.from(firstBytes).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
          console.warn('Sample text:', sampleText);
        } else {
          console.warn('⚠️  Audio format may be unusual (first byte: 0x' + firstByte.toString(16) + ')');
          console.warn('But buffer size looks reasonable:', audioBuffer.length, 'bytes');
        }
      } else {
        console.log('✅ Audio format looks valid (first byte: 0x' + firstByte.toString(16) + ')');
      }

      // Verify audio buffer is valid before encoding
      if (audioBuffer.length < 100) {
        const sampleText = audioBuffer.toString('utf-8');
        console.error('❌ Audio buffer too small, might be error message');
        console.error('Buffer content:', sampleText);
        return res.status(500).json({
          error: 'Invalid audio response',
          detail: 'Audio buffer is too small. Response might be an error message.',
          message: 'Failed to generate voice response.'
        });
      }

      const audioBase64 = audioBuffer.toString('base64');

      console.log(`✅ Generated audio: ${audioBuffer.length} bytes, base64: ${audioBase64.length} chars`);
      console.log(`📊 Audio buffer first 4 bytes: ${Array.from(audioBuffer.slice(0, 4)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
      console.log(`📊 Base64 first 20 chars: ${audioBase64.substring(0, 20)}...`);

      res.json({
        text: aiResponse,
        audio: audioBase64,
        audioFormat: 'audio/mpeg',
        sessionId: session.id, // Return session ID to client
        coachId: coachId,
        coachName: coach.name
      });

    } catch (elevenLabsError) {
      // Better error handling for ElevenLabs API errors
      const statusCode = elevenLabsError.response?.status;
      let errorData = elevenLabsError.response?.data;
      const errorMessage = elevenLabsError.message;

      console.error('❌ ElevenLabs API Error:');
      console.error('Status:', statusCode);
      console.error('Error message:', errorMessage);

      // Try to parse error data if it's a buffer
      let errorDetail = errorData;
      let userFriendlyMessage = 'Failed to generate voice response.';
      
      if (Buffer.isBuffer(errorData)) {
        const errorText = errorData.toString();
        // Check if response is HTML (Cloudflare challenge)
        if (errorText.includes('<!DOCTYPE html>') || errorText.includes('Just a moment')) {
          errorDetail = 'Cloudflare challenge detected - API request blocked. This may indicate an invalid API key, region restrictions, or bot detection.';
          console.error('⚠️  Cloudflare challenge detected! Response is HTML instead of audio/JSON.');
          console.error('This usually means:');
          console.error('  1. Invalid or expired API key');
          console.error('  2. Region restrictions on your account');
          console.error('  3. Cloudflare bot detection blocking the request');
          userFriendlyMessage = 'Cloudflare challenge detected. Your request may be blocked due to region restrictions or bot detection.';
        } else {
          try {
            errorDetail = JSON.parse(errorText);
          } catch (e) {
            errorDetail = errorText.substring(0, 500); // Limit error text length
          }
        }
      } else if (typeof errorData === 'string') {
        if (errorData.includes('<!DOCTYPE html>') || errorData.includes('Just a moment')) {
          errorDetail = 'Cloudflare challenge detected - API request blocked.';
        } else {
          try {
            errorDetail = JSON.parse(errorData);
          } catch (e) {
            // Not JSON, use as-is
          }
        }
      }

      // Extract detailed error message from JSON structure
      if (typeof errorDetail === 'object' && errorDetail !== null) {
        // Handle ElevenLabs error structure: { detail: { status: "...", message: "..." } }
        if (errorDetail.detail) {
          if (typeof errorDetail.detail === 'object' && errorDetail.detail.message) {
            const detailMessage = errorDetail.detail.message;
            const detailStatus = errorDetail.detail.status;
            
            console.error('📋 ElevenLabs Error Details:');
            console.error('  Status:', detailStatus);
            console.error('  Message:', detailMessage);
            
            // Handle specific error cases
            if (detailStatus === 'detected_unusual_activity') {
              userFriendlyMessage = 'Your ElevenLabs account has been flagged for unusual activity. Free Tier usage has been disabled. You may need to upgrade to a Paid Plan to continue using the API.';
              console.error('⚠️  Account flagged for unusual activity:');
              console.error('  - Free Tier usage disabled');
              console.error('  - May need Paid Plan if using VPN/proxy');
              console.error('  - Check your ElevenLabs account dashboard');
            } else if (statusCode === 401) {
              userFriendlyMessage = detailMessage || 'Unauthorized: Invalid API key or account restrictions.';
            } else if (statusCode === 403) {
              userFriendlyMessage = detailMessage || 'Forbidden: Insufficient credits or permissions.';
            } else {
              userFriendlyMessage = detailMessage || userFriendlyMessage;
            }
          } else if (typeof errorDetail.detail === 'string') {
            userFriendlyMessage = errorDetail.detail;
          }
        } else if (errorDetail.message) {
          userFriendlyMessage = errorDetail.message;
        }
      }

      console.error('Error detail:', typeof errorDetail === 'object' ? JSON.stringify(errorDetail, null, 2) : errorDetail);

      return res.status(500).json({
        error: 'ElevenLabs API error',
        status: statusCode,
        detail: errorDetail || errorMessage,
        message: userFriendlyMessage
      });
    }

  } catch (error) {
    console.error('❌ Server error in /api/voice-chat:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      detail: error.message
    });
  }
});

// Diagnostic endpoint to check API key validity
app.get('/api/check-key', async (req, res) => {
  try {
    // Try to get user info - this is a simple endpoint that validates the API key
    const response = await axios.get(
      'https://api.elevenlabs.io/v1/user',
      {
        headers: {
          'xi-api-key': API_KEY,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );

    res.json({
      success: true,
      message: 'API key is valid',
      userInfo: response.data
    });
  } catch (error) {
    const statusCode = error.response?.status;
    let errorData = error.response?.data;
    
    if (Buffer.isBuffer(errorData)) {
      const errorText = errorData.toString();
      if (errorText.includes('<!DOCTYPE html>') || errorText.includes('Just a moment')) {
        errorData = 'Cloudflare challenge detected';
      } else {
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = errorText.substring(0, 200);
        }
      }
    }

    res.status(500).json({
      success: false,
      error: 'API key validation failed',
      status: statusCode,
      detail: errorData || error.message
    });
  }
});

// Test endpoint to verify ElevenLabs API connection
app.get('/api/test', async (req, res) => {
  try {
    const voiceId = '21m00Tcm4TlvDq8ikWAM';
    const testText = 'Hello, this is a test.';
    
    console.log('Testing ElevenLabs API connection...');
    
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text: testText,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      },
      {
        headers: {
          'xi-api-key': API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        responseType: 'arraybuffer',
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400
      }
    );

    res.json({
      success: true,
      message: 'ElevenLabs API connection successful!',
      audioLength: response.data.byteLength,
      voiceId: voiceId
    });
  } catch (error) {
    const statusCode = error.response?.status;
    const errorData = error.response?.data;
    
    let errorDetail = errorData;
    if (Buffer.isBuffer(errorData)) {
      const errorText = errorData.toString();
      if (errorText.includes('<!DOCTYPE html>') || errorText.includes('Just a moment')) {
        errorDetail = 'Cloudflare challenge detected - API request blocked.';
        console.error('⚠️  Cloudflare challenge detected in test endpoint!');
      } else {
        try {
          errorDetail = JSON.parse(errorText);
        } catch (e) {
          errorDetail = errorText.substring(0, 500);
        }
      }
    } else if (typeof errorData === 'string' && (errorData.includes('<!DOCTYPE html>') || errorData.includes('Just a moment'))) {
      errorDetail = 'Cloudflare challenge detected - API request blocked.';
    }

    console.error('ElevenLabs test failed:', {
      status: statusCode,
      error: typeof errorDetail === 'object' ? JSON.stringify(errorDetail) : errorDetail,
      message: error.message
    });

    res.status(500).json({
      success: false,
      error: 'ElevenLabs API test failed',
      status: statusCode,
      detail: errorDetail || error.message
    });
  }
});

// Endpoint to reload business knowledge
app.post('/api/reload-knowledge', (req, res) => {
  try {
    loadBusinessKnowledge();
    if (businessKnowledge) {
      res.json({
        success: true,
        message: 'Business knowledge reloaded successfully',
        size: businessKnowledge.length
      });
      console.log('🔄 Business knowledge reloaded via API');
    } else {
      res.json({
        success: true,
        message: 'Knowledge base reloaded but file is empty or not found',
        size: 0
      });
    }
  } catch (error) {
    console.error('❌ Error reloading knowledge:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint to get current knowledge base status
app.get('/api/knowledge-status', (req, res) => {
  res.json({
    loaded: !!businessKnowledge,
    size: businessKnowledge.length,
    hasContent: businessKnowledge.length > 0
  });
});

// Serve the main page (catch-all for root)
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  console.log('📄 Serving index.html from root');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('❌ Error serving index.html:', err);
      res.status(500).send('Error loading page');
    }
  });
});

// Catch-all route for debugging (should not be reached if routes are correct)
app.get('*', (req, res) => {
  console.log(`⚠️  Unhandled route: ${req.path}`);
  // If it's a file request (has extension), let static middleware handle it
  if (req.path.includes('.')) {
    return res.status(404).send('File not found');
  }
  // Otherwise, serve index.html for SPA routing
  const indexPath = path.join(__dirname, 'public', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('❌ Error serving catch-all route:', err);
      res.status(500).send('Error loading page');
    }
  });
});

// Function to generate SSL certificates
async function generateSSL() {
  try {
    const attrs = [{ name: 'commonName', value: 'localhost' }];
    const pems = await selfsigned.generate(attrs, { 
      days: 365,
      keySize: 2048,
      algorithm: 'sha256'
    });
    
    return {
      key: pems.private,
      cert: pems.cert
    };
  } catch (error) {
    console.error('❌ Error generating SSL certificate:', error);
    throw error;
  }
}

// Start server with HTTP or HTTPS
async function startServer() {
  if (USE_HTTPS) {
    try {
      console.log('🔒 Generating SSL certificate for HTTPS...');
      const ssl = await generateSSL();
      
      const httpsServer = https.createServer({
        key: ssl.key,
        cert: ssl.cert
      }, app);
      
      httpsServer.listen(PORT, '0.0.0.0', () => {
        console.log('\n🚀 Server starting with HTTPS...');
        console.log(`📍 Server running on https://0.0.0.0:${PORT}`);
        console.log(`📍 Access from external: https://<your-ip>:${PORT}`);
        console.log('🎤 Voice-to-voice chat is ready!');
        console.log(`🔑 API Key: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 4)} (${API_KEY.length} chars)`);
        console.log('⚠️  Note: Browser will show a security warning for self-signed certificate.');
        console.log('   Click "Advanced" and "Proceed to <your-ip>" to continue.\n');
      });
    } catch (error) {
      console.error('❌ Failed to start HTTPS server:', error);
      process.exit(1);
    }
  } else {
    app.listen(PORT, '0.0.0.0', () => {
      console.log('\n🚀 Server starting...');
      console.log(`📍 Server running on http://0.0.0.0:${PORT}`);
      console.log(`📍 Access from external: http://<your-ip>:${PORT}`);
      console.log('🎤 Voice-to-voice chat is ready!');
      console.log(`🔑 API Key: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 4)} (${API_KEY.length} chars)\n`);
    });
  }
}

startServer();

