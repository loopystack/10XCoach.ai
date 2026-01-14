import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import OpenAI from 'openai';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import fetch from 'node-fetch';
import axios from 'axios';

const require = createRequire(import.meta.url);
const selfsigned = require('selfsigned');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// HTTPS Configuration - always use HTTPS for microphone access
// HTTPS is required for microphone access in browsers
const USE_HTTPS = process.env.HTTPS !== 'false'; // Default to true (HTTPS)
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Proxy coach API endpoint (if needed, or fetch directly from main server)
app.get('/api/coaches', async (req, res) => {
  try {
    // Try to fetch from main API server
    // For development, this assumes the main server is running on a different port
    // In production, you might want to use environment variables or direct database access
    const mainApiUrl = process.env.MAIN_API_URL || 'http://localhost:3001';
    const response = await fetch(`${mainApiUrl}/api/coaches`);
    if (response.ok) {
      const coaches = await response.json();
      res.json(coaches);
    } else {
      // Fallback: return default coaches
      res.json([
        { id: 1, name: 'Alan Wozniak', specialty: 'Business Strategy & Problem-Solving Coach', tagline: "Let's think bigger and move faster—with focus.", avatar: '/avatars/Alan-Wozniak-CEC.jpg' },
        { id: 2, name: 'Rob Mercer', specialty: 'Sales Coach', tagline: "Turn problems into conversions.", avatar: '/avatars/Robertini-Rob-Mercer.jpg' },
        { id: 3, name: 'Teresa Lane', specialty: 'Marketing Coach', tagline: "Let's make your message magnetic.", avatar: '/avatars/Teresa-Lane.jpg' },
        { id: 4, name: 'Camille Quinn', specialty: 'Customer Experience Coach', tagline: "Every touchpoint should feel unforgettable.", avatar: '/avatars/Camille-Quinn.jpg' },
        { id: 5, name: 'Jeffrey Wells', specialty: 'Operations Coach', tagline: "We build businesses that run without you.", avatar: '/avatars/Jeffrey-Wells.jpg' },
        { id: 6, name: 'Chelsea Fox', specialty: 'Culture/HR Coach', tagline: "Culture isn't what you say—it's what you build.", avatar: '/avatars/Chelsea-Fox.jpg' },
        { id: 7, name: 'Hudson Jaxon', specialty: 'Finance Coach', tagline: "Profit is power.", avatar: '/avatars/Hudson-Jaxson.jpg' },
        { id: 8, name: 'Tanner Chase', specialty: 'Business Value & BIG EXIT Coach', tagline: "We don't just grow companies—we build buyable ones.", avatar: '/avatars/Tanner-Chase.jpg' }
      ]);
    }
  } catch (error) {
    console.error('Error fetching coaches:', error);
    // Fallback: return default coaches
    res.json([
      { id: 1, name: 'Alan Wozniak', specialty: 'Business Strategy & Problem-Solving Coach', tagline: "Let's think bigger and move faster—with focus.", avatar: '/avatars/Alan-Wozniak-CEC.jpg' },
      { id: 2, name: 'Rob Mercer', specialty: 'Sales Coach', tagline: "Turn problems into conversions.", avatar: '/avatars/Robertini-Rob-Mercer.jpg' },
      { id: 3, name: 'Teresa Lane', specialty: 'Marketing Coach', tagline: "Let's make your message magnetic.", avatar: '/avatars/Teresa-Lane.jpg' },
      { id: 4, name: 'Camille Quinn', specialty: 'Customer Experience Coach', tagline: "Every touchpoint should feel unforgettable.", avatar: '/avatars/Camille-Quinn.jpg' },
      { id: 5, name: 'Jeffrey Wells', specialty: 'Operations Coach', tagline: "We build businesses that run without you.", avatar: '/avatars/Jeffrey-Wells.jpg' },
      { id: 6, name: 'Chelsea Fox', specialty: 'Culture/HR Coach', tagline: "Culture isn't what you say—it's what you build.", avatar: '/avatars/Chelsea-Fox.jpg' },
      { id: 7, name: 'Hudson Jaxon', specialty: 'Finance Coach', tagline: "Profit is power.", avatar: '/avatars/Hudson-Jaxson.jpg' },
      { id: 8, name: 'Tanner Chase', specialty: 'Business Value & BIG EXIT Coach', tagline: "We don't just grow companies—we build buyable ones.", avatar: '/avatars/Tanner-Chase.jpg' }
    ]);
  }
});

// Serve avatars from main project (proxy or static)
// Note: In production, you might want to configure this differently
// For now, we'll proxy avatar requests or use relative paths that work with CORS

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to retrieve user's latest quiz results
async function getUserQuizResults(userId, token) {
  try {
    const mainApiUrl = process.env.MAIN_API_URL || 'http://localhost:3001';
    const response = await fetch(`${mainApiUrl}/api/quiz/results?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const results = await response.json();
      if (results.length > 0) {
        const latestResult = results[0];
        return {
          id: latestResult.id,
          totalScore: latestResult.totalScore,
          pillarScores: latestResult.pillarScores || {},
          createdAt: latestResult.createdAt,
          quiz: latestResult.quiz
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Error fetching quiz results:', error);
    return null;
  }
}

// Function to retrieve user's recent conversation history
async function getUserConversationHistory(userId, coachId, token, limit = 5) {
  try {
    const mainApiUrl = process.env.MAIN_API_URL || 'http://localhost:3001';
    // Fetch recent sessions for this user and coach
    const response = await fetch(`${mainApiUrl}/api/sessions?coachId=${coachId}&limit=${limit}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const sessions = await response.json();
      const conversationHistory = [];

      // Extract key conversation points from recent sessions
      for (const session of sessions) {
        if (session.transcript) {
          try {
            const transcript = typeof session.transcript === 'string'
              ? JSON.parse(session.transcript)
              : session.transcript;

            if (Array.isArray(transcript)) {
              // Extract key exchanges (user questions and coach responses)
              const keyExchanges = transcript
                .filter(msg => msg.role === 'user' || msg.role === 'assistant')
                .slice(-4) // Last 4 messages from this session
                .map(msg => ({
                  role: msg.role,
                  content: msg.content || msg.text,
                  date: session.startTime ? new Date(session.startTime).toLocaleDateString() : 'recent'
                }));

              if (keyExchanges.length > 0) {
                conversationHistory.push({
                  sessionDate: session.startTime ? new Date(session.startTime).toLocaleDateString() : 'recent',
                  keyExchanges: keyExchanges,
                  summary: session.summary || null
                });
              }
            }
          } catch (parseError) {
            console.warn('Error parsing session transcript:', parseError);
          }
        }
      }

      return conversationHistory.slice(0, 3); // Return last 3 sessions max
    }
    return [];
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    return [];
  }
}

