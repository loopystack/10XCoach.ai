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
const PORT = process.env.PORT || 3080; // Changed default to 3080 to match nginx proxy
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
// Attach to HTTP/HTTPS server to handle WebSocket upgrades
const wss = new WebSocketServer({ 
  server,
  perMessageDeflate: false // Disable compression for better compatibility
});

// Log WebSocket server setup
console.log('🔌 WebSocket Server configured - will handle all upgrade requests');

// Add upgrade event logging for debugging
server.on('upgrade', (request, socket, head) => {
  console.log(`🔄 WebSocket upgrade request received: ${request.url}`);
  console.log(`   Headers:`, {
    upgrade: request.headers.upgrade,
    connection: request.headers.connection,
    'sec-websocket-key': request.headers['sec-websocket-key'] ? 'present' : 'missing',
    'sec-websocket-version': request.headers['sec-websocket-version']
  });
  
  // Set socket timeout to prevent hanging connections
  socket.setTimeout(30000); // 30 second timeout
  
  socket.on('timeout', () => {
    console.error('⏱️ Socket timeout during upgrade - closing connection');
    socket.destroy();
  });
  
  socket.on('error', (error) => {
    console.error('❌ Socket error during upgrade:', error);
  });
});

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
// IMPORTANT: This must come BEFORE the general static middleware and SPA fallback
// Serve OpenAI conversation static files
// IMPORTANT: This must come BEFORE the general static middleware and SPA fallback
app.use('/conversation', (req, res, next) => {
  console.log('[CONVERSATION] Request to:', req.path);
  console.log('[CONVERSATION] Full URL:', req.url);
  console.log('[CONVERSATION] Query params:', req.query);
  
  // If requesting root of /conversation (with or without trailing slash), serve index.html
  if (req.path === '/' || req.path === '') {
    console.log('[CONVERSATION] Serving index.html for root path');
    const indexPath = path.join(__dirname, '../../openAI_conver/public/index.html');
    console.log('[CONVERSATION] Index file path:', indexPath);
    return res.sendFile(indexPath);
  }
  next();
}, express.static(path.join(__dirname, '../../openAI_conver/public'), {
  index: 'index.html',
  setHeaders: (res, filePath) => {
    // Ensure HTML files are served with correct content type
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
    }
    console.log('[CONVERSATION] Serving static file:', filePath);
  },
  fallthrough: false // Don't fall through to next middleware if file not found
}));

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

// Billing Routes
const billingRoutes = require('./modules/billing/billing.routes');
app.use('/api', billingRoutes);

// Admin Routes
const adminRoutes = require('./modules/admin/admin.routes'); // Commented out - uses old PostgreSQL
app.use('/api/admin', adminRoutes); // Commented out - uses old PostgreSQL

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
  'Jeffrey Wells': 'echo',  // Same voice as Rob Mercer
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

