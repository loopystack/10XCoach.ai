const express = require('express');
const cors = require('cors');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');
const https = require('https');
const fs = require('fs');
const OpenAI = require('openai');

// Load .env from server directory (parent of src)
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;
const USE_HTTPS = process.env.HTTPS !== 'false'; // Default to HTTPS

// OpenAI Configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// HTTPS Server Setup
let server;
if (USE_HTTPS) {
  // Create certificates directory if it doesn't exist
  const certsDir = path.join(__dirname, '../../openAI_conver/certificates');
  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
  }

  // Try to load existing certificates, or create self-signed ones
  let keyPath = path.join(certsDir, 'localhost-key.pem');
  let certPath = path.join(certsDir, 'localhost.pem');

  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    console.log('🔐 Creating self-signed SSL certificates...');
    const selfsigned = require('selfsigned');
    const attrs = [{ name: 'commonName', value: '10xcoach.ai' }];
    const pems = selfsigned.generate(attrs, { days: 365 });
    fs.writeFileSync(keyPath, pems.private);
    fs.writeFileSync(certPath, pems.cert);
    console.log('✅ SSL certificates created');
  }

  const httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };

  server = https.createServer(httpsOptions, app);
  console.log('🔒 HTTPS server configured');
} else {
  const http = require('http');
  server = http.createServer(app);
  console.log('🌐 HTTP server configured');
}

// WebSocket Server for OpenAI conversations
const wss = new WebSocketServer({ server });

// Store active connections
const activeConnections = new Map();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// IMPORTANT: Serve avatars BEFORE the general static handler to ensure they're not caught by client/dist
// Serve avatars with fallback: check client/avatars first, then openAI_conver/public/avatars
const avatarsPath = path.join(__dirname, '../../client/avatars');
const openAIAvatarsPath = path.join(__dirname, '../../openAI_conver/public/avatars');

console.log('📁 Avatar paths configured:');
console.log('   Primary:', avatarsPath);
console.log('   Fallback:', openAIAvatarsPath);

// Custom middleware to serve avatars with fallback
app.use('/avatars', (req, res, next) => {
  // Try primary location first (client/avatars)
  const primaryPath = path.join(avatarsPath, req.path);
  if (fs.existsSync(primaryPath)) {
    console.log(`🖼️  Serving avatar from primary: ${req.path}`);
    return express.static(avatarsPath)(req, res, next);
  }
  
  // Try fallback location (openAI_conver/public/avatars)
  const fallbackPath = path.join(openAIAvatarsPath, req.path);
  if (fs.existsSync(fallbackPath)) {
    console.log(`🖼️  Serving avatar from fallback: ${req.path}`);
    return express.static(openAIAvatarsPath)(req, res, next);
  }
  
  // File not found in either location
  console.log(`❌ Avatar not found: ${req.path}`);
  res.status(404).send('Avatar not found');
});

// Serve static files from coaches folder (if exists)
app.use('/coaches', express.static(path.join(__dirname, '../../coaches')));

// Serve OpenAI conversation static files
app.use('/conversation', express.static(path.join(__dirname, '../../openAI_conver/public')));