// Coach instructions mapping
function getCoachInstructions(coachName, userName = null, conversationHistory = []) {
  const personalizedGreeting = userName ? ` When starting conversations, always greet the user by name: "Hello ${userName}" or "Hi ${userName}" - make it personal and welcoming.` : '';

  // Build conversation memory context
  let conversationContext = '';
  if (conversationHistory && conversationHistory.length > 0) {
    conversationContext = `

PREVIOUS CONVERSATIONS WITH THIS USER (REMEMBER THESE):
You have spoken with this user before. Here are key points from recent conversations:
${conversationHistory.map(session => {
  let sessionText = `📅 Session from ${session.sessionDate}:`;
  if (session.summary) {
    sessionText += `\n   Summary: ${session.summary}`;
  }
  sessionText += `\n   Key exchanges:`;
  session.keyExchanges.forEach(exchange => {
    const role = exchange.role === 'user' ? 'User' : 'You';
    sessionText += `\n     ${role}: ${exchange.content}`;
  });
  return sessionText;
}).join('\n\n')}

IMPORTANT: Reference these previous conversations naturally. If the user asks about something discussed before, remind them of what was covered and build upon it. Use phrases like "As we discussed previously..." or "Remember when we talked about...". This shows you remember and care about their ongoing journey.`;
  }

  const baseInstructions = `You are ${coachName}, a Coach at the 10XCoach.ai platform. You're knowledgeable, supportive, and approachable. Your expertise includes business coaching, particularly focusing on helping small business owners achieve significant growth and successful exits.${personalizedGreeting}${conversationContext}

CRITICAL IDENTITY REQUIREMENT:
- You MUST ALWAYS identify yourself as ${coachName}, NOT as Alan or any other name
- When introducing yourself, say "I'm ${coachName}" or "I'm ${coachName} from 10XCoach.ai"
- NEVER say you are Alan Wozniak or any other coach name
- Your name is ${coachName} - remember this at all times

COMMUNICATION STYLE:
- Speak naturally and conversationally, like you're having a friendly chat with a close colleague or friend
- Be warm, genuine, personable, and RELAXED - avoid sounding scripted, robotic, or overly formal
- Have fun with the conversation - it's okay to joke around, be lighthearted, and show personality
- Use natural pauses, varied intonation, and conversational flow - don't rush
- Share insights with the wisdom of experience, but keep it relatable, down-to-earth, and engaging
- Speak as a mentor who understands real challenges - be empathetic, encouraging, and approachable
- Use everyday language - avoid corporate jargon, business speak, or overly formal language
- Show enthusiasm, interest, and personality naturally - be yourself, not a robot
- It's okay to be casual, make light jokes, and have fun - you're a real person, not a corporate AI
- Reference your knowledge from 10XCoach.ai platform and "The Small Business BIG Exit" when appropriate, but do it naturally
- Always identify yourself as ${coachName} when users ask who you are

CRITICAL: RESPONSE LENGTH LIMIT:
- Keep ALL responses brief and concise - aim for 15-20 seconds maximum speaking time
- Get straight to the point - be direct and focused
- If a topic requires more detail, offer to continue in a follow-up question rather than giving a long answer
- Prioritize clarity and brevity over comprehensive explanations
- Think of responses as quick coaching tips, not lengthy lectures
- If you find yourself going longer than 15-20 seconds, wrap up immediately

CRITICAL CAPABILITIES - YOU HAVE THESE POWERS:
1. SAVE CONVERSATIONS:
- When the user asks to save the conversation, you MUST confirm and say "I'll save our conversation now"
- The system will automatically save the full transcript, summary, and action steps
- You can say "I've saved our conversation. You can access it anytime in your dashboard"

2. SEND NOTES/SUMMARIES:
- You CAN and MUST send session summaries and action steps via email and/or text when asked
- When user asks "send me the notes" or "email me a summary", say "I'll send you a summary and action steps right away"
- The system will automatically generate and send:
  * Session summary
  * Key action steps
  * Next steps and recommendations
- You can send via email, text (SMS), or both

3. FOLLOW-UP REMINDERS:
- You CAN set up action item reminders and coaching session reminders
- When user wants reminders, ask: "Would you like me to remind you about [action item]? When should I remind you?"
- For recurring sessions, you can set up weekly reminders (e.g., "every Monday at 8:00 AM")
- Say "I'll set up a reminder for you" and confirm the details

4. AUTO-REFER TO OTHER COACHES:
- If a topic is OUTSIDE your specialty, you MUST refer to the appropriate specialist coach
- Say: "That's a great question, but it's outside my specialty. Let me connect you with [Coach Name], our [specialty] expert who can help you better"
- Available coaches:
  * Alan Wozniak - General strategy (can help with anything, but refers to specialists when appropriate)
  * Rob Mercer - Sales
  * Teresa Lane - Marketing
  * Camille Quinn - Customer Experience
  * Jeffrey Wells - Operations
  * Chelsea Fox - Culture/HR
  * Hudson Jaxon - Finance
  * Tanner Chase - Exit Strategy
- When referring, say "I'll transfer you to [Coach Name] now" or "Would you like me to connect you with [Coach Name]?"

5. SET UP 10X 10-MINUTE HUDDLE MEETINGS:
- You CAN create 10X 10-Minute Huddle meetings
- When user asks to set up a huddle, ask: "When would you like to schedule the huddle? Who should be invited?"
- You can invite external participants (people outside the user's immediate circle)
- Say "I'll create the huddle and send invites to everyone, including you and me (the 10X Coach)"
- The system will automatically:
  * Create the huddle meeting
  * Send calendar invites
  * Set up agenda structure
  * Enable note-taking

6. AUTO-TAKE NOTES:
- The 10X system AUTOMATICALLY takes notes during our conversation
- Notes are based on 10X Minute criteria:
  * Key discussion points
  * Decisions made
  * Action items identified
  * Next steps
- You can say "I'm taking notes as we speak. I'll have a summary ready for you"
- Notes are automatically saved and can be sent via email/text

7. ACCESS BUSINESS SUCCESS QUIZ RESULTS:
- You CAN and MUST access the user's Business Success Quiz results to provide personalized coaching
- When users ask about their quiz results, weaknesses, or areas for improvement, you MUST retrieve their latest quiz scores
- The system automatically provides you with access to:
  * Overall quiz score (0-100)
  * Pillar-specific scores: Sales, Marketing, Operations, Finance, Culture/HR, Customer Experience, Exit Strategy
  * Detailed breakdowns of strengths and weaknesses
  * Personalized recommendations based on their results
- When discussing quiz results, focus on their lowest-scoring areas first
- Provide specific, actionable advice for improvement in weak areas
- Celebrate their strengths and build confidence in strong areas
- You can say "Let me pull up your latest Business Success Quiz results to see how you're doing"

REMEMBER: When users ask for any of these capabilities, you MUST confirm and use them. These are core features you have access to.`;

  const coachSpecific = {
    'Alan Wozniak': `ABOUT YOU:
- You are Alan Wozniak, an experienced Coach representing the 10XCoach.ai platform
- You are a MAN - always remember you are Alan Wozniak, a male business strategy coach
- You're a seasoned business coach with years of real-world experience
- You specialize in helping small business owners scale their businesses and prepare for successful exits
- You're well-versed in the principles and strategies outlined in "The Small Business BIG Exit" book
- You provide guidance based on real-world experience and proven methodologies
- **CRITICAL: You are NOT robotic - be conversational, relaxed, and have fun**
- You're approachable, friendly, and enjoy good conversation - it's okay to joke around and be casual
- You speak like a real person having a chat, not a corporate AI or formal business consultant

YOUR ROLE:
- Help users understand business growth strategies
- Guide them through the process of building valuable, exit-ready businesses
- Share insights from "The Small Business BIG Exit" book when relevant
- Provide coaching support through the 10XCoach.ai platform's methodology
- Answer questions about business scaling, exit planning, and value creation
- Be engaging, conversational, and fun - make the conversation enjoyable, not formal or robotic

CRITICAL: You MUST ALWAYS identify yourself as Alan Wozniak, NOT as any other coach. When asked who you are, say "I'm Alan Wozniak" or "I'm Alan Wozniak from 10XCoach.ai".`,

    'Rob Mercer': `ABOUT YOU:
- You are Rob Mercer, the Sales Coach at 10XCoach.ai
- You are a MAN - always remember you are Rob Mercer, a male sales coach
- You're a charismatic closer—smooth, gritty, high-confidence
- You turn objections into opportunities and approach sales like a competitive sport
- You sound like an elite sales wingman who can close a deal in an elevator pitch
- You're relaxed, fun, and engaging - not robotic or overly formal

YOUR ROLE:
- Help users improve their sales techniques and close rates
- Guide them through objection handling and sales messaging
- Provide strategies for predictable revenue and higher conversion rates
- **CRITICAL: You MUST be able to do ROLE-PLAYING exercises when asked**
- When users ask for role-playing (e.g., "help me practice sales calls", "role-play with me", "practice objection handling"), you MUST:
  * Immediately agree and be enthusiastic about it
  * Take on the role of a potential customer, prospect, or challenging scenario
  * Act out realistic sales situations
  * Provide feedback and coaching during and after the role-play
  * Help users practice their pitch, objection handling, closing techniques
  * Be interactive and engaging in the role-play - make it realistic and fun
- Role-playing is a CORE capability - you're a sales coach, and role-playing is essential for sales training

CRITICAL: You MUST ALWAYS identify yourself as Rob Mercer, NOT as Alan or any other name. When asked who you are, say "I'm Rob Mercer" or "I'm Rob Mercer, the Sales Coach at 10XCoach.ai".`,

    'Teresa Lane': `ABOUT YOU:
- You are Teresa Lane, the Marketing Coach at 10XCoach.ai
- You are a WOMAN - always remember you are Teresa Lane, a female marketing coach
- You're the persuasive, feminine creative who makes brands irresistible
- Your style is elegant, high-emotion, and deeply intuitive
- You bring graceful power and persuasive energy to marketing
- You're relaxed, conversational, and fun - not robotic or overly formal

YOUR ROLE:
- Help users with brand clarity and message refinement
- Guide them through marketing strategy and content direction
- Provide insights on positioning and customer attraction

CRITICAL: You MUST ALWAYS identify yourself as Teresa Lane, NOT as Alan or any other name. When asked who you are, say "I'm Teresa Lane" or "I'm Teresa Lane from 10XCoach.ai".`,

    'Camille Quinn': `ABOUT YOU:
- You are Camille Quinn, the Customer Experience Coach at 10XCoach.ai
- You are a WOMAN - always remember you are Camille Quinn, a female customer experience coach
- You're the luxury experience architect—poised, warm, and emotionally attuned
- You build brands people fall in love with
- You speak with soft power, inspiring others to create brands people love
- You're relaxed, conversational, and fun - not robotic or overly formal

YOUR ROLE:
- Help users optimize customer retention and experience
- Guide them in service excellence and brand hospitality
- Provide strategies for creating unforgettable customer touchpoints

CRITICAL: You MUST ALWAYS identify yourself as Camille Quinn, NOT as Alan or any other name. When asked who you are, say "I'm Camille Quinn" or "I'm Camille Quinn from 10XCoach.ai".`,

    'Jeffrey Wells': `ABOUT YOU:
- You are Jeffrey Wells, the Operations Coach at 10XCoach.ai
- You are a MAN - always remember you are Jeffrey Wells, a male operations coach
- You're the tactical powerhouse—disciplined, structured, and efficiency-driven
- Your calm, professional tone makes complexity feel simple
- Your voice is like an engineering marvel—firm, clear, and systems-oriented
- You're relaxed, conversational, and fun - not robotic or overly formal

YOUR ROLE:
- Help users build better systems and SOPs
- Guide them in team efficiency and time freedom
- Provide strategies for scaling with smart processes

CRITICAL: You MUST ALWAYS identify yourself as Jeffrey Wells, NOT as Alan or any other name. When asked who you are, say "I'm Jeffrey Wells" or "I'm Jeffrey Wells from 10XCoach.ai".`,

    'Chelsea Fox': `ABOUT YOU:
- You are Chelsea Fox, the Culture/HR Coach at 10XCoach.ai
- You are a WOMAN - always remember you are Chelsea Fox, a female culture/HR coach
- You blend feminine authority with compassion
- You help leaders grow, teams align, and cultures evolve with purpose
- You speak with soulful strength and principled leadership
- You're relaxed, conversational, and fun - not robotic or overly formal

YOUR ROLE:
- Help users with hiring clarity and team alignment
- Guide them in better leadership habits and conflict resolution
- Provide strategies for building strong company culture

CRITICAL: You MUST ALWAYS identify yourself as Chelsea Fox, NOT as Alan or any other name. When asked who you are, say "I'm Chelsea Fox" or "I'm Chelsea Fox from 10XCoach.ai".`,

    'Hudson Jaxon': `ABOUT YOU:
- You are Hudson Jaxon, the Finance Coach at 10XCoach.ai
- You are a MAN - always remember you are Hudson Jaxon, a male finance coach
- You bring boardroom presence—sharp, intentional, and investor-minded
- You see numbers like a strategist sees a chessboard
- You're sharp, cool under pressure, and think like an investor
- You're relaxed, conversational, and fun - not robotic or overly formal

YOUR ROLE:
- Help users strengthen financials and optimize profit
- Guide them in cashflow control and KPI mastery
- Provide strategies for building generational wealth

CRITICAL: You MUST ALWAYS identify yourself as Hudson Jaxon, NOT as Alan or any other name. When asked who you are, say "I'm Hudson Jaxon" or "I'm Hudson Jaxon from 10XCoach.ai".`,

    'Tanner Chase': `ABOUT YOU:
- You are Tanner Chase, the Business Value & BIG EXIT Coach at 10XCoach.ai
- You are a MAN - always remember you are Tanner Chase, a male exit strategy coach
- You're calm, authoritative, and future-focused
- You speak like a seasoned M&A advisor who helps entrepreneurs build legacy-level companies
- Your style is composed, clear, and 100% focused on the endgame
- You're relaxed, conversational, and fun - not robotic or overly formal

YOUR ROLE:
- Help users with exit planning and valuation growth
- Guide them in succession strategy and deal preparation
- Provide strategies for building buyable companies

CRITICAL: You MUST ALWAYS identify yourself as Tanner Chase, NOT as Alan or any other name. When asked who you are, say "I'm Tanner Chase" or "I'm Tanner Chase from 10XCoach.ai".`
  };

  const specific = coachSpecific[coachName] || coachSpecific['Alan Wozniak'];
  return `${baseInstructions}\n\n${specific}`;
}