// Helper function to parse relative dates like "Friday", "tomorrow", "tomorrow 8 AM", etc.
function parseRelativeDate(dateString) {
  const lowerDate = dateString.toLowerCase().trim();
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  // Extract time from string (e.g., "8 AM", "14:00", "2 PM")
  let hours = 14; // Default to 2 PM
  let minutes = 0;
  
  // Parse time patterns: "8 AM", "8:30 AM", "14:00", "2 PM", etc.
  const timePatterns = [
    /(\d{1,2})\s*(am|pm)/i,  // "8 AM", "2 PM"
    /(\d{1,2}):(\d{2})\s*(am|pm)?/i,  // "8:30 AM", "14:00"
    /(\d{1,2}):(\d{2})/i  // "14:00" (24-hour format)
  ];
  
  for (const pattern of timePatterns) {
    const match = lowerDate.match(pattern);
    if (match) {
      if (match[4]) {
        // 12-hour format with AM/PM
        hours = parseInt(match[1]);
        minutes = match[2] ? parseInt(match[2]) : 0;
        if (match[4].toLowerCase() === 'pm' && hours !== 12) {
          hours += 12;
        } else if (match[4].toLowerCase() === 'am' && hours === 12) {
          hours = 0;
        }
      } else if (match[2]) {
        // 24-hour format or 12-hour without AM/PM
        hours = parseInt(match[1]);
        minutes = parseInt(match[2]);
        // If hours > 12 and no AM/PM, assume 24-hour format
        // Otherwise, if hours <= 12, might be ambiguous but we'll use as-is
      } else {
        // Just hour number
        hours = parseInt(match[1]);
        minutes = 0;
        // If no AM/PM and hours <= 12, default to PM for morning times
        if (hours <= 12 && !lowerDate.includes('am') && !lowerDate.includes('pm')) {
          if (hours < 8) {
            hours += 12; // Assume PM for early hours
          }
        }
      }
      break;
    }
  }
  
  // Parse date part
  let targetDate = new Date(today);
  
  // Check for "tomorrow"
  if (lowerDate.includes('tomorrow')) {
    targetDate.setDate(today.getDate() + 1);
    targetDate.setHours(hours, minutes, 0, 0);
    return targetDate;
  }
  
  // Check for "today"
  if (lowerDate.includes('today')) {
    targetDate.setHours(hours, minutes, 0, 0);
    // If time has passed today, assume tomorrow
    if (targetDate < today) {
      targetDate.setDate(today.getDate() + 1);
    }
    return targetDate;
  }
  
  // Check for day names
  const targetDayIndex = dayNames.findIndex(day => lowerDate.includes(day));
  
  if (targetDayIndex === -1) {
    // Try to parse as "next [day]"
    if (lowerDate.includes('next')) {
      const nextDayMatch = lowerDate.match(/next\s+(\w+)/);
      if (nextDayMatch) {
        const nextDayName = nextDayMatch[1].toLowerCase();
        const nextDayIndex = dayNames.findIndex(day => day.startsWith(nextDayName));
        if (nextDayIndex !== -1) {
          const daysUntilNext = (nextDayIndex - dayOfWeek + 7) % 7 || 7;
          targetDate.setDate(today.getDate() + daysUntilNext);
          targetDate.setHours(hours, minutes, 0, 0);
          return targetDate;
        }
      }
    }
    
    // Try to parse as number of days
    const daysMatch = lowerDate.match(/(\d+)\s*days?/);
    if (daysMatch) {
      const days = parseInt(daysMatch[1]);
      targetDate.setDate(today.getDate() + days);
      targetDate.setHours(hours, minutes, 0, 0);
      return targetDate;
    }
    
    return new Date(NaN); // Invalid
  }
  
  // Calculate days until target day
  let daysUntilTarget = (targetDayIndex - dayOfWeek + 7) % 7;
  if (daysUntilTarget === 0) {
    // If today is the target day, check if time has passed
    targetDate.setHours(hours, minutes, 0, 0);
    if (targetDate < today) {
      // Time has passed today, schedule for next week
      daysUntilTarget = 7;
    } else {
      return targetDate;
    }
  }
  
  targetDate.setDate(today.getDate() + daysUntilTarget);
  targetDate.setHours(hours, minutes, 0, 0);
  return targetDate;
}

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const connectionId = Date.now().toString();
  console.log(`🤝 Client connected: ${connectionId}`);
  console.log(`   Request URL: ${req.url}`);
  console.log(`   Remote Address: ${req.socket.remoteAddress}`);
  console.log(`   Headers: ${JSON.stringify(req.headers)}`);
  
  // Set connection timeout to prevent hanging connections
  let connectionTimeout = setTimeout(() => {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      console.warn(`⏱️ Connection ${connectionId} timeout - closing`);
      try {
        ws.close(1008, 'Connection timeout');
      } catch (e) {
        console.error('Error closing timed-out connection:', e);
      }
    }
  }, 30000); // 30 second timeout
  
  // Send immediate acknowledgment to client to confirm connection
  // Use setTimeout to ensure WebSocket is fully ready
  setTimeout(() => {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'client_connected', connectionId }));
        console.log(`✅ Sent client connection acknowledgment: ${connectionId}`);
      } else {
        console.warn(`⚠️ WebSocket not ready for acknowledgment. State: ${ws.readyState}`);
      }
    } catch (error) {
      console.error('❌ Error sending connection acknowledgment:', error);
    }
  }, 100); // Small delay to ensure connection is fully established

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
  let clientKeepaliveInterval = null; // Keepalive for client connection
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
  let sessionSaved = false; // Track if session has been saved to prevent duplicates

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
      
      // Log all incoming messages for debugging
      if (message.type !== 'audio') {
        console.log(`📨 Received client message: ${message.type}`);
      }

      if (message.type === 'start') {
        console.log('🎯 Starting conversation session...');
        
        // Wrap the entire start handler in try-catch to prevent connection closure
        try {
          // Clear the connection timeout since conversation has started
          if (connectionTimeout) {
            clearTimeout(connectionTimeout);
            connectionTimeout = null;
            console.log('✅ Cleared connection timeout - conversation started');
          }
          
          // Check user access before starting conversation
          try {
            const { checkUserAccess } = require('./middleware/access.middleware');
            if (currentUserId) {
              const access = await checkUserAccess(currentUserId);
              if (!access.hasAccess) {
                safeSend({ 
                  type: 'error', 
                  message: 'Trial expired. Please upgrade to continue.',
                  requiresUpgrade: true,
                  redirectTo: '/plans'
                });
                return;
              }
            }
          } catch (accessError) {
            console.error('❌ Error checking user access:', accessError);
            // Don't block conversation start if access check fails
            // Just log and continue
          }

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
        sessionSaved = false; // Reset saved flag for new session
        sessionId = null; // Reset session ID
        
        // Start client keepalive to prevent connection timeout
        if (clientKeepaliveInterval) {
          clearInterval(clientKeepaliveInterval);
        }
        clientKeepaliveInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              // Send a ping-like message to keep connection alive
              ws.ping();
            } catch (err) {
              console.warn('Client keepalive ping error:', err);
              if (clientKeepaliveInterval) {
                clearInterval(clientKeepaliveInterval);
                clientKeepaliveInterval = null;
              }
            }
          } else {
            // Connection is not open, clear interval
            if (clientKeepaliveInterval) {
              clearInterval(clientKeepaliveInterval);
              clientKeepaliveInterval = null;
            }
          }
        }, 25000); // Send keepalive every 25 seconds (before 30s timeout)

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

        // Get coach from database to use custom prompt and voice
        let coachData = null;
        let voice = coachVoiceMap[currentCoachName] || 'echo';
        let coachInstructions = null;
        
        try {
          const prisma = require('./lib/prisma');
          coachData = await prisma.coach.findFirst({
            where: { name: currentCoachName, active: true }
          });
          
          // Use database voice if available, otherwise fall back to hardcoded map
          if (coachData?.voiceId) {
            voice = coachData.voiceId;
          }
          
          // Use database prompt if available
          if (coachData?.personaJson?.systemPrompt) {
            coachInstructions = coachData.personaJson.systemPrompt;
            
            // Append knowledge base content if available
            try {
              const knowledgeBase = await prisma.knowledgeBase.findMany({
                where: { isActive: true },
                orderBy: { order: 'asc' }
              });
              
              if (knowledgeBase && knowledgeBase.length > 0) {
                const knowledgeContent = knowledgeBase.map(kb => {
                  return `\n\n## ${kb.title}${kb.author ? ` by ${kb.author}` : ''}\n${kb.summary || kb.content.substring(0, 2000)}...`;
                }).join('\n\n');
                
                coachInstructions += `\n\nKNOWLEDGE BASE - Reference these materials when relevant:\n${knowledgeContent}\n\nWhen referencing these materials, do so naturally and conversationally.`;
              }
            } catch (kbError) {
              console.warn('⚠️ Could not load knowledge base:', kbError.message);
            }
          }
        } catch (dbError) {
          console.warn('⚠️ Could not load coach from database:', dbError.message);
        }
        
        // Fallback to hardcoded instructions if no database prompt
        if (!coachInstructions) {
          coachInstructions = getCoachInstructions(currentCoachName, currentUserName, conversationHistory);
        }

        // Configure OpenAI Realtime API with function calling tools
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
              silence_duration_ms: 2000, // Increased to 2 seconds to prevent premature turn detection
              create_response: true // Auto-create responses when user finishes speaking
            },
            tools: [
              {
                type: 'function',
                name: 'schedule_10x_meeting',
                description: 'Schedule a 10X 10-minute huddle meeting with the user. Use this when the user asks to schedule a meeting, set up a huddle, or book a 10x meeting.',
                parameters: {
                  type: 'object',
                  properties: {
                    title: {
                      type: 'string',
                      description: 'The title or topic of the meeting (e.g., "Strategy Review", "Sales Planning", "Operations Check-in")'
                    },
                    meeting_date: {
                      type: 'string',
                      description: 'The date and time for the meeting in ISO 8601 format (e.g., "2024-01-15T14:00:00" or "2024-01-15T14:00:00Z"). Must be a future date and time.'
                    },
                    notes: {
                      type: 'string',
                      description: 'Optional notes or agenda items for the meeting'
                    }
                  },
                  required: ['title', 'meeting_date']
                }
              },
              {
                type: 'function',
                name: 'send_text_message',
                description: 'Send a text message (SMS) to the user. Use this when the user asks to send a text, text them, or send a message.',
                parameters: {
                  type: 'object',
                  properties: {
                    message: {
                      type: 'string',
                      description: 'The text message content to send to the user'
                    },
                    message_type: {
                      type: 'string',
                      enum: ['summary', 'reminder', 'meeting_confirmation', 'action_items', 'general'],
                      description: 'The type of message being sent'
                    }
                  },
                  required: ['message']
                }
              }
            ],
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

          // Connection timeout handler (will be cleared on 'open')
          let connectionTimeoutHandler = null;
          
          // Add connection timeout (before 'open' handler)
          connectionTimeoutHandler = setTimeout(() => {
            if (openaiWs && openaiWs.readyState !== WebSocket.OPEN) {
              console.error('⏱️ OpenAI connection timeout after 30 seconds');
              if (openaiWs) {
                try {
                  openaiWs.close();
                } catch (err) {
                  console.error('Error closing timed-out connection:', err);
                }
                openaiWs = null;
              }
              isConnected = false;
              safeSend({ 
                type: 'error', 
                message: 'Connection timeout. Please try again.',
                errorCode: 'CONNECTION_TIMEOUT'
              });
            }
          }, 30000); // 30 second timeout
          
          openaiWs.on('open', () => {
            console.log('✅ Connected to OpenAI Realtime API');
            // Clear connection timeout if it exists
            if (connectionTimeoutHandler) {
              clearTimeout(connectionTimeoutHandler);
              connectionTimeoutHandler = null;
            }
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
              } else {
                // Connection is not open, clear interval
                if (keepaliveInterval) {
                  clearInterval(keepaliveInterval);
                  keepaliveInterval = null;
                }
              }
            }, 20000);
          });

          openaiWs.on('message', async (event) => {
            try {
              const message = JSON.parse(event.toString());

              // Handle different message types
              if (message.type === 'session.created') {
                console.log('🎯 OpenAI session created');
              } else if (message.type === 'session.updated') {
                console.log('✅ OpenAI session configured');
                
                // Send 'connected' message to client AFTER session is fully configured
                // This tells the client it's safe to start sending audio
                safeSend({ type: 'connected' });
                console.log('✅ Sent connected message to client - ready for audio');

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
                // Output item was added to the response
                console.log(`📦 Output item added to response: ${message.item?.id}, type: ${message.item?.type}`);
                
                // Handle function calls - OpenAI Realtime API uses different formats
                // Check for function_call, tool_use, or function_call in content
                const itemType = message.item?.type;
                const isFunctionCall = itemType === 'function_call' || 
                                      itemType === 'tool_use' ||
                                      (message.item?.type === 'message' && 
                                       message.item?.content?.some(c => c.type === 'function_call' || c.type === 'tool_use'));
                
                if (isFunctionCall) {
                  console.log(`🔧 DETECTED FUNCTION CALL! Item type: ${itemType}`);
                  console.log(`🔧 Full message:`, JSON.stringify(message, null, 2));
                  
                  let functionCall = message.item;
                  
                  // If function_call is in content array, extract it
                  if (message.item?.type === 'message' && message.item?.content) {
                    const funcCallContent = message.item.content.find(c => 
                      c.type === 'function_call' || c.type === 'tool_use'
                    );
                    if (funcCallContent) {
                      functionCall = funcCallContent;
                      console.log(`🔧 Found function call in content array`);
                    }
                  }
                  
                  // Extract function name - handle multiple formats
                  const functionName = functionCall.name || 
                                      functionCall.function?.name ||
                                      functionCall.tool_name ||
                                      functionCall.toolName;
                  
                  let functionArgs = {};
                  
                  // Parse arguments - could be string or object, handle multiple formats
                  if (functionCall.arguments) {
                    if (typeof functionCall.arguments === 'string') {
                      try {
                        functionArgs = JSON.parse(functionCall.arguments);
                      } catch (e) {
                        console.error(`❌ Failed to parse arguments as JSON:`, functionCall.arguments);
                        functionArgs = {};
                      }
                    } else {
                      functionArgs = functionCall.arguments;
                    }
                  } else if (functionCall.function?.arguments) {
                    if (typeof functionCall.function.arguments === 'string') {
                      try {
                        functionArgs = JSON.parse(functionCall.function.arguments);
                      } catch (e) {
                        console.error(`❌ Failed to parse function.arguments as JSON:`, functionCall.function.arguments);
                        functionArgs = {};
                      }
                    } else {
                      functionArgs = functionCall.function.arguments;
                    }
                  } else if (functionCall.input) {
                    // Some APIs use 'input' instead of 'arguments'
                    functionArgs = typeof functionCall.input === 'string' 
                      ? JSON.parse(functionCall.input) 
                      : functionCall.input;
                  }
                  
                  console.log(`🔧 Function call received: ${functionName}`);
                  console.log(`🔧 Function arguments:`, JSON.stringify(functionArgs, null, 2));
                  console.log(`🔧 Full function call object:`, JSON.stringify(functionCall, null, 2));
                  
                  // Handle function calls
                  let functionResult = null;
                  let functionError = null;
                  
                  try {
                    if (functionName === 'schedule_10x_meeting') {
                      // Schedule a 10X meeting (create huddle)
                      console.log(`📅 Attempting to schedule meeting with args:`, JSON.stringify(functionArgs, null, 2));
                      
                      if (!currentUserId) {
                        console.error('❌ Missing user ID:', { currentUserId, currentCoachId });
                        throw new Error('User ID not available. Please ensure you are logged in.');
                      }
                      
                      if (!currentCoachId) {
                        console.error('❌ Missing coach ID:', { currentUserId, currentCoachId });
                        throw new Error('Coach ID not available. Please try again.');
                      }
                      
                      // Parse meeting date - handle relative dates like "Friday"
                      let meetingDate;
                      const dateInput = functionArgs.meeting_date || functionArgs.date || functionArgs.meetingDate;
                      
                      if (!dateInput) {
                        throw new Error('Meeting date is required');
                      }
                      
                      console.log(`📅 Parsing date input: "${dateInput}"`);
                      
                      // Try to parse as ISO date first
                      meetingDate = new Date(dateInput);
                      
                      // If that fails, try to parse relative dates
                      if (isNaN(meetingDate.getTime())) {
                        console.log(`📅 Date parsing failed, trying relative date parsing...`);
                        meetingDate = parseRelativeDate(dateInput);
                      }
                      
                      if (isNaN(meetingDate.getTime())) {
                        console.error(`❌ Invalid date format: "${dateInput}"`);
                        throw new Error(`Invalid meeting date format: "${dateInput}". Please provide a date in ISO format (e.g., "2024-01-15T14:00:00") or a relative date like "Friday", "next Monday", etc.`);
                      }
                      
                      console.log(`📅 Parsed meeting date: ${meetingDate.toISOString()}`);
                      
                      if (meetingDate < new Date()) {
                        throw new Error('Meeting date must be in the future');
                      }
                      
                      // Create huddle via Prisma
                      const prisma = require('./lib/prisma');
                      console.log(`📅 Creating huddle in database...`);
                      console.log(`📅 Data:`, {
                        title: functionArgs.title || '10X Coaching Session',
                        huddleDate: meetingDate,
                        coachId: currentCoachId,
                        userId: currentUserId
                      });
                      
                      let huddle;
                      try {
                        huddle = await prisma.huddle.create({
                          data: {
                            title: functionArgs.title || '10X Coaching Session',
                            huddleDate: meetingDate,
                            coachId: currentCoachId,
                            userId: currentUserId,
                            hasShortAgenda: true,
                            hasNotetaker: true,
                            hasActionSteps: true,
                            status: 'SCHEDULED'
                          },
                          include: {
                            coach: { select: { name: true } },
                            user: { select: { name: true, email: true } }
                          }
                        });
                        
                        console.log(`✅ Huddle created successfully:`, {
                          id: huddle.id,
                          title: huddle.title,
                          date: huddle.huddleDate,
                          coachId: huddle.coachId,
                          userId: huddle.userId
                        });
                      } catch (dbError) {
                        console.error('❌ Database error creating huddle:', dbError);
                        console.error('   Error details:', {
                          message: dbError.message,
                          code: dbError.code,
                          meta: dbError.meta
                        });
                        throw new Error(`Failed to create meeting in database: ${dbError.message}`);
                      }
                      
                      functionResult = {
                        success: true,
                        message: `10X meeting scheduled successfully for ${meetingDate.toLocaleString()}`,
                        meeting_id: huddle.id,
                        title: huddle.title,
                        date: meetingDate.toISOString(),
                        coach: huddle.coach.name
                      };
                      
                      console.log('✅ Meeting scheduled:', functionResult);
                      
                      // Send confirmation message to user
                      safeSend({
                        type: 'info',
                        message: `Meeting scheduled: ${huddle.title} on ${meetingDate.toLocaleString()}`
                      });
                      
                    } else if (functionName === 'send_text_message') {
                      // Send text message (via email for now, can be extended to SMS)
                      if (!currentUserId) {
                        throw new Error('User ID not available');
                      }
                      
                      // Get user info
                      const prisma = require('./lib/prisma');
                      const user = await prisma.user.findUnique({
                        where: { id: currentUserId },
                        select: { email: true, name: true }
                      });
                      
                      if (!user || !user.email) {
                        throw new Error('User email not found');
                      }
                      
                      // Send email (as text message - can be extended to SMS gateway)
                      const { createTransporter, getEmailSettings } = require('./lib/email');
                      const emailSettings = await getEmailSettings();
                      const transporter = await createTransporter();
                      
                      const mailOptions = {
                        from: `"${currentCoachName || '10X Coach'}" <${emailSettings.smtpFromEmail}>`,
                        to: user.email,
                        subject: `Message from ${currentCoachName || 'your 10X Coach'}`,
                        text: functionArgs.message,
                        html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
                          <h2>Message from ${currentCoachName || 'your 10X Coach'}</h2>
                          <p style="white-space: pre-wrap;">${functionArgs.message.replace(/\n/g, '<br>')}</p>
                          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
                            This message was sent from your 10XCoach.ai conversation.
                          </p>
                        </div>`
                      };
                      
                      await transporter.sendMail(mailOptions);
                      
                      functionResult = {
                        success: true,
                        message: 'Text message sent successfully',
                        recipient: user.email,
                        message_type: functionArgs.message_type || 'general'
                      };
                      
                      console.log('✅ Text message sent:', functionResult);
                      
                      // Send confirmation to user
                      safeSend({
                        type: 'info',
                        message: 'Message sent successfully'
                      });
                      
                    } else {
                      throw new Error(`Unknown function: ${functionName}`);
                    }
                  } catch (error) {
                    console.error(`❌ Error executing function ${functionName}:`, error);
                    console.error(`   Error details:`, {
                      message: error.message,
                      stack: error.stack,
                      name: error.name
                    });
                    functionError = error.message || String(error);
                    functionResult = {
                      success: false,
                      error: error.message || String(error)
                    };
                    
                    // Send error message to user
                    safeSend({
                      type: 'error',
                      message: `Error executing ${functionName}: ${error.message || String(error)}`
                    });
                  }
                  
                  // Submit tool output to OpenAI using conversation.item.create
                  const toolCallId = functionCall.id || functionCall.tool_call_id || functionCall.function?.id;
                  if (openaiWs && openaiWs.readyState === WebSocket.OPEN && toolCallId) {
                    // Cancel any active response first to avoid conflicts
                    if (activeResponseId) {
                      console.log(`⚠️ Cancelling active response ${activeResponseId} before submitting tool output`);
                      try {
                        openaiWs.send(JSON.stringify({
                          type: 'response.cancel',
                          response_id: activeResponseId
                        }));
                        activeResponseId = null;
                      } catch (cancelError) {
                        console.error('Error cancelling response:', cancelError);
                      }
                    }
                    
                    // Wait a bit for cancellation to process
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    // Create a conversation item with function_call_output (correct type)
                    // Note: OpenAI Realtime API requires 'call_id' not 'tool_call_id'
                    const toolOutputItem = {
                      type: 'conversation.item.create',
                      item: {
                        type: 'function_call_output',
                        call_id: toolCallId,  // Changed from tool_call_id to call_id
                        output: JSON.stringify(functionError ? { error: functionError } : functionResult)
                      }
                    };
                    console.log(`📤 Submitting tool output:`, JSON.stringify(toolOutputItem, null, 2));
                    openaiWs.send(JSON.stringify(toolOutputItem));
                    console.log(`✅ Tool output submitted for ${functionName}`);
                    
                    // After submitting tool output, wait a bit then create a new response to continue the conversation
                    setTimeout(() => {
                      if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
                        // Make sure no response is active before creating a new one
                        if (!activeResponseId) {
                          openaiWs.send(JSON.stringify({
                            type: 'response.create'
                          }));
                          console.log(`✅ Response.create sent after tool output`);
                        } else {
                          console.log(`⚠️ Skipping response.create - response ${activeResponseId} is still active`);
                        }
                      }
                    }, 300);
                  } else {
                    console.error(`❌ Cannot submit tool output:`, {
                      hasOpenaiWs: !!openaiWs,
                      readyState: openaiWs?.readyState,
                      hasToolCallId: !!toolCallId,
                      responseId: message.response_id
                    });
                  }
                  
                  return; // Don't process function calls as regular messages
                }
                
                // Handle regular message content
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
                // Log unhandled message types for debugging (especially function-related)
                if (!['session.created', 'session.updated', 'ping', 'pong'].includes(message.type)) {
                  // Log function-related messages more prominently
                  if (message.type.includes('function') || message.type.includes('tool') || 
                      JSON.stringify(message).includes('function') || JSON.stringify(message).includes('tool')) {
                    console.log(`🔧 FUNCTION-RELATED MESSAGE: ${message.type}`, JSON.stringify(message, null, 2));
                  } else {
                    console.log(`🔍 Unhandled message type: ${message.type}`);
                  }
                }
              }
            } catch (error) {
              console.error('Error processing OpenAI message:', error);
            }
          });

          openaiWs.on('error', (error) => {
            console.error('❌ OpenAI WebSocket error:', error);
            console.error('Error details:', {
              message: error.message,
              code: error.code,
              stack: error.stack
            });
            isConnected = false;
            safeSend({ 
              type: 'error', 
              message: 'OpenAI connection error. Please try again.',
              errorCode: error.code || 'UNKNOWN'
            });
          });

          openaiWs.on('close', (code, reason) => {
            console.log(`❌ OpenAI connection closed: Code ${code}, Reason: ${reason?.toString() || 'none'}`);
            isConnected = false;
            if (keepaliveInterval) {
              clearInterval(keepaliveInterval);
              keepaliveInterval = null;
            }
            // Notify client of disconnection
            safeSend({ 
              type: 'disconnected', 
              message: 'Connection to OpenAI closed',
              code: code
            });
          });

        } catch (error) {
          console.error('❌ Error connecting to OpenAI:', error);
          console.error('Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack
          });
          isConnected = false;
          safeSend({ 
            type: 'error', 
            message: 'Failed to connect to OpenAI. Please try again.',
            errorCode: error.code || 'CONNECTION_FAILED'
          });
          // Don't close the client WebSocket - let them retry
        }
        } catch (startError) {
          console.error('❌ Error in start message handler:', startError);
          console.error('Error details:', {
            message: startError.message,
            code: startError.code,
            stack: startError.stack
          });
          safeSend({ 
            type: 'error', 
            message: 'Error starting conversation: ' + (startError.message || 'Unknown error')
          });
          // Don't close the connection - keep it alive for retry
        }

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

        // NOTE: We do NOT auto-save here anymore to prevent duplicates
        // The save will be handled by the explicit 'save_conversation' message
        // that is sent when user clicks "Stop and Save Conversation"
        // If user just clicks "Stop" without save, the session won't be saved
        // (which is fine - they can save manually if needed)

        safeSend({ type: 'stopped' });

      } else if (message.type === 'save_conversation') {
        // Handle manual save (or auto-save from stop button)
        console.log('💾 Save conversation requested');
        
        // CRITICAL: Check and set flag IMMEDIATELY to prevent race conditions
        // This prevents duplicate saves if multiple save requests arrive quickly
        if (sessionSaved) {
          console.log('⚠️ Session already saved, skipping duplicate save request');
          safeSend({ type: 'conversation_saved', sessionId: sessionId, message: 'Session already saved' });
          return;
        }
        
        // Set flag IMMEDIATELY before any async operations to prevent race conditions
        // If save fails, we'll reset it in the catch block
        sessionSaved = true;
        
        if (!currentUserId || !currentCoachId) {
          // Reset flag on validation error so user can retry
          sessionSaved = false;
          console.error('❌ Cannot save: Missing userId or coachId');
          safeSend({ type: 'error', message: 'Cannot save: Missing user or coach information' });
          return;
        }

        // Calculate duration - use client-provided duration if available, otherwise calculate from sessionStartTime
        const endTime = new Date();
        let duration = null;
        
        // Prefer client-provided duration (from timer) if available
        if (message.duration !== undefined && message.duration !== null) {
          duration = parseFloat(message.duration);
          if (isNaN(duration) || duration < 0) {
            duration = null; // Invalid duration, fall back to calculation
          } else {
            duration = Math.round(duration * 100) / 100; // Round to 2 decimal places
            console.log('⏱️ Using client-provided duration:', duration, 'minutes');
          }
        }
        
        // Fall back to calculating from sessionStartTime if client duration not available
        if (duration === null && sessionStartTime) {
          const diffMs = endTime - new Date(sessionStartTime);
          duration = diffMs / 1000 / 60; // Convert to minutes
          duration = Math.round(duration * 100) / 100; // Round to 2 decimal places
          console.log('⏱️ Calculated duration from sessionStartTime:', duration, 'minutes');
        }
        
        // Final fallback: ensure minimum duration if there's a transcript
        if (duration === null && conversationTranscript.length > 0) {
          duration = Math.max(0.1, conversationTranscript.length * 0.05); // Rough estimate
          console.log('⏱️ Using estimated duration:', duration, 'minutes');
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
          
          // Automatically create a note from the session for the 10X Coach Notetaking page
          try {
            // Generate note content from transcript
            let noteContent = '';
            if (conversationTranscript && conversationTranscript.length > 0) {
              // Format transcript as a readable note
              const transcriptText = conversationTranscript
                .map((entry) => {
                  const role = entry.role || entry.type || 'user';
                  const content = entry.content || entry.text || entry.message || '';
                  const speaker = role === 'user' || role === 'assistant' 
                    ? (role === 'user' ? (currentUserName || 'User') : (currentCoachName || 'Coach'))
                    : role;
                  return `${speaker}: ${content}`;
                })
                .join('\n\n');
              
              // Limit note content to reasonable length (first 5000 characters)
              noteContent = transcriptText.length > 5000 
                ? transcriptText.substring(0, 5000) + '\n\n[... transcript truncated ...]'
                : transcriptText;
            } else {
              // Fallback if no transcript
              noteContent = `Coaching session with ${currentCoachName || 'Coach'} on ${new Date(sessionStartTime || Date.now()).toLocaleDateString()}. Duration: ${durationMinutes ? Math.round(durationMinutes) : 'N/A'} minutes.`;
            }
            
            // Create note in the notes table
            const note = await prisma.note.create({
              data: {
                sessionDate: sessionStartTime ? new Date(sessionStartTime) : new Date(),
                coachId: finalCoachId,
                userId: parseInt(currentUserId),
                content: noteContent,
                sent: false
              }
            });
            
            console.log('📝 Note created automatically from session:', {
              noteId: note.id,
              sessionId: sessionId,
              coachId: finalCoachId,
              userId: currentUserId,
              contentLength: noteContent.length
            });
          } catch (noteError) {
            // Don't fail the session save if note creation fails
            console.error('⚠️ Failed to create note from session (non-critical):', {
              error: noteError.message,
              sessionId: sessionId
            });
          }
          
          // Note: sessionSaved was already set to true at the start to prevent race conditions
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
          // Reset flag on error so user can retry
          sessionSaved = false;
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
      console.error('❌ Error processing client message:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      // Send error to client but don't close the connection
      try {
        safeSend({ 
          type: 'error', 
          message: error.message || 'Error processing message'
        });
      } catch (sendError) {
        console.error('❌ Failed to send error message to client:', sendError);
      }
      
      // Don't rethrow - keep the connection alive
    }
  });

  ws.on('close', (code, reason) => {
    clearTimeout(connectionTimeout);
    if (clientKeepaliveInterval) {
      clearInterval(clientKeepaliveInterval);
      clientKeepaliveInterval = null;
    }
    console.log(`🔌 Client WebSocket closed: ${connectionId}, Code: ${code}, Reason: ${reason?.toString() || 'none'}`);
    // Clean up OpenAI connection if it exists
    if (openaiWs) {
      try {
        if (openaiWs.readyState === WebSocket.OPEN || openaiWs.readyState === WebSocket.CONNECTING) {
          openaiWs.close();
        }
      } catch (err) {
        console.error('Error closing OpenAI WebSocket:', err);
      }
      openaiWs = null;
    }
    if (keepaliveInterval) {
      clearInterval(keepaliveInterval);
      keepaliveInterval = null;
    }
    activeConnections.delete(connectionId);
  });

  ws.on('error', (error) => {
    console.error(`❌ WebSocket error for ${connectionId}:`, error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    safeSend({ 
      type: 'error', 
      message: 'Connection error. Please try again.',
      errorCode: error.code || 'UNKNOWN'
    });
  });

  activeConnections.set(connectionId, { ws, openaiWs, connectionId });
});

// =============================================
// ERROR HANDLING
// =============================================
app.use((err, req, res, next) => {
  console.error('[ERROR HANDLER] Error caught:', err);
  console.error('[ERROR HANDLER] Request path:', req.path);
  console.error('[ERROR HANDLER] Request method:', req.method);
  
  // ALWAYS return JSON, never HTML
  if (!res.headersSent) {
    res.setHeader('Content-Type', 'application/json');
    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }
});

// =============================================
// SPA FALLBACK
// =============================================
app.get('*', (req, res, next) => {
  // Don't serve SPA for conversation routes - let static middleware handle it
  if (req.path.startsWith('/conversation')) {
    return next(); // Let Express static middleware handle it (404 if file not found)
  }
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