// Serve built frontend (production) - MUST be last to avoid catching /avatars requests
app.use(express.static(path.join(__dirname, '../../client/dist')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test avatar serving - list available avatars
app.get('/api/avatars/test', (req, res) => {
  try {
    const primaryFiles = fs.existsSync(avatarsPath) ? fs.readdirSync(avatarsPath) : [];
    const fallbackFiles = fs.existsSync(openAIAvatarsPath) ? fs.readdirSync(openAIAvatarsPath) : [];
    res.json({
      primary: {
        path: avatarsPath,
        exists: fs.existsSync(avatarsPath),
        files: primaryFiles
      },
      fallback: {
        path: openAIAvatarsPath,
        exists: fs.existsSync(openAIAvatarsPath),
        files: fallbackFiles
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Coach API - fetch from database
app.get('/api/coaches', async (req, res) => {
  try {
    const prisma = require('./lib/prisma');
    const coachesResult = await prisma.coach.findMany({
      where: {
        active: true // Only return active coaches
      },
      select: {
        id: true,
        name: true,
        specialty: true,
        tagline: true,
        avatar: true,
        role: true,
        email: true,
        description: true
      },
      orderBy: { id: 'asc' }
    });
    
    // Map coach names to actual avatar filenames in client/avatars
    const avatarFilenameMap = {
      'Alan Wozniak': 'Alan-Wozniak-CEC.jpg',
      'Rob Mercer': 'Robertini-Rob-Mercer.jpg',
      'Robert Mercer': 'Robertini-Rob-Mercer.jpg',
      'Teresa Lane': 'Teresa-Lane.jpg',
      'Camille Quinn': 'Camille-Quinn.jpg',
      'Jeffrey Wells': 'Jeffrey-Wells.jpg',
      'Hudson Jaxon': 'Hudson-Jaxson.jpg',
      'Hudson Jaxson': 'Hudson-Jaxson.jpg',
      'Tanner Chase': 'Tanner-Chase.jpg',
      'Chelsea Fox': 'Chelsea-Fox.jpg'
    };
    
    // Ensure avatar paths are correct
    const coaches = coachesResult.map(coach => {
      let avatarFilename = null;
      
      // Extract filename from database avatar field (handle both full paths and filenames)
      if (coach.avatar) {
        // Remove /avatars/ prefix if present, keep only filename
        avatarFilename = coach.avatar.replace(/^\/avatars\//, '').replace(/^avatars\//, '');
        console.log(`📸 Coach ${coach.name}: Using database avatar: ${avatarFilename}`);
      }
      
      // If no avatar from database or mapping needed, use filename map
      if (!avatarFilename && avatarFilenameMap[coach.name]) {
        avatarFilename = avatarFilenameMap[coach.name];
        console.log(`📸 Coach ${coach.name}: Using mapped avatar: ${avatarFilename}`);
      }
      
      // If still no filename, log warning
      if (!avatarFilename) {
        console.log(`⚠️  Coach ${coach.name}: No avatar filename found - will show fallback icon`);
      }
      
      // Build avatar path - always use /avatars/ prefix for frontend
      const avatarPath = avatarFilename ? `/avatars/${avatarFilename}` : null;
      
      // Verify file exists if we have a filename
      if (avatarFilename) {
        const primaryPath = path.join(avatarsPath, avatarFilename);
        const fallbackPath = path.join(openAIAvatarsPath, avatarFilename);
        const exists = fs.existsSync(primaryPath) || fs.existsSync(fallbackPath);
        if (!exists) {
          console.log(`❌ Avatar file not found for ${coach.name}: ${avatarFilename}`);
          console.log(`   Checked: ${primaryPath}`);
          console.log(`   Checked: ${fallbackPath}`);
        } else {
          const foundAt = fs.existsSync(primaryPath) ? 'primary' : 'fallback';
          console.log(`✅ Avatar file exists for ${coach.name}: ${avatarFilename} (${foundAt})`);
        }
      }
      
      return {
        ...coach,
        avatar: avatarPath
      };
    });
    
    console.log(`📊 Returning ${coaches.length} coaches with avatars`);
    res.json(coaches);
  } catch (error) {
    console.error('Error fetching coaches:', error);
    // Fallback to mock data if database fails - using actual filenames from client/avatars
    const coaches = [
      { id: 1, name: 'Teresa Lane', specialty: 'Business Strategy Coach', tagline: 'From side hustle to CEO', avatar: '/avatars/Teresa-Lane.jpg' },
      { id: 2, name: 'Alan Wozniak', specialty: 'Sales Coach', tagline: 'Master the art of selling', avatar: '/avatars/Alan-Wozniak-CEC.jpg' },
      { id: 3, name: 'Rob Mercer', specialty: 'Marketing Coach', tagline: 'Build brands that sell', avatar: '/avatars/Robertini-Rob-Mercer.jpg' },
      { id: 4, name: 'Camille Quinn', specialty: 'Leadership Coach', tagline: 'Lead with confidence', avatar: '/avatars/Camille-Quinn.jpg' },
      { id: 5, name: 'Jeffrey Wells', specialty: 'Operations Coach', tagline: 'We build businesses that run without you', avatar: '/avatars/Jeffrey-Wells.jpg' },
      { id: 6, name: 'Hudson Jaxon', specialty: 'Finance Coach', tagline: 'Money management mastery', avatar: '/avatars/Hudson-Jaxson.jpg' },
      { id: 7, name: 'Tanner Chase', specialty: 'Growth Coach', tagline: 'Scale to 7 figures', avatar: '/avatars/Tanner-Chase.jpg' },
      { id: 8, name: 'Chelsea Fox', specialty: 'Mindset Coach', tagline: 'Unlock your potential', avatar: '/avatars/Chelsea-Fox.jpg' }
    ];
    res.json(coaches);
  }
});

// =============================================
// API ROUTES
// =============================================

// Auth Routes
const authRoutes = require('./modules/users/auth.routes');
app.use('/api/auth', authRoutes);

// User Routes
const userRoutes = require('./modules/users/user.routes');
app.use('/api', userRoutes);

// Coach Routes
const coachRoutes = require('./modules/coaches/coach.routes');
app.use('/api', coachRoutes);

// Plan Routes
const planRoutes = require('./modules/plans/plan.routes');
app.use('/api', planRoutes);

// Session Routes
const sessionRoutes = require('./modules/sessions/session.routes');
app.use('/api', sessionRoutes);

// Quiz Routes
const quizRoutes = require('./modules/quizzes/quiz.routes');
app.use('/api', quizRoutes);

// Blog Routes
const blogRoutes = require('./modules/blogs/blog.routes');
app.use('/api', blogRoutes);

// Admin Routes
// const adminRoutes = require('./modules/admin/admin.routes'); // Commented out - uses old PostgreSQL
// app.use('/api/admin', adminRoutes); // Commented out - uses old PostgreSQL

// Legacy API routes (for backwards compatibility)
const legacyRoutes = require('./modules/legacy/legacy.routes');
app.use('/api', legacyRoutes);

// ============================================
// WEBSOCKET SERVER FOR OPENAI CONVERSATIONS
// ============================================

// Voice mapping for coaches
const coachVoiceMap = {
  // Male coaches
  'Alan Wozniak': 'ash',
  'Rob Mercer': 'echo',
  'Jeffrey Wells': 'onyx',
  'Hudson Jaxon': 'cedar',
  'Tanner Chase': 'verse',
  // Female coaches
  'Teresa Lane': 'shimmer',
  'Camille Quinn': 'coral',
  'Chelsea Fox': 'sage'
};

// Coach gender mapping
const coachGenderMap = {
  'Alan Wozniak': 'male',
  'Rob Mercer': 'male',
  'Jeffrey Wells': 'male',
  'Hudson Jaxon': 'male',
  'Tanner Chase': 'male',
  'Teresa Lane': 'female',
  'Camille Quinn': 'female',
  'Chelsea Fox': 'female'
};

// Import OpenAI conversation logic (CommonJS)
let getCoachInstructions, getUserConversationHistory, getUserQuizResults;
try {
  const coachInstructions = require('../../openAI_conver/coachInstructions.js');
  const userData = require('../../openAI_conver/userData.js');

  getCoachInstructions = coachInstructions.getCoachInstructions;
  getUserConversationHistory = userData.getUserConversationHistory;
  getUserQuizResults = userData.getUserQuizResults;
  console.log('✅ OpenAI conversation modules loaded successfully');
} catch (error) {
  console.warn('⚠️ OpenAI conversation modules not found, using fallback functions');
  console.warn('Error details:', error.message);

  // Fallback functions
  getCoachInstructions = (coachName, userName, history) => {
    return `You are ${coachName}, a coach at 10XCoach.ai. Help the user achieve their goals.`;
  };

  getUserConversationHistory = async () => [];
  getUserQuizResults = async () => null;
}

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const connectionId = Date.now().toString();
  console.log(`🤝 Client connected: ${connectionId}`);

  // Initialize connection variables
  let openaiWs = null;
  let isConnected = false;
  let audioChunkCount = 0;
  let activeResponseId = null;
  let responseStartTime = null;
  let responseTimeout = null;
  let connectionErrorCount = 0;
  let lastConnectionErrorTime = 0;
  let keepaliveInterval = null;
  let useElevenLabsMode = false;
  let elevenLabsVoiceId = null;
  let accumulatedText = {};
  let conversationTranscript = [];
  let processedResponses = new Set(); // Track which response IDs have been added to transcript
  let sessionStartTime = null;
  let currentCoachName = null;
  let currentUserId = null;
  let currentUserName = null;
  let currentCoachId = null;
  let sessionId = null;
  let greetingSent = false;
  let pendingGreetingResponse = false;
  let currentToken = null;

  // Helper function to safely send messages to client
  const safeSend = (message) => {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error('Error sending message to client:', error);
    }
  };

  // Handle client messages
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());

      if (message.type === 'start') {
        console.log('🎯 Starting conversation session...');

        // Extract parameters
        const apiType = (message.apiType || 'openai').toLowerCase();
        useElevenLabsMode = apiType === 'elevenlabs';
        currentCoachName = (message.coachName || 'Alan Wozniak').trim();
        currentUserId = message.userId ? parseInt(message.userId) : null;
        currentUserName = message.userName;
        currentCoachId = message.coachId ? parseInt(message.coachId) : null;

        const token = message.token;
        currentToken = token; // Store token for later use (saving sessions)

        // Try to decode user info from token if not provided
        if (token && !currentUserName) {
          try {
            const jwt = require('jsonwebtoken');
            const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
            const decoded = jwt.verify(token, JWT_SECRET);
            currentUserId = decoded.userId;
            currentUserName = decoded.name || decoded.userName || decoded.username || decoded.firstName || null;
          } catch (error) {
            console.warn('Could not decode token:', error.message);
          }
        }

        console.log(`👤 Session: ${currentUserName} with ${currentCoachName}`);

        // Initialize session
        conversationTranscript = [];
        processedResponses = new Set(); // Reset processed responses for new session
        sessionStartTime = new Date();

        // Get user conversation history for memory
        let conversationHistory = [];
        if (currentUserId && currentCoachId && token) {
          try {
            conversationHistory = await getUserConversationHistory(currentUserId, currentCoachId, token);
            console.log(`🧠 Retrieved ${conversationHistory.length} previous conversations`);
          } catch (error) {
            console.error('Error fetching conversation history:', error);
          }
        }

        // Setup voice configuration
        const voice = coachVoiceMap[currentCoachName] || 'echo';
        const coachInstructions = getCoachInstructions(currentCoachName, currentUserName, conversationHistory);

        // Configure OpenAI Realtime API
        const config = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: coachInstructions,
            voice: voice,
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.7,
              prefix_padding_ms: 300,
              silence_duration_ms: 800,
              create_response: true // Auto-create responses when user finishes speaking
            },
            tools: [],
            tool_choice: 'auto',
            temperature: 0.8,
            max_response_output_tokens: 4096
          }
        };

        // Connect to OpenAI
        try {
          openaiWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview', {
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'OpenAI-Beta': 'realtime=v1'
            }
          });

          openaiWs.on('open', () => {
            console.log('✅ Connected to OpenAI Realtime API');
            isConnected = true;
            openaiWs.send(JSON.stringify(config));

            // Start keepalive
            keepaliveInterval = setInterval(() => {
              if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
                try {
                  openaiWs.ping();
                } catch (err) {
                  console.error('Keepalive ping error:', err);
                }
              }
            }, 20000);
          });

          openaiWs.on('message', (event) => {
            try {
              const message = JSON.parse(event.toString());

              // Handle different message types
              if (message.type === 'session.created') {
                console.log('🎯 OpenAI session created');
              } else if (message.type === 'session.updated') {
                console.log('✅ OpenAI session configured');

                // Send initial greeting immediately
                if (!greetingSent) {
                  greetingSent = true;
                  console.log('🎯 Setting up greeting...');
                  
                  setTimeout(() => {
                    const userDisplayName = currentUserName && currentUserName !== 'null' && currentUserName !== 'undefined' 
                      ? currentUserName 
                      : 'there';
                    
                    // Create a user message to trigger the greeting naturally
                    const greetingPrompt = `Hi! Please greet me warmly as ${currentCoachName || 'the coach'} would, and call me by my name: ${userDisplayName}. Introduce yourself and say you're ready to help me achieve my goals.`;
                    console.log(`👋 Sending greeting prompt: "${greetingPrompt}"`);

                    // Add user message to conversation and immediately create response
                    // Following the old working implementation that sent both immediately
                    console.log('📤 Creating user message and response for greeting...');
                    try {
                      // Send user message
                      openaiWs.send(JSON.stringify({
                        type: 'conversation.item.create',
                        item: {
                          type: 'message',
                          role: 'user',
                          content: [{
                            type: 'input_text',
                            text: greetingPrompt
                          }]
                        }
                      }));
                      console.log('✅ User message sent');
                      
                      // Immediately send response.create (old working approach)
                      openaiWs.send(JSON.stringify({
                        type: 'response.create'
                      }));
                      console.log('✅ Response.create sent immediately');
                    } catch (err) {
                      console.error('❌ Error sending greeting messages:', err);
                    }
                  }, 500);
                }

              } else if (message.type === 'conversation.item.created') {
                // Handle when a conversation item is created
                const item = message.item;
                console.log(`📝 Conversation item created: ${item.id}, type: ${item.type}, role: ${item.role}, status: ${item.status}`);
                // Response is already created in greeting flow, no need to create here
              } else if (message.type === 'response.created') {
                // Track active response
                activeResponseId = message.response.id;
                console.log(`📢 Response created: ${activeResponseId}`);
                console.log(`   Response status: ${JSON.stringify(message.response?.status || 'unknown')}`);
                if (message.response?.output_item_ids && message.response.output_item_ids.length > 0) {
                  console.log(`   Output item IDs: ${message.response.output_item_ids.join(', ')}`);
                }
              } else if (message.type === 'response.cancelled') {
                console.log(`⚠️ Response cancelled: ${message.response_id || 'unknown'}`);
                if (activeResponseId === message.response_id) {
                  activeResponseId = null;
                }
              } else if (message.type === 'response.failed') {
                console.error(`❌ Response failed: ${message.response_id || 'unknown'}`, message.error);
                if (activeResponseId === message.response_id) {
                  activeResponseId = null;
                }
              } else if (message.type === 'response.audio.delta') {
                // Forward audio to client
                if (!activeResponseId && message.response_id) {
                  activeResponseId = message.response_id;
                }
                console.log(`🔊 Audio delta received for response: ${message.response_id}, chunk size: ${message.delta?.length || 0}`);
                safeSend({
                  type: 'audio',
                  audio: message.delta,
                  responseId: message.response_id
                });
              } else if (message.type === 'response.output_item.added') {
                // Output item was added to the response - just forward to client, don't add to transcript yet
                console.log(`📦 Output item added to response: ${message.item?.id}, type: ${message.item?.type}`);
                if (message.item?.type === 'message' && message.item?.content) {
                  for (const content of message.item.content) {
                    if (content.type === 'text' && content.text) {
                      console.log(`   Text content: "${content.text}"`);
                      safeSend({
                        type: 'text',
                        text: content.text,
                        responseId: message.response_id
                      });
                    } else if (content.type === 'audio' && content.transcript) {
                      // Audio content with transcript
                      console.log(`   Audio transcript: "${content.transcript}"`);
                      safeSend({
                        type: 'text',
                        text: content.transcript,
                        responseId: message.response_id
                      });
                      // Store transcript for this response, but don't add to transcript yet
                      // We'll add it in response.output_item.done or response.done to avoid duplicates
                      if (message.response_id) {
                        if (!accumulatedText[message.response_id]) {
                          accumulatedText[message.response_id] = '';
                        }
                        accumulatedText[message.response_id] = content.transcript; // Replace with final transcript
                      }
                    }
                  }
                }
              } else if (message.type === 'response.output_item.done') {
                // Output item is done - this is where we capture the final transcript once
                console.log(`✅ Output item done: ${message.item?.id}, type: ${message.item?.type}`);
                const responseId = message.response_id;
                
                if (message.item?.type === 'message' && responseId && !processedResponses.has(responseId)) {
                  let itemText = '';
                  if (message.item.content && Array.isArray(message.item.content)) {
                    for (const content of message.item.content) {
                      if (content.type === 'text' && content.text) {
                        itemText += content.text;
                      } else if (content.type === 'audio' && content.transcript) {
                        // Audio transcripts contain the actual spoken text
                        itemText = content.transcript; // Use transcript as final text
                        console.log(`   Found audio transcript: "${content.transcript}"`);
                      } else if (content.type === 'input_text' && content.text) {
                        itemText += content.text;
                      }
                    }
                  }
                  
                  // Use accumulated text if item text is empty
                  if (!itemText && accumulatedText[responseId]) {
                    itemText = accumulatedText[responseId];
                  }
                  
                  if (itemText && itemText.trim()) {
                    console.log(`   Final item text: "${itemText}"`);
                    // Only add once per response ID
                    conversationTranscript.push({
                      role: 'assistant',
                      text: itemText.trim(),
                      timestamp: new Date().toISOString()
                    });
                    processedResponses.add(responseId); // Mark as processed
                    console.log(`   ✅ Added assistant message to transcript (response ${responseId})`);
                  }
                }
              } else if (message.type === 'response.text.delta') {
                console.log(`📝 Text delta received: "${message.delta}"`);
                // Forward text to client
                if (!activeResponseId && message.response_id) {
                  activeResponseId = message.response_id;
                }
                // Accumulate text for transcript
                if (message.response_id) {
                  if (!accumulatedText[message.response_id]) {
                    accumulatedText[message.response_id] = '';
                  }
                  accumulatedText[message.response_id] += message.delta;
                }
                safeSend({
                  type: 'text',
                  text: message.delta,
                  responseId: message.response_id
                });
              } else if (message.type === 'response.done') {
                // Response completed
                const responseId = message.response?.id || activeResponseId;
                console.log(`✅ Response done: ${responseId}`);
                
                // Check for errors
                if (message.response?.error) {
                  console.error(`   ❌ Response error: ${JSON.stringify(message.response.error)}`);
                }
                
                // Check status
                if (message.response?.status) {
                  console.log(`   Response status: ${message.response.status}`);
                }
                
                // Only add to transcript if not already processed in response.output_item.done
                if (responseId && !processedResponses.has(responseId)) {
                  let responseText = '';
                  
                  // Try to get text from accumulated text (from output_item.added)
                  if (accumulatedText[responseId]) {
                    responseText = accumulatedText[responseId];
                    console.log(`   Using accumulated text: "${responseText}"`);
                  } else if (message.response?.output && message.response.output.length > 0) {
                    // Fallback: try to extract from response.output
                    console.log(`   Processing ${message.response.output.length} output items`);
                    for (const output of message.response.output) {
                      if (output.type === 'message' && output.content) {
                        for (const content of output.content) {
                          if (content.type === 'audio' && content.transcript) {
                            responseText = content.transcript;
                            console.log(`   Found audio transcript in response output: "${responseText}"`);
                            break;
                          } else if (content.type === 'text' && content.text) {
                            responseText = content.text;
                            break;
                          }
                        }
                        if (responseText) break;
                      }
                    }
                  }
                  
                  // Add to transcript only if we have text and haven't processed this response
                  if (responseText && responseText.trim()) {
                    conversationTranscript.push({
                      role: 'assistant',
                      text: responseText.trim(),
                      timestamp: new Date().toISOString()
                    });
                    processedResponses.add(responseId); // Mark as processed
                    console.log(`   ✅ Added assistant message to transcript (response ${responseId})`);
                  } else {
                    console.log(`   ⚠️ No text found for response ${responseId}`);
                  }
                } else {
                  console.log(`   ℹ️ Response ${responseId} already processed, skipping duplicate`);
                }
                
                // Clean up accumulated text and response tracking
                if (responseId) {
                  delete accumulatedText[responseId];
                  // Keep processedResponses for the session to avoid duplicates
                }
                
                activeResponseId = null;
                safeSend({
                  type: 'response_done',
                  response: message.response
                });
              } else if (message.type === 'conversation.item.input_audio_transcription.completed') {
                // User input transcription completed - ADD USER MESSAGE TO TRANSCRIPT
                const userText = message.transcript || '';
                if (userText && userText.trim().length > 0) {
                  console.log(`📝 User input transcribed: "${userText.substring(0, 100)}${userText.length > 100 ? '...' : ''}"`);
                  
                  conversationTranscript.push({
                    role: 'user',
                    text: userText.trim(),
                    timestamp: new Date().toISOString()
                  });
                  
                  console.log('✅ Added user message to transcript:', {
                    textLength: userText.length,
                    textPreview: userText.substring(0, 50),
                    totalTranscriptItems: conversationTranscript.length
                  });
                }
              } else if (message.type === 'error') {
                console.error('OpenAI error:', message.error);
                activeResponseId = null;
                safeSend({
                  type: 'error',
                  message: message.error?.message || 'OpenAI error'
                });
              } else {
                // Log unhandled message types for debugging
                if (!['session.created', 'session.updated', 'ping', 'pong'].includes(message.type)) {
                  console.log(`🔍 Unhandled message type: ${message.type}`, message);
                }
              }
            } catch (error) {
              console.error('Error processing OpenAI message:', error);
            }
          });

          openaiWs.on('error', (error) => {
            console.error('OpenAI WebSocket error:', error);
            safeSend({ type: 'error', message: 'OpenAI connection error' });
          });

          openaiWs.on('close', () => {
            console.log('❌ OpenAI connection closed');
            isConnected = false;
            if (keepaliveInterval) {
              clearInterval(keepaliveInterval);
            }
          });

        } catch (error) {
          console.error('Error connecting to OpenAI:', error);
          safeSend({ type: 'error', message: 'Failed to connect to OpenAI' });
        }

        safeSend({ type: 'connected' });

      } else if (message.type === 'audio') {
        // Forward audio to OpenAI
        if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
          openaiWs.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: message.audio
          }));
        }
      } else if (message.type === 'stop') {
        // Handle conversation stop
        if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
          // Cancel any active response
          if (activeResponseId) {
            openaiWs.send(JSON.stringify({ 
              type: 'response.cancel',
              response_id: activeResponseId
            }));
          }
          // Clear input audio buffer
          openaiWs.send(JSON.stringify({ type: 'input_audio_buffer.clear' }));
        }

        // Auto-save conversation on stop
        if (currentUserId && conversationTranscript.length > 0) {
          console.log('💾 Auto-saving conversation on stop');
          
          // Calculate duration
          const endTime = new Date();
          let duration = null;
          if (sessionStartTime) {
            const diffMs = endTime - new Date(sessionStartTime);
            duration = diffMs / 1000 / 60; // Convert to minutes
            duration = Math.round(duration * 100) / 100; // Round to 2 decimal places
          }

          // Convert transcript to JSON string
          const transcriptJson = JSON.stringify(conversationTranscript);

          // Save session directly using Prisma (fire and forget)
          const prisma = require('./lib/prisma');
          
          // Verify coach exists and get correct ID (same logic as manual save)
          (async () => {
            try {
              let finalCoachId = currentCoachId ? parseInt(currentCoachId) : null;
              
              if (finalCoachId) {
                const coachExists = await prisma.coach.findUnique({
                  where: { id: finalCoachId }
                });
                if (!coachExists) {
                  console.warn(`⚠️ Coach ID ${finalCoachId} not found, looking up by name: ${currentCoachName}`);
                  finalCoachId = null;
                }
              }
              
              if (!finalCoachId && currentCoachName) {
                const coachByName = await prisma.coach.findFirst({
                  where: {
                    name: {
                      contains: currentCoachName,
                      mode: 'insensitive'
                    }
                  }
                });
                if (coachByName) {
                  finalCoachId = coachByName.id;
                  console.log(`✅ Found coach by name: ${currentCoachName} -> ID: ${finalCoachId}`);
                } else {
                  console.error(`❌ Coach not found by name: ${currentCoachName} - skipping auto-save`);
                  return;
                }
              }
              
              if (!finalCoachId) {
                console.error('❌ Cannot auto-save: No valid coach ID found');
                return;
              }
              
              // Handle duration - convert to Decimal-compatible value
              let durationMinutes = duration;
              if (durationMinutes !== undefined && durationMinutes !== null) {
                if (typeof durationMinutes === 'string') {
                  durationMinutes = parseFloat(durationMinutes);
                }
                if (typeof durationMinutes === 'number') {
                  durationMinutes = Math.round(durationMinutes * 100) / 100;
                  if (durationMinutes < 0) durationMinutes = null;
                }
              }
              
              console.log('💾 Auto-saving session with Prisma:', {
                userId: currentUserId,
                coachId: finalCoachId,
                duration: durationMinutes,
                transcriptLength: transcriptJson.length
              });
              
              const savedSession = await prisma.session.create({
                data: {
                  userId: parseInt(currentUserId),
                  coachId: finalCoachId,
                  startTime: sessionStartTime ? new Date(sessionStartTime) : new Date(),
                  endTime: endTime,
                  duration: durationMinutes,
                  transcriptRef: transcriptJson && transcriptJson !== '[]' && transcriptJson !== 'null' && transcriptJson.trim().length > 0 ? transcriptJson : null,
                  summary: null,
                  status: 'COMPLETED'
                }
              });
              
              sessionId = savedSession.id;
              console.log('✅ Auto-saved conversation via Prisma:', { 
                sessionId, 
                duration: savedSession.duration,
                userId: savedSession.userId,
                coachId: savedSession.coachId,
                hasTranscript: !!savedSession.transcriptRef
              });
            } catch (error) {
              console.error('❌ Error auto-saving conversation with Prisma:', {
                message: error.message,
                stack: error.stack,
                code: error.code,
                meta: error.meta
              });
            }
          })();
        }

        safeSend({ type: 'stopped' });

      } else if (message.type === 'save_conversation') {
        // Handle manual save
        console.log('💾 Manual save requested');
        
        if (!currentUserId || !currentCoachId) {
          console.error('❌ Cannot save: Missing userId or coachId');
          safeSend({ type: 'error', message: 'Cannot save: Missing user or coach information' });
          return;
        }

        // Calculate duration
        const endTime = new Date();
        let duration = null;
        if (sessionStartTime) {
          const diffMs = endTime - new Date(sessionStartTime);
          duration = diffMs / 1000 / 60; // Convert to minutes
          duration = Math.round(duration * 100) / 100; // Round to 2 decimal places
        }

        // Convert transcript to JSON string
        const transcriptJson = JSON.stringify(conversationTranscript);

        // Save session directly using Prisma (same server, no HTTP needed)
        const prisma = require('./lib/prisma');
        
        try {
          console.log('💾 Attempting to save session with Prisma:', {
            userId: currentUserId,
            coachId: currentCoachId,
            coachName: currentCoachName,
            duration: duration,
            transcriptLength: transcriptJson.length,
            startTime: sessionStartTime,
            endTime: endTime.toISOString()
          });
          
          // Verify coach exists and get correct ID
          let finalCoachId = currentCoachId ? parseInt(currentCoachId) : null;
          
          if (finalCoachId) {
            // Verify the coach exists in database
            const coachExists = await prisma.coach.findUnique({
              where: { id: finalCoachId }
            });
            
            if (!coachExists) {
              console.warn(`⚠️ Coach ID ${finalCoachId} not found in database, looking up by name: ${currentCoachName}`);
              finalCoachId = null;
            }
          }
          
          // If coachId is invalid or missing, try to find by name
          if (!finalCoachId && currentCoachName) {
            const coachByName = await prisma.coach.findFirst({
              where: {
                name: {
                  contains: currentCoachName,
                  mode: 'insensitive'
                }
              }
            });
            
            if (coachByName) {
              finalCoachId = coachByName.id;
              console.log(`✅ Found coach by name: ${currentCoachName} -> ID: ${finalCoachId}`);
            } else {
              console.error(`❌ Coach not found by name: ${currentCoachName}`);
              safeSend({ type: 'error', message: `Coach "${currentCoachName}" not found in database. Cannot save session.` });
              return;
            }
          }
          
          if (!finalCoachId) {
            console.error('❌ Cannot save: No valid coach ID found');
            safeSend({ type: 'error', message: 'Cannot save: Coach information is missing' });
            return;
          }
          
          // Handle duration - convert to Decimal-compatible value
          let durationMinutes = duration;
          if (durationMinutes !== undefined && durationMinutes !== null) {
            if (typeof durationMinutes === 'string') {
              durationMinutes = parseFloat(durationMinutes);
            }
            if (typeof durationMinutes === 'number') {
              // Prisma Decimal expects number, it will handle precision
              // Round to 2 decimals for consistency
              durationMinutes = Math.round(durationMinutes * 100) / 100;
              // Ensure minimum value
              if (durationMinutes < 0) durationMinutes = null;
            }
          }
          
          console.log('💾 Creating session with data:', {
            userId: currentUserId,
            coachId: finalCoachId,
            startTime: sessionStartTime,
            endTime: endTime.toISOString(),
            duration: durationMinutes,
            transcriptLength: transcriptJson.length,
            status: 'COMPLETED'
          });
          
          const savedSession = await prisma.session.create({
            data: {
              userId: parseInt(currentUserId),
              coachId: finalCoachId,
              startTime: sessionStartTime ? new Date(sessionStartTime) : new Date(),
              endTime: endTime,
              duration: durationMinutes,
              transcriptRef: transcriptJson && transcriptJson !== '[]' && transcriptJson !== 'null' && transcriptJson.trim().length > 0 ? transcriptJson : null,
              summary: null,
              status: 'COMPLETED'
            },
            include: {
              coach: {
                select: {
                  id: true,
                  name: true,
                  role: true,
                  avatar: true
                }
              },
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          });
          
          sessionId = savedSession.id;
          console.log('✅ Conversation saved successfully via Prisma:', {
            sessionId: sessionId,
            duration: savedSession.duration,
            userId: savedSession.userId,
            coachId: savedSession.coachId,
            transcriptLength: transcriptJson.length,
            hasTranscript: !!savedSession.transcriptRef
          });
          safeSend({ type: 'conversation_saved', sessionId: sessionId });
        } catch (error) {
          console.error('❌ Error saving conversation with Prisma:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            meta: error.meta
          });
          safeSend({ type: 'error', message: 'Error saving conversation: ' + error.message });
        }
      }
    } catch (error) {
      console.error('Error processing client message:', error);
    }
  });

  ws.on('close', () => {
    console.log(`👋 Client disconnected: ${connectionId}`);
    if (openaiWs) {
      openaiWs.close();
    }
    if (keepaliveInterval) {
      clearInterval(keepaliveInterval);
    }
    activeConnections.delete(connectionId);
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for ${connectionId}:`, error);
  });

  activeConnections.set(connectionId, { ws, openaiWs, connectionId });
});

// =============================================
// ERROR HANDLING
// =============================================
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// =============================================
// SPA FALLBACK
// =============================================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

// =============================================
// START SERVER
// =============================================

server.listen(PORT, '0.0.0.0', () => {
  const protocol = USE_HTTPS ? 'https' : 'http';
  console.log(`🚀 10X Coach Platform Server running on ${protocol}://0.0.0.0:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 HTTPS: ${USE_HTTPS ? 'Enabled' : 'Disabled'}`);
  console.log(`🎯 OpenAI Conversations: Integrated`);
  console.log(`📱 WebSocket Server: Active on same port`);
});