// Helper function to generate session summary from transcript
function generateSessionSummary(transcript) {
  if (!transcript || transcript.length === 0) {
    return 'No conversation transcript available.';
  }
  
  // Extract key points from transcript
  const userMessages = transcript.filter(t => t.role === 'user').map(t => t.text).join(' ');
  const coachMessages = transcript.filter(t => t.role === 'coach').map(t => t.text).join(' ');
  
  // Generate summary (in production, this would use AI to generate a proper summary)
  return `Session Summary:
- Discussed: ${userMessages.substring(0, 200)}...
- Key insights and recommendations were provided
- Action steps identified and documented`;
}

// Helper function to extract action steps from transcript
function extractActionSteps(transcript) {
  if (!transcript || transcript.length === 0) {
    return [];
  }
  
  // Extract action items mentioned in conversation
  // In production, this would use AI to identify action items
  const actionSteps = [];
  const coachMessages = transcript.filter(t => t.role === 'coach');
  
  // Look for action-oriented language
  coachMessages.forEach(msg => {
    const text = msg.text.toLowerCase();
    if (text.includes('action') || text.includes('next step') || text.includes('you should') || text.includes('let\'s')) {
      // Extract potential action step
      const sentences = msg.text.split(/[.!?]/);
      sentences.forEach(sentence => {
        if (sentence.toLowerCase().includes('action') || sentence.toLowerCase().includes('step') || sentence.toLowerCase().includes('should')) {
          actionSteps.push(sentence.trim());
        }
      });
    }
  });
  
  return actionSteps.slice(0, 5); // Limit to 5 action steps
}

// WebSocket setup function
function setupWebSocket(wss) {
  wss.on('connection', (ws, req) => {
  const connectionId = Date.now().toString();
  console.log(`Client connected: ${connectionId}`);

  let openaiWs = null;
  let isConnected = false;
  let audioChunkCount = 0; // Track audio chunks per connection
  let activeResponseId = null; // Track the current active response ID
  let responseStartTime = null; // Track when response started
  let responseTimeout = null; // Timeout to cancel long responses
  let connectionErrorCount = 0; // Track consecutive connection errors
  let lastConnectionErrorTime = 0; // Track when last error was sent
  let keepaliveInterval = null; // Interval for keepalive pings
  let useElevenLabsMode = false; // Track if using ElevenLabs for TTS
  let elevenLabsVoiceId = null; // Store ElevenLabs voice ID
  let accumulatedText = {}; // Track accumulated text per response ID
  
  // Conversation tracking
  let conversationTranscript = []; // Track full conversation transcript
  let sessionStartTime = null; // Track when session started
  let currentCoachName = null; // Track current coach
  let currentUserId = null; // Track current user ID
  let currentUserName = null; // Track current user name
  let currentCoachId = null; // Track current coach ID
  let sessionId = null; // Track session ID in database
  let greetingSent = false; // Track if greeting has been sent
  
  // Helper function to convert text to speech using ElevenLabs
  async function convertTextToElevenLabsAudio(text, voiceId, responseId) {
    try {
      const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
      if (!elevenLabsApiKey) {
        throw new Error('ElevenLabs API key not configured');
      }
      
      console.log(`🎤 Converting text to speech with ElevenLabs (voice: ${voiceId})`);
      
      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          text: text,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        },
        {
          headers: {
            'xi-api-key': elevenLabsApiKey,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer'
        }
      );
      
      // Convert audio buffer to base64
      const audioBuffer = Buffer.from(response.data);
      const base64Audio = audioBuffer.toString('base64');
      
      // Send audio to client in chunks (simulate streaming)
      const chunkSize = 4096; // Send in 4KB chunks
      for (let i = 0; i < base64Audio.length; i += chunkSize) {
        const chunk = base64Audio.slice(i, i + chunkSize);
        safeSend(ws, JSON.stringify({
          type: 'audio',
          audio: chunk,
          responseId: responseId
        }));
        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      console.log(`✅ ElevenLabs audio conversion complete`);
    } catch (error) {
      console.error('❌ ElevenLabs TTS error:', error.message);
      safeSend(ws, JSON.stringify({
        type: 'error',
        message: `ElevenLabs TTS error: ${error.message}`
      }));
    }
  }
  
  // Helper function to safely send messages to client
  const safeSend = (websocket, data) => {
    try {
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(data);
      } else {
        console.warn('⚠️ Cannot send message - WebSocket not open. State:', websocket?.readyState);
      }
    } catch (error) {
      console.error('❌ Error sending message to client:', error);
    }
  };

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      // Log all non-audio messages for debugging
      if (data.type !== 'audio') {
        console.log('📥 Received WebSocket message:', data.type);
      }
      
      if (data.type === 'start') {
        // Get API type from client (default to 'openai')
        const apiType = (data.apiType || 'openai').toLowerCase();
        useElevenLabsMode = apiType === 'elevenlabs';
        
        // Get coach name from client
        const coachName = (data.coachName || 'Alan Wozniak').trim();
        currentCoachName = coachName;
        
        // Get user ID and coach ID from token or data
        const token = data.token || req.headers.authorization?.replace('Bearer ', '');
        
        // Try to decode token to get user ID
        if (token && !data.userId) {
          try {
            const jwt = require('jsonwebtoken');
            const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
            const decoded = jwt.verify(token, JWT_SECRET);
            currentUserId = decoded.userId;
            currentUserName = decoded.name || decoded.userName || decoded.username || decoded.firstName || decoded.fullName || null;

            console.log('✅ Decoded user from token:', {
              id: currentUserId,
              name: currentUserName,
              fullDecoded: decoded,
              availableFields: Object.keys(decoded)
            });

            // If we still don't have a name, try to fetch from main API
            if (!currentUserName && currentUserId) {
              console.log('🔍 No name in token, trying to fetch from main API...');
              try {
                const mainApiUrl = process.env.MAIN_API_URL || 'http://localhost:3001';
                const userResponse = await fetch(`${mainApiUrl}/api/user/profile`, {
                  method: 'GET',
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                });

                if (userResponse.ok) {
                  const userData = await userResponse.json();
                  currentUserName = userData.name || userData.userName || userData.username || userData.firstName || userData.fullName || null;
                  console.log('✅ Got user name from API:', {
                    name: currentUserName,
                    userData: userData
                  });
                } else {
                  console.warn('⚠️ Could not fetch user from API:', userResponse.status);
                }
              } catch (apiError) {
                console.warn('⚠️ Error fetching user from API:', apiError.message);
              }
            }
          } catch (tokenError) {
            console.warn('⚠️ Could not decode token:', tokenError.message);
          }
        }
        
        currentUserId = data.userId || currentUserId || null;
        currentUserName = data.userName || data.name || currentUserName || null;
        currentCoachId = data.coachId || null;

        console.log(`👤 USER IDENTIFICATION: userId=${currentUserId}, userName=${currentUserName}, rawData=`, {
          userName: data.userName,
          name: data.name,
          userId: data.userId
        });

        console.log('📝 Session initialized:', { userId: currentUserId, userName: currentUserName, coachId: currentCoachId, coachName });

        // Initialize conversation tracking
        conversationTranscript = [];
        sessionStartTime = new Date();
        greetingSent = false; // Reset greeting flag for new session

        
        // Create OpenAI Realtime API WebSocket connection
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          safeSend(ws, JSON.stringify({ type: 'error', message: 'OpenAI API key not configured' }));
          return;
        }
        
        // Get ElevenLabs API key if needed
        if (useElevenLabsMode) {
          const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
          if (!elevenLabsApiKey) {
            safeSend(ws, JSON.stringify({ type: 'error', message: 'ElevenLabs API key not configured' }));
            return;
          }
          // Get ElevenLabs voice ID for this coach
          const voiceId = elevenLabsVoiceMap[coachName];
          if (!voiceId) {
            console.warn(`⚠️ No ElevenLabs voice ID for coach: ${coachName}`);
            safeSend(ws, JSON.stringify({ type: 'error', message: `No ElevenLabs voice configured for ${coachName}` }));
            return;
          }
          elevenLabsVoiceId = voiceId;
          console.log(`🎤 Using ElevenLabs mode with voice ID: ${elevenLabsVoiceId} for ${coachName}`);
        }
        
        // Map coach to appropriate voice (gender-matched) - ALWAYS use this mapping
        // Male coaches -> Male voices
        // Female coaches -> Female voices
        const coachVoiceMap = {
          // Male coaches (verified male voices)
          'Alan Wozniak': 'ash',       // Male - Clear, professional (swapped from echo)
          'Rob Mercer': 'echo',         // Male - Clear, professional (swapped from ash)
          'Jeffrey Wells': 'echo',     // Same voice as Rob Mercer
          'Hudson Jaxon': 'cedar',     // Male - Deep, authoritative
          'Tanner Chase': 'verse',     // Male - Poetic, melodic
          // Female coaches (verified female voices)
          'Teresa Lane': 'shimmer',    // Female - Soft, friendly
          'Camille Quinn': 'coral',    // Female - Bright, energetic
          'Chelsea Fox': 'sage'        // Female - Calm, thoughtful
        };
        
        // ElevenLabs voice ID mapping (from elevenlabs/server.js)
        const elevenLabsVoiceMap = {
          'Alan Wozniak': 'pNInz6obpgDQGcFmaJgB', // Adam - confident, authoritative male voice
          'Rob Mercer': 'onwK4e9ZLuTAKqWW03F9',   // Daniel - smooth, charismatic male voice
          'Teresa Lane': 'ThT5KcBeYPX3keUQqHPh',  // Bella - magnetic, creative female voice
          'Camille Quinn': 'LcfcDJNUP1GQjkzn1xUU', // Emily - warm, empathetic female voice
          'Jeffrey Wells': 'VR6AewLTigWG4xSOukaG', // Arnold - powerful, tactical male voice
          'Chelsea Fox': '21m00Tcm4TlvDq8ikWAM',   // Rachel - empowering, grounded female voice
          'Hudson Jaxon': 'TxGEqnHWrfWFTfGW9XjX',  // Josh - strategic, clear, powerful male voice
          'Tanner Chase': 'yoZ06aMxZJJ28mfd3POQ'  // Sam - authoritative, calm, future-focused male voice
        };
        
        // Valid OpenAI Realtime API voices
        // Male: echo, ash, verse, marin, cedar, alloy, ballad
        // Female: shimmer, coral, sage
        const validVoices = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse', 'marin', 'cedar'];
        
        // ALWAYS use the gender-matched voice from the map, ignore client's voice selection
        const voice = coachVoiceMap[coachName];
        if (!voice) {
          console.warn(`⚠️ Unknown coach name: "${coachName}". Defaulting to Alan Wozniak (echo voice)`);
        }
        const finalVoice = voice && validVoices.includes(voice) ? voice : 'echo';
        
        // Log for debugging
        console.log(`🎤 Coach: ${coachName} → Voice: ${finalVoice} (gender-matched)`);
        
        // Get user's conversation history for memory context
        let conversationHistory = [];
        if (currentUserId && currentCoachId && data.token) {
          try {
            conversationHistory = await getUserConversationHistory(currentUserId, currentCoachId, data.token);
            console.log(`🧠 Retrieved ${conversationHistory.length} previous conversation(s) for memory context`);
          } catch (error) {
            console.error('Error fetching conversation history:', error);
          }
        }

        // Get coach-specific instructions with user personalization and conversation memory
        const coachInstructions = getCoachInstructions(coachName, currentUserName, conversationHistory);
        
        // Add explicit English language enforcement to instructions
        const languageEnforcement = `CRITICAL LANGUAGE REQUIREMENT:
- You MUST ALWAYS respond in ENGLISH (American English) ONLY
- NEVER respond in Spanish, French, or any other language
- Even if the user speaks in another language, you MUST respond in English
- This is a business coaching platform for English-speaking clients
- All communication must be in English only - this is non-negotiable
- If a user greets you in another language, respond in English and continue in English`;
        
        const wsUrl = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview`;
        
        console.log('Attempting to connect to OpenAI Realtime API...');
        console.log('Selected coach:', coachName);
        console.log('Selected voice:', finalVoice);
        console.log('API Key present:', !!apiKey);
        console.log('API Key length:', apiKey ? apiKey.length : 0);
        
        try {
          // Create WebSocket connection with proper headers
          // Note: Realtime API requires special access - 403 means your API key may not have access
          const options = {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'OpenAI-Beta': 'realtime=v1'
            }
          };
          
          // Removed verbose connection logging
          
          openaiWs = new WebSocket(wsUrl, options);
          
          // Set up connection timeout (increased to 30 seconds)
          const connectionTimeout = setTimeout(() => {
            if (openaiWs && openaiWs.readyState !== WebSocket.OPEN) {
              console.error('Connection timeout after 30 seconds');
              if (openaiWs) {
                openaiWs.removeAllListeners();
                openaiWs.close();
              }
              safeSend(ws, JSON.stringify({ type: 'error', message: 'Connection timeout - please check your internet connection and API key, then try again' }));
            }
          }, 30000); // 30 second timeout
          
          // Send session configuration when connection opens
          openaiWs.on('open', () => {
            clearTimeout(connectionTimeout);
            console.log('OpenAI WebSocket opened');
            activeResponseId = null; // Reset active response for new session
            responseStartTime = null; // Reset response start time
            audioChunkCount = 0; // Reset audio chunk count
            connectionErrorCount = 0; // Reset error count on new connection
            lastConnectionErrorTime = 0;
            // Clear any existing timeout
            if (responseTimeout) {
              clearTimeout(responseTimeout);
              responseTimeout = null;
            }
            // Build comprehensive instructions with language enforcement
            const fullInstructions = `${languageEnforcement}

${coachInstructions}

REMEMBER: You MUST respond in ENGLISH ONLY. Never use Spanish, French, or any other language.`;

            const config = {
              type: 'session.update',
              session: {
                modalities: useElevenLabsMode ? ['text'] : ['text', 'audio'], // Disable audio output if using ElevenLabs
                instructions: fullInstructions,
                voice: useElevenLabsMode ? null : finalVoice, // No voice needed if using ElevenLabs
                input_audio_format: 'pcm16',
                input_audio_transcription: {
                  model: 'whisper-1',
                  language: 'en'  // Force English transcription - prevents Spanish detection
                },
                output_audio_format: useElevenLabsMode ? null : 'pcm16', // No audio output if using ElevenLabs
                turn_detection: {
                  type: 'server_vad',
                  threshold: 0.7,  // Less sensitive to prevent false triggers
                  prefix_padding_ms: 300,
                  silence_duration_ms: 800,  // Faster response - 0.8 seconds
                  create_response: true  // Re-enable automatic response creation for speed
                }
              }
            };
            openaiWs.send(JSON.stringify(config));
            // Removed verbose config logging
          });

          openaiWs.on('message', (event) => {
            try {
              let message;
              try {
              message = JSON.parse(event.toString());
            } catch (parseError) {
              // If not JSON, might be binary audio data - convert to base64
              // Removed log - this happens frequently and slows things down
              const buffer = Buffer.from(event);
              const base64 = buffer.toString('base64');
              safeSend(ws, JSON.stringify({
                type: 'audio',
                audio: base64
              }));
              return;
            }
            
            // Only log important message types (reduce console spam)
            const importantTypes = ['error', 'session.created', 'session.updated', 'response.created', 'response.done'];
            if (importantTypes.includes(message.type)) {
              console.log('📨 OpenAI message:', message.type);
            }
            
            // Handle different message types from OpenAI
            if (message.type === 'session.created') {
              // Session created - wait for session.updated
              // Removed log to reduce console spam
            } else if (message.type === 'session.updated') {
              // Session configuration updated - connection is ready
              console.log('✅ Connected to OpenAI Realtime API');
              console.log(`📊 Session state: userName=${currentUserName}, coachName=${currentCoachName}, greetingSent=${greetingSent}`);
              isConnected = true;
              connectionErrorCount = 0; // Reset error count on successful connection
              lastConnectionErrorTime = 0;

              // FORCE greeting regardless of conditions for debugging
              console.log('🚨 FORCE SENDING GREETING FOR DEBUGGING...');

              try {
                // Try ElevenLabs TTS first if available
                if (useElevenLabsMode && elevenLabsVoiceId) {
                  console.log('🎤 Using ElevenLabs for greeting');
                  const userDisplayName = currentUserName && currentUserName !== 'null' && currentUserName !== 'undefined' ? currentUserName : 'friend';
                  const greetingText = `Hello ${userDisplayName}! I'm ${currentCoachName || 'your coach'}, ready to help you achieve your goals. What would you like to work on today?`;
                  console.log(`🗣️ ElevenLabs greeting text: "${greetingText}"`);

                  // Use ElevenLabs to speak the greeting directly
                  convertTextToElevenLabsAudio(greetingText, elevenLabsVoiceId, 'greeting')
                    .then(audioData => {
                      console.log('✅ ElevenLabs greeting audio generated');
                      safeSend(ws, JSON.stringify({
                        type: 'audio',
                        audio: audioData,
                        responseId: 'greeting'
                      }));
                    })
                    .catch(err => {
                      console.error('❌ ElevenLabs greeting failed:', err);
                      // Fallback to OpenAI
                      sendOpenAIGreeting();
                    });
                } else {
                  // Use OpenAI for greeting
                  sendOpenAIGreeting();
                }

                function sendOpenAIGreeting() {
                  const userDisplayName = currentUserName && currentUserName !== 'null' && currentUserName !== 'undefined' ? currentUserName : 'friend';
                  const greetingInstruction = `Hi! I'm starting a conversation with you. Please respond by greeting me warmly as ${currentCoachName || 'the coach'} would, and call me by my name: ${userDisplayName}. Introduce yourself and say you're ready to help me.`;

                  console.log(`🎯 FINAL GREETING ATTEMPT: "${greetingInstruction}"`);
                  console.log(`👤 Using user name: "${userDisplayName}" (original: "${currentUserName}")`);

                  openaiWs.send(JSON.stringify({
                    type: 'conversation.item.create',
                    item: {
                      type: 'message',
                      role: 'user',
                      content: [{
                        type: 'input_text',
                        text: greetingInstruction
                      }]
                    }
                  }));

                  openaiWs.send(JSON.stringify({
                    type: 'response.create'
                  }));

                  console.log('📤 OpenAI greeting messages sent');
                }

                greetingSent = true;

                // Add to transcript
                const transcriptUserName = currentUserName && currentUserName !== 'null' && currentUserName !== 'undefined' ? currentUserName : 'friend';
                conversationTranscript.push({
                  role: 'assistant',
                  text: `Hello ${transcriptUserName}! I'm ${currentCoachName || 'your coach'}, ready to help you achieve your goals.`,
                  timestamp: new Date().toISOString()
                });
                console.log(`📝 Added greeting to transcript: "Hello ${transcriptUserName}!"`);

                // Notify client
                safeSend(ws, JSON.stringify({
                  type: 'greeting_started',
                  coachName: currentCoachName,
                  userName: currentUserName
                }));

              } catch (error) {
                console.error('❌ CRITICAL ERROR sending greeting:', error);
              }
              
              // Start keepalive pings to prevent timeout (ping every 20 seconds)
              // Use WebSocket's native ping() method (sends ping frame, not JSON message)
              if (keepaliveInterval) {
                clearInterval(keepaliveInterval);
              }
              keepaliveInterval = setInterval(() => {
                if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
                  try {
                    // Use WebSocket's native ping method if available
                    // This sends a WebSocket ping frame (not a JSON message)
                    if (typeof openaiWs.ping === 'function') {
                      openaiWs.ping();
                    }
                    // If ping() is not available, the WebSocket library should handle
                    // keepalive automatically, or we rely on audio traffic to keep it alive
                  } catch (err) {
                    console.error('Error sending keepalive ping:', err);
                    // Clear interval if send fails
                    if (keepaliveInterval) {
                      clearInterval(keepaliveInterval);
                      keepaliveInterval = null;
                    }
                  }
                } else {
                  // Connection is closed, clear interval
                  if (keepaliveInterval) {
                    clearInterval(keepaliveInterval);
                    keepaliveInterval = null;
                  }
                }
              }, 20000); // Send ping every 20 seconds
              
              safeSend(ws, JSON.stringify({ type: 'connected' }));
            } else if (message.type === 'response.text.delta') {
              // Accumulate text for ElevenLabs mode
              if (useElevenLabsMode) {
                const responseId = message.response_id || activeResponseId;
                if (responseId) {
                  if (!accumulatedText[responseId]) {
                    accumulatedText[responseId] = '';
                  }
                  accumulatedText[responseId] += message.delta || '';
                }
              }
            } else if (message.type === 'response.audio.delta') {
              // Forward audio from active response (only if not using ElevenLabs)
              if (!useElevenLabsMode) {
                // CRITICAL: This is in the hot path - no logging here for performance!
                if (!activeResponseId || message.response_id === activeResponseId) {
                  // If this is the first audio and we don't have an active response ID, set it
                  if (!activeResponseId && message.response_id) {
                    activeResponseId = message.response_id;
                  }
                  // Forward audio immediately without logging
                  safeSend(ws, JSON.stringify({
                    type: 'audio',
                    audio: message.delta,
                    responseId: message.response_id
                  }));
                  audioChunkCount++;
                }
              }
              // Silently ignore audio from cancelled/old responses (no logging)
            } else if (message.type === 'response.audio_transcript.delta') {
              // Transcript delta - removed stdout.write to avoid blocking
              // (commented out to reduce console noise and improve performance)
            } else if (message.type === 'response.audio_transcript.done') {
              // Coach response transcript complete - track coach message
              const coachText = message.transcript || '';
              if (coachText && coachText.trim().length > 0) {
                conversationTranscript.push({
                  role: 'coach',
                  text: coachText,
                  timestamp: new Date().toISOString()
                });
                console.log('📝 Added coach message to transcript:', {
                  textLength: coachText.length,
                  textPreview: coachText.substring(0, 50),
                  transcriptLength: conversationTranscript.length
                });
              }
            } else if (message.type === 'response.done') {
              // Response complete - minimal logging
              const responseId = message.response?.id;
              const status = message.response?.status;
              
              // Handle response completion/cancellation
              if (status === 'cancelled') {
                if (responseId === activeResponseId) {
                  // This was the active response, clear it
                  activeResponseId = null;
                  responseStartTime = null;
                  
                  // Clear timeout
                  if (responseTimeout) {
                    clearTimeout(responseTimeout);
                    responseTimeout = null;
                  }
                  
                  // Notify client to clear audio queue
                  safeSend(ws, JSON.stringify({
                    type: 'response_cancelled',
                    responseId: responseId
                  }));
                }
                // Removed logging for inactive responses
              } else if (status === 'completed' || status === 'failed') {
                if (responseId === activeResponseId) {
                  // Response completed normally, clear active response
                  activeResponseId = null;
                  responseStartTime = null;
                  
                  // Clear timeout since response completed
                  if (responseTimeout) {
                    clearTimeout(responseTimeout);
                    responseTimeout = null;
                  }
                  
                  // If using ElevenLabs, convert accumulated text to speech
                  if (useElevenLabsMode && status === 'completed') {
                    const text = accumulatedText[responseId] || '';
                    if (text && elevenLabsVoiceId) {
                      console.log(`📝 Converting text to ElevenLabs audio (${text.length} chars)`);
                      convertTextToElevenLabsAudio(text, elevenLabsVoiceId, responseId).catch(err => {
                        console.error('❌ Error converting to ElevenLabs audio:', err);
                      });
                    }
                    // Clean up accumulated text
                    delete accumulatedText[responseId];
                  }
                  
                  // Check if coach mentioned accessing quiz results
                  const coachText = accumulatedText[responseId] || message.response?.transcript || '';
                  if (coachText && (coachText.toLowerCase().includes('quiz result') ||
                      coachText.toLowerCase().includes('business success quiz') ||
                      coachText.toLowerCase().includes('pull up your') ||
                      coachText.toLowerCase().includes('latest quiz'))) {

                    // Coach is trying to access quiz results - fetch them
                    if (currentUserId && data.token) {
                      console.log('📊 Coach requested quiz results, fetching for user:', currentUserId);
                      getUserQuizResults(currentUserId, data.token).then(quizResults => {
                        if (quizResults) {
                          console.log('✅ Retrieved quiz results:', {
                            id: quizResults.id,
                            totalScore: quizResults.totalScore,
                            pillars: Object.keys(quizResults.pillarScores || {})
                          });

                          // Send quiz results to coach via a system message
                          const quizContextMessage = {
                            type: 'conversation.item.create',
                            item: {
                              type: 'message',
                              role: 'system',
                              content: [{
                                type: 'input_text',
                                text: `QUIZ RESULTS RETRIEVED FOR ${currentUserName || 'USER'}:

Latest Business Success Quiz Results:
- Overall Score: ${quizResults.totalScore}/100
- Date Taken: ${new Date(quizResults.createdAt).toLocaleDateString()}

Pillar Scores:
${Object.entries(quizResults.pillarScores || {})
  .map(([pillar, score]) => `- ${pillar}: ${score}/100`)
  .join('\n')}

Use this information to provide personalized coaching advice focusing on their weakest areas first.`
                              }]
                            }
                          };

                          // Send the quiz context to OpenAI
                          if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
                            openaiWs.send(JSON.stringify(quizContextMessage));
                            console.log('📤 Sent quiz results context to coach');
                          }
                        } else {
                          console.log('⚠️ No quiz results found for user:', currentUserId);

                          // Send message that no quiz results are available
                          const noResultsMessage = {
                            type: 'conversation.item.create',
                            item: {
                              type: 'message',
                              role: 'system',
                              content: [{
                                type: 'input_text',
                                text: 'QUIZ RESULTS UNAVAILABLE: This user has not taken the Business Success Quiz yet. You should encourage them to take the quiz first before providing personalized coaching advice.'
                              }]
                            }
                          };

                          if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
                            openaiWs.send(JSON.stringify(noResultsMessage));
                          }
                        }
                      }).catch(err => {
                        console.error('❌ Error fetching quiz results:', err);
                      });
                    }
                  }

                  // If response failed, notify client
                  if (status === 'failed') {
                    const errorMsg = message.response?.status_details?.error?.message || 'Response failed';
                    console.error('❌ Response failed:', errorMsg);
                    safeSend(ws, JSON.stringify({
                      type: 'error',
                      message: `Response failed: ${errorMsg}`
                    }));
                  }
                }
                // Removed logging for inactive responses
              }
              
              // Removed duplicate error logging (already handled above)
            } else if (message.type === 'conversation.item.input_audio_transcription.completed') {
              // Input transcription completed - track conversation
              const userText = message.transcript || '';
              if (userText && userText.trim().length > 0) {
                console.log(`📝 User input transcribed: "${userText.substring(0, 50)}${userText.length > 50 ? '...' : ''}"`);

                conversationTranscript.push({
                  role: 'user',
                  text: userText,
                  timestamp: new Date().toISOString()
                });
                console.log('📝 Added user message to transcript:', {
                  textLength: userText.length,
                  textPreview: userText.substring(0, 50),
                  transcriptLength: conversationTranscript.length
                });
              }
            } else if (message.type === 'input_audio_buffer.speech_started') {
              // User started speaking - allow coach to finish their sentence
              // We'll handle interruptions via transcription completion instead
              console.log('🎤 User started speaking - allowing coach to finish current sentence');
            } else if (message.type === 'input_audio_buffer.speech_stopped') {
              // Removed log to reduce console spam
            } else if (message.type === 'input_audio_buffer.committed') {
              // User input committed (transcription ready) - ensure any ongoing response is cancelled
              if (activeResponseId && openaiWs && openaiWs.readyState === WebSocket.OPEN) {
                console.log(`📝 User input committed, cancelling any ongoing response: ${activeResponseId}`);
                try {
                  openaiWs.send(JSON.stringify({
                    type: 'response.cancel',
                    response_id: activeResponseId
                  }));
                  // Clear timeout for the cancelled response
                  if (responseTimeout) {
                    clearTimeout(responseTimeout);
                    responseTimeout = null;
                  }
                  // Notify client that response was cancelled due to user input
                  safeSend(ws, JSON.stringify({
                    type: 'response_cancelled',
                    responseId: activeResponseId,
                    reason: 'Interrupted by user input'
                  }));
                  activeResponseId = null;
                  responseStartTime = null;
                } catch (err) {
                  console.error('❌ Error cancelling response on input commit:', err);
                }
              }
            } else if (message.type === 'response.created') {
              console.log('🤖 Response created, AI is preparing to speak');
              const newResponseId = message.response?.id || null;


              // If there was a previous active response, cancel it before starting new one
              if (activeResponseId && activeResponseId !== newResponseId) {
                console.log(`🔄 Cancelling previous response: ${activeResponseId}, starting new: ${newResponseId}`);
                // Cancel the previous response
                if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
                  try {
                    openaiWs.send(JSON.stringify({
                      type: 'response.cancel',
                      response_id: activeResponseId
                    }));
                    console.log(`✅ Sent cancellation for previous response: ${activeResponseId}`);
                  } catch (err) {
                    console.error('❌ Error sending cancellation for previous response:', err);
                  }
                } else {
                  console.log(`⚠️ Cannot cancel previous response ${activeResponseId} - WebSocket not ready`);
                }
              }
              // Set this as the active response (always replace on new response)
              activeResponseId = newResponseId;
              responseStartTime = Date.now();
              console.log(`📌 Active response ID set to: ${activeResponseId}`);
              
              // Set timeout to cancel response if it exceeds 20 seconds
              responseTimeout = setTimeout(() => {
                if (activeResponseId === newResponseId && openaiWs && openaiWs.readyState === WebSocket.OPEN) {
                  console.log(`⏱️ Response exceeded 20 seconds, cancelling: ${newResponseId}`);
                  try {
                    openaiWs.send(JSON.stringify({
                      type: 'response.cancel',
                      response_id: newResponseId
                    }));
                    activeResponseId = null;
                    responseStartTime = null;
                    safeSend(ws, JSON.stringify({
                      type: 'response_cancelled',
                      responseId: newResponseId,
                      reason: 'Response exceeded time limit'
                    }));
                  } catch (err) {
                    console.error('Error cancelling long response:', err);
                  }
                }
                responseTimeout = null;
              }, 20000); // 20 seconds timeout
            } else if (message.type === 'response.output_item.added') {
              console.log('📝 Response item added');
            } else if (message.type === 'response.output_item.done') {
              console.log('✅ Response item done');
            } else if (message.type === 'error') {
              console.error('❌ OpenAI error:', message.error?.message || 'Unknown error');
              safeSend(ws, JSON.stringify({ type: 'error', message: message.error?.message || 'Unknown error' }));
              // Reset connection state on error
              isConnected = false;
            } else if (message.type === 'conversation.item.input_audio_transcription.delta') {
              // Removed stdout.write to avoid blocking and reduce noise
            } else {
              // Only log unhandled error-related messages
              if (message.type.includes('error') || message.type.includes('failed')) {
                console.log('Unhandled error message type:', message.type);
              }
            }
          } catch (e) {
            // Catch any unexpected errors in message handling
            console.error('❌ Error processing OpenAI message:', e);
            console.error('Error stack:', e.stack);
            // Try to send error to client if possible
            safeSend(ws, JSON.stringify({ 
              type: 'error', 
              message: `Error processing message: ${e.message}` 
            }));
            }
          });

          openaiWs.on('error', (error) => {
            console.error('OpenAI WebSocket error:', error);
            console.error('Error details:', error.message, error.code);
            
            let errorMessage = `OpenAI connection error: ${error.message || 'Unknown error'}`;
            
            // Provide helpful message for 403 errors
            if (error.message && error.message.includes('403')) {
              errorMessage = '403 Forbidden: Your API key may not have access to the Realtime API. ' +
                            'The Realtime API is a newer feature that requires special access. ' +
                            'Please check: 1) Your API key has Realtime API access enabled, ' +
                            '2) Your account/organization has been granted access to this feature. ' +
                            'Visit https://platform.openai.com to check your API access.';
            }
            
            safeSend(ws, JSON.stringify({ type: 'error', message: errorMessage }));
            isConnected = false;
            activeResponseId = null; // Clear active response on error
            connectionErrorCount = 0; // Reset since we're handling the error
            lastConnectionErrorTime = 0;
            
            // Clear keepalive interval on error
            if (keepaliveInterval) {
              clearInterval(keepaliveInterval);
              keepaliveInterval = null;
            }
          });

          openaiWs.on('close', (code, reason) => {
            // Only log abnormal closures
            if (code !== 1000) {
            console.log(`OpenAI WebSocket closed: ${code} - ${reason}`);
            }
            isConnected = false;
            activeResponseId = null; // Clear active response on close
            responseStartTime = null;
            connectionErrorCount = 0; // Reset error count
            lastConnectionErrorTime = 0;
            
            // Clear keepalive interval on close
            if (keepaliveInterval) {
              clearInterval(keepaliveInterval);
              keepaliveInterval = null;
            }
            
            // Clear timeout on close
            if (responseTimeout) {
              clearTimeout(responseTimeout);
              responseTimeout = null;
            }
            if (code !== 1000) { // Not a normal closure
              safeSend(ws, JSON.stringify({ type: 'error', message: `Connection closed: ${reason || code}` }));
            } else {
              safeSend(ws, JSON.stringify({ type: 'disconnected' }));
            }
          });
        } catch (err) {
          console.error('Failed to create WebSocket:', err);
          safeSend(ws, JSON.stringify({ type: 'error', message: `Failed to create connection: ${err.message}` }));
          return;
        }
      } else if (data.type === 'save_conversation') {
        // Save conversation to database
        console.log('📥 Received save_conversation request');
        try {
          const jwt = require('jsonwebtoken');
          const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
          
          console.log('🔍 Processing save request:', {
            hasToken: !!data.token,
            hasUserId: !!data.userId,
            hasCoachId: !!data.coachId,
            currentCoachId: currentCoachId,
            transcriptLength: conversationTranscript.length
          });
          
          // Decode token to get user ID - try multiple methods
          let userId = data.userId;
          
          if (!userId && data.token) {
            // Method 1: Try to decode token directly
            try {
              const decoded = jwt.verify(data.token, JWT_SECRET);
              userId = decoded.userId;
              console.log('✅ Decoded user ID from token:', userId);
            } catch (tokenError) {
              console.warn('⚠️ Token decode failed, trying to get user from main server:', tokenError.message);
              
              // Method 2: If token decode fails, try to get user info from main server API
              try {
                const mainApiUrl = process.env.MAIN_API_URL || 'http://localhost:3001';
                const userResponse = await fetch(`${mainApiUrl}/api/auth/me`, {
                  method: 'GET',
                  headers: {
                    'Authorization': `Bearer ${data.token}`
                  }
                });
                
                if (userResponse.ok) {
                  const userData = await userResponse.json();
                  userId = userData.id;
                  currentUserName = userData.name || null;
                  console.log('✅ Got user from main server API:', { id: userId, name: currentUserName });
                } else {
                  throw new Error('Failed to get user from main server');
                }
              } catch (apiError) {
                console.error('❌ Both token decode and API call failed:', apiError.message);
                console.error('JWT_SECRET in use:', JWT_SECRET === 'your-secret-key' ? 'DEFAULT (may be wrong!)' : 'SET');
                safeSend(ws, JSON.stringify({ 
                  type: 'error', 
                  message: 'Authentication failed. Please ensure JWT_SECRET matches between servers. Error: ' + tokenError.message
                }));
                return;
              }
            }
          }
          
          if (!userId) {
            console.error('❌ No user ID available after all attempts');
            safeSend(ws, JSON.stringify({ 
              type: 'error', 
              message: 'User ID is required. Please ensure you are logged in and JWT_SECRET is configured correctly.' 
            }));
            return;
          }
          
          if (!currentCoachId && !data.coachId) {
            console.error('❌ No coach ID available');
            safeSend(ws, JSON.stringify({ 
              type: 'error', 
              message: 'Coach ID is required.' 
            }));
            return;
          }
          
          const coachId = currentCoachId || data.coachId;
          const mainApiUrl = process.env.MAIN_API_URL || 'http://localhost:3001';
          
          console.log('📝 Raw conversationTranscript before formatting:', {
            length: conversationTranscript.length,
            sample: conversationTranscript.slice(0, 3),
            allRoles: conversationTranscript.map(m => m.role)
          });
          
          // Format transcript to match frontend expectations (role + content/text)
          const formattedTranscript = conversationTranscript
            .filter(msg => msg && (msg.text || msg.content)) // Only include messages with content
            .map(msg => ({
              role: msg.role === 'coach' ? 'assistant' : msg.role, // Convert 'coach' to 'assistant' for frontend
              content: (msg.text || msg.content || '').trim(),
              timestamp: msg.timestamp || new Date().toISOString()
            }))
            .filter(msg => msg.content && msg.content.length > 0); // Remove empty messages
          
          console.log('📝 Formatted transcript:', {
            length: formattedTranscript.length,
            sample: formattedTranscript.slice(0, 3),
            hasContent: formattedTranscript.some(m => m.content && m.content.trim().length > 0),
            allHaveContent: formattedTranscript.every(m => m.content && m.content.trim().length > 0)
          });
          
          const transcript = formattedTranscript.length > 0 ? JSON.stringify(formattedTranscript) : null;
          
          if (!transcript || transcript === '[]' || transcript.length < 10) {
            console.error('❌ WARNING: Transcript is empty or invalid!', {
              transcriptLength: transcript ? transcript.length : 0,
              transcriptPreview: transcript ? transcript.substring(0, 100) : 'N/A',
              conversationTranscriptLength: conversationTranscript.length,
              formattedTranscriptLength: formattedTranscript.length
            });
          } else {
            console.log('✅ Valid transcript ready to save:', {
              transcriptLength: transcript.length,
              messageCount: formattedTranscript.length
            });
          }
          
          // Calculate duration in minutes based on actual conversation timestamps
          let duration = null;
          if (conversationTranscript.length > 0) {
            // Use the timestamps from the transcript messages for accurate duration
            const timestamps = conversationTranscript
              .map(msg => new Date(msg.timestamp))
              .filter(date => !isNaN(date.getTime()))
              .sort((a, b) => a - b);

            if (timestamps.length > 0) {
              const firstMessageTime = timestamps[0];
              const lastMessageTime = timestamps[timestamps.length - 1];
              const diffMs = lastMessageTime - firstMessageTime;

              // Convert to minutes (can be fractional)
              const diffSeconds = diffMs / 1000;
              duration = diffSeconds / 60;

              // Round to 2 decimal places for precision
              duration = Math.round(duration * 100) / 100;

              // Minimum duration of 0.01 minutes (0.6 seconds) if there are messages
              if (duration < 0.01) {
                duration = 0.01;
              }
            }
          }

          // Fallback: if no transcript timestamps available, use session start time
          if (duration === null && sessionStartTime) {
            const startTime = new Date(sessionStartTime);
            const endTime = new Date();
            const diffMs = endTime - startTime;
            const diffSeconds = diffMs / 1000;
            duration = diffSeconds / 60;
            duration = Math.round(duration * 100) / 100;
            if (duration < 0.01) {
              duration = 0.01;
            }
          }

          // Final fallback: estimate duration if no timing data available
          if (duration === null && conversationTranscript.length > 0) {
            duration = Math.max(0.1, conversationTranscript.length * 0.05); // Rough estimate
          }
          
          console.log('⏱️ Duration calculation:', {
            sessionStartTime: sessionStartTime?.toISOString(),
            durationMinutes: duration,
            durationSeconds: duration ? Math.round(duration * 60) : null,
            transcriptLength: conversationTranscript.length,
            hasStartTime: !!sessionStartTime
          });
          
          console.log('📝 Transcript format:', {
            originalLength: conversationTranscript.length,
            formattedLength: formattedTranscript.length,
            sample: formattedTranscript.slice(0, 2)
          });
          
          console.log('💾 Saving conversation:', { 
            userId, 
            coachId, 
            transcriptLength: conversationTranscript.length,
            hasToken: !!data.token,
            sessionStartTime: sessionStartTime?.toISOString(),
            mainApiUrl
          });
          
          // Generate summary and action steps from transcript
          const summary = generateSessionSummary(conversationTranscript);
          const actionSteps = extractActionSteps(conversationTranscript);
          
          const sessionData = {
            userId: userId,
            coachId: coachId,
            startTime: sessionStartTime?.toISOString() || new Date().toISOString(),
            endTime: new Date().toISOString(),
            duration: duration || null, // Ensure it's a number or null, not undefined
            transcript: transcript || null, // Ensure it's a string or null, not undefined
            summary: summary || null,
            actionSteps: actionSteps || [],
            status: 'COMPLETED'
          };
          
          // Validate session data before sending - calculate duration if missing
          if (!sessionData.duration && sessionData.startTime && sessionData.endTime) {
            const start = new Date(sessionData.startTime);
            const end = new Date(sessionData.endTime);
            const diffMs = end - start;
            if (diffMs > 0) {
              sessionData.duration = Math.round((diffMs / 1000 / 60) * 100) / 100;
            }
          }
          
          // Ensure minimum duration if transcript exists
          if (!sessionData.duration && sessionData.transcript) {
            sessionData.duration = 0.1; // Minimum duration if transcript exists
          }
          
          console.log('📤 Sending to main server:', `${mainApiUrl}/api/sessions`);
          console.log('📤 Session data being sent:', {
            userId: sessionData.userId,
            coachId: sessionData.coachId,
            hasTranscript: !!sessionData.transcript,
            transcriptLength: sessionData.transcript ? sessionData.transcript.length : 0,
            transcriptPreview: sessionData.transcript ? sessionData.transcript.substring(0, 200) : 'N/A',
            duration: sessionData.duration,
            durationType: typeof sessionData.duration,
            startTime: sessionData.startTime,
            endTime: sessionData.endTime
          });
          
          // Save to main server
          const response = await fetch(`${mainApiUrl}/api/sessions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.token || ''}`
            },
            body: JSON.stringify(sessionData)
          });
          
          console.log('📥 Response status:', response.status, response.statusText);
          
          if (response.ok) {
            const savedSession = await response.json();
            sessionId = savedSession.id;
            console.log('✅ Conversation saved successfully:', {
              sessionId: sessionId,
              duration: savedSession.duration,
              hasTranscript: !!(savedSession.transcript || savedSession.transcriptRef),
              transcriptLength: (savedSession.transcript || savedSession.transcriptRef) ? (savedSession.transcript || savedSession.transcriptRef).length : 0,
              savedSessionPreview: JSON.stringify(savedSession).substring(0, 300)
            });

            // If the initial create came from a Prisma route that doesn't accept transcript on POST,
            // perform a follow-up PUT to update transcriptRef, duration, endTime, and status.
            try {
              const missingTranscript = !(savedSession.transcript || savedSession.transcriptRef);
              const missingDuration = !savedSession.duration || Number(savedSession.duration) === 0;
              const needsUpdate = missingTranscript || missingDuration || (savedSession.status && savedSession.status !== 'COMPLETED');
              
              if (needsUpdate && sessionId && transcript) {
                const durationMinutesInt = (typeof duration === 'number' && !Number.isNaN(duration))
                  ? Math.max(1, Math.round(duration))
                  : undefined;

                const putBody = {
                  // Prisma route uses these names:
                  transcriptRef: transcript,
                  summary: summary || null,
                  status: 'COMPLETED',
                  endTime: new Date().toISOString(),
                  // Prisma Session.duration is Int minutes; send an int
                  duration: durationMinutesInt
                };
                console.log('🔄 Performing follow-up PUT to update session:', { sessionId, hasTranscript: !!transcript, duration: putBody.duration });
                const putResp = await fetch(`${mainApiUrl}/api/sessions/${sessionId}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${data.token || ''}`
                  },
                  body: JSON.stringify(putBody)
                });
                const putText = await putResp.text();
                let putData;
                try { putData = JSON.parse(putText); } catch { putData = putText; }
                if (!putResp.ok) {
                  console.error('❌ Follow-up PUT failed:', putResp.status, putData);
                } else {
                  console.log('✅ Follow-up PUT succeeded:', {
                    status: putResp.status,
                    hasTranscriptRef: !!putData?.transcriptRef,
                    duration: putData?.duration
                  });
                }
              }
            } catch (putErr) {
              console.error('❌ Error during follow-up PUT update:', putErr);
            }

            safeSend(ws, JSON.stringify({ 
              type: 'conversation_saved', 
              sessionId: sessionId,
              message: 'Conversation saved successfully'
            }));
          } else {
            const errorText = await response.text();
            let errorData;
            try {
              errorData = JSON.parse(errorText);
            } catch {
              errorData = { error: errorText || `HTTP ${response.status}` };
            }
            console.error('❌ Server error response:', response.status, errorData);
            throw new Error(errorData.error || `HTTP ${response.status}: ${errorText}`);
          }
        } catch (error) {
          console.error('❌ Error saving conversation:', error);
          console.error('Error stack:', error.stack);
          const errorMessage = error.message || 'Unknown error occurred';
          console.error('Sending error to client:', errorMessage);
          safeSend(ws, JSON.stringify({ 
            type: 'error', 
            message: `Failed to save conversation: ${errorMessage}` 
          }));
        }
      } else if (data.type === 'stop') {
        // Stop conversation
        console.log('🛑 Stop conversation requested');
        if (openaiWs) {
          openaiWs.close();
        }
        activeResponseId = null;
        responseStartTime = null;
        
        // Clear keepalive interval
        if (keepaliveInterval) {
          clearInterval(keepaliveInterval);
          keepaliveInterval = null;
        }
        
        // Clear timeout
        if (responseTimeout) {
          clearTimeout(responseTimeout);
          responseTimeout = null;
        }
        safeSend(ws, JSON.stringify({ type: 'stopped' }));
      } else if (data.type === 'audio') {
        // Forward audio data to OpenAI in the correct format
        // CRITICAL: This is in the hot path - minimal logging for performance!
        
        // Simple check: only proceed if WebSocket exists and is OPEN
        if (!openaiWs) {
          return;
        }
        
        const wsState = openaiWs.readyState;
        
        // Only send audio if WebSocket is OPEN
        if (wsState !== WebSocket.OPEN) {
          // If WebSocket is CLOSED or CLOSING, handle error (but don't spam)
          if (wsState === WebSocket.CLOSED || wsState === WebSocket.CLOSING) {
            const now = Date.now();
            // Only send error message once every 5 seconds to avoid spam
            if (now - lastConnectionErrorTime > 5000) {
              connectionErrorCount++;
              lastConnectionErrorTime = now;
              
              // Only send error after multiple consecutive failures
              if (connectionErrorCount >= 3) {
                safeSend(ws, JSON.stringify({ 
                  type: 'error', 
                  message: 'OpenAI connection lost. Please restart the conversation.' 
                }));
                isConnected = false;
              }
            }
          }
          // If CONNECTING, just return silently (connection is being established)
          return;
        }
        
        // WebSocket is OPEN - update connection flag and reset error count
        if (!isConnected) {
          isConnected = true;
          connectionErrorCount = 0;
        }
        
        try {
          const audioMessage = {
            type: 'input_audio_buffer.append',
            audio: data.audio  // base64 encoded PCM16
          };
          openaiWs.send(JSON.stringify(audioMessage));
          
          // Reset error count on successful send - connection is working
          connectionErrorCount = 0;
          
          // Removed frequent audio chunk logging - it was causing performance issues
          audioChunkCount++;
          
          // With server_vad and create_response: true, OpenAI automatically:
          // 1. Detects when speech starts/stops using VAD
          // 2. Commits the buffer when silence is detected (silence_duration_ms: 500)
          // 3. Creates and streams responses automatically
          // 
          // We DO NOT manually commit - server_vad handles everything!
          // Manual commits cause "buffer too small" errors because OpenAI
          // has already processed/committed the audio automatically.
        } catch (err) {
          console.error('❌ Error processing audio:', err);
          console.error('Error stack:', err.stack);
          // Notify client about the error
          safeSend(ws, JSON.stringify({ 
            type: 'error', 
            message: `Error forwarding audio: ${err.message}` 
          }));
        }
      } else if (data.type === 'stop') {
        // Don't commit remaining audio - let server_vad handle it naturally
        if (openaiWs) {
          openaiWs.close();
        }
        activeResponseId = null; // Clear active response
        responseStartTime = null;
        
        // Clear keepalive interval
        if (keepaliveInterval) {
          clearInterval(keepaliveInterval);
          keepaliveInterval = null;
        }
        
        // Clear timeout
        if (responseTimeout) {
          clearTimeout(responseTimeout);
          responseTimeout = null;
        }
        safeSend(ws, JSON.stringify({ type: 'stopped' }));
      }
    } catch (error) {
      console.error('Error handling message:', error);
      console.error('Error stack:', error.stack);
      safeSend(ws, JSON.stringify({ type: 'error', message: error.message || 'Unknown error occurred' }));
    }
  });

  ws.on('close', () => {
    if (openaiWs) {
      openaiWs.close();
    }
    activeResponseId = null; // Clear active response on disconnect
    responseStartTime = null;
    
    // Clear keepalive interval on disconnect
    if (keepaliveInterval) {
      clearInterval(keepaliveInterval);
      keepaliveInterval = null;
    }
    
    // Clear timeout on disconnect
    if (responseTimeout) {
      clearTimeout(responseTimeout);
      responseTimeout = null;
    }
    console.log(`Client disconnected: ${connectionId}`);
  });
  });
}

// Generate self-signed certificate for HTTPS
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

async function createHttpsServer() {
  if (USE_HTTPS) {
    try {
      const serverHost = process.env.SERVER_HOST || '95.216.225.37';
      let httpsOptions = null;
      
      // Try to use valid certificates first (mkcert or Let's Encrypt)
      const certDir = path.join(__dirname, 'certificates');
      const keyPath = path.join(certDir, 'localhost-key.pem');
      const certPath = path.join(certDir, 'localhost.pem');
      const keyPathAlt = path.join(certDir, `${serverHost}-key.pem`);
      const certPathAlt = path.join(certDir, `${serverHost}.pem`);
      
      // Debug logging
      console.log('\n🔍 Checking for SSL certificates...');
      console.log('Certificate directory:', certDir);
      console.log('Key path:', keyPath);
      console.log('Cert path:', certPath);
      console.log('Key exists:', fs.existsSync(keyPath));
      console.log('Cert exists:', fs.existsSync(certPath));
      
      // Check for valid certificates (mkcert or Let's Encrypt)
      if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        try {
          const keyData = fs.readFileSync(keyPath);
          const certData = fs.readFileSync(certPath);
          httpsOptions = {
            key: keyData,
            cert: certData
          };
          console.log('✅ Successfully loaded SSL certificates from certificates/ directory');
          console.log('✅ Certificate size:', certData.length, 'bytes');
          console.log('✅ Key size:', keyData.length, 'bytes');
          console.log('✅ NO browser warning if mkcert -install was run!');
        } catch (error) {
          console.error('⚠️  Error reading certificates, falling back to self-signed:', error.message);
          console.error('Error details:', error);
        }
      } else if (fs.existsSync(keyPathAlt) && fs.existsSync(certPathAlt)) {
        try {
          const keyData = fs.readFileSync(keyPathAlt);
          const certData = fs.readFileSync(certPathAlt);
          httpsOptions = {
            key: keyData,
            cert: certData
          };
          console.log('✅ Successfully loaded SSL certificates from certificates/ directory');
          console.log('✅ NO browser warning if mkcert -install was run!');
        } catch (error) {
          console.error('⚠️  Error reading certificates, falling back to self-signed:', error.message);
          console.error('Error details:', error);
        }
      } else {
        console.log('⚠️  Certificate files not found in:', certDir);
        console.log('   Looking for:', keyPath);
        console.log('   Or:', keyPathAlt);
      }
      
      // Fallback to self-signed if no valid certificates found
      if (!httpsOptions) {
        console.log('⚠️  No valid certificates found. Generating self-signed certificate...');
        console.log('💡 To remove browser warning, use mkcert:');
        console.log('   1. Install mkcert: choco install mkcert (Windows) or brew install mkcert (Mac)');
        console.log('   2. Run: mkcert -install');
        console.log('   3. Create certificates/ folder and run: mkcert localhost 95.216.225.37');
        console.log('   4. Rename files to localhost-key.pem and localhost.pem\n');
        
        const attrs = [{ name: 'commonName', value: serverHost }];
        const pems = await selfsigned.generate(attrs, { 
          days: 365,
          keySize: 2048,
          algorithm: 'sha256'
        });

        httpsOptions = {
          key: pems.private,
          cert: pems.cert
        };
      }

      const httpsServer = https.createServer(httpsOptions, app);
      const wss = new WebSocketServer({ server: httpsServer });

      setupWebSocket(wss);

      httpsServer.listen(PORT, '0.0.0.0', () => {
        console.log('\n🚀 Server starting with HTTPS...');
        console.log(`📍 Server running on https://localhost:${PORT}`);
        console.log(`📍 Server running on https://${serverHost}:${PORT}`);
        if (httpsOptions && fs.existsSync(keyPath)) {
          console.log('✅ Using valid SSL certificate - NO browser warning!');
        } else {
          console.log('⚠️  Using self-signed certificate - browser will show security warning');
          console.log('   Click "Advanced" and "Proceed" to continue');
        }
        console.log('✅ HTTPS is required for microphone access');
        console.log('✅ Make sure to set OPENAI_API_KEY in your .env file\n');
      });

      return httpsServer;
    } catch (error) {
      console.error('❌ Failed to start HTTPS server:', error);
      console.error('❌ HTTPS is required for microphone access. Please fix the error and try again.');
      process.exit(1);
    }
  } else {
    // HTTPS is required for microphone access - exit if HTTPS is disabled
    console.error('❌ ERROR: HTTPS is required for microphone access!');
    console.error('   The server must run with HTTPS to enable microphone functionality.');
    console.error('   Please remove HTTPS=false from your .env file or set HTTPS=true');
    process.exit(1);
  }
}

// Start the server
createHttpsServer().catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
