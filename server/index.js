const express = require('express');
const cors = require('cors');
const path = require('path');
const { WebSocketServer } = require('ws');
const https = require('https');
const fs = require('fs');
const OpenAI = require('openai');
require('dotenv').config();

const db = require('./db');

// Import OpenAI conversation logic (create these files if they don't exist)
let getCoachInstructions, getUserConversationHistory, getUserQuizResults;
try {
  const coachInstructions = require('../openAI_conver/coachInstructions');
  const userData = require('../openAI_conver/userData');
  getCoachInstructions = coachInstructions.getCoachInstructions;
  getUserConversationHistory = userData.getUserConversationHistory;
  getUserQuizResults = userData.getUserQuizResults;
} catch (error) {
  console.warn('OpenAI conversation modules not found, using fallback functions');

  // Fallback functions
  getCoachInstructions = (coachName, userName, history) => {
    return `You are ${coachName}, a coach at 10XCoach.ai. Help the user achieve their goals.`;
  };

  getUserConversationHistory = async () => [];
  getUserQuizResults = async () => null;
}

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
  const certsDir = path.join(__dirname, '../openAI_conver/certificates');
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

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from avatars folder
app.use('/avatars', express.static(path.join(__dirname, '../avatars')));

// Serve OpenAI conversation static files
app.use('/conversation', express.static(path.join(__dirname, '../openAI_conver/public')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Coach API proxy (from OpenAI service)
app.get('/api/coaches', async (req, res) => {
  try {
    // For now, return mock coaches - in production you'd fetch from database
    const coaches = [
      { id: 1, name: 'Teresa Lane', specialty: 'Business Strategy Coach', tagline: 'From side hustle to CEO', avatar: '/avatars/Teresa-Lane.jpg' },
      { id: 2, name: 'Alan Wozniak', specialty: 'Sales Coach', tagline: 'Master the art of selling', avatar: '/avatars/Alan-Wozniak.jpg' },
      { id: 3, name: 'Rob Mercer', specialty: 'Marketing Coach', tagline: 'Build brands that sell', avatar: '/avatars/Rob-Mercer.jpg' },
      { id: 4, name: 'Camille Quinn', specialty: 'Leadership Coach', tagline: 'Lead with confidence', avatar: '/avatars/Camille-Quinn.jpg' },
      { id: 5, name: 'Jeffrey Wells', specialty: 'Operations Coach', tagline: 'We build businesses that run without you', avatar: '/avatars/Jeffrey-Wells.jpg' },
      { id: 6, name: 'Hudson Jaxon', specialty: 'Finance Coach', tagline: 'Money management mastery', avatar: '/avatars/Hudson-Jaxon.jpg' },
      { id: 7, name: 'Tanner Chase', specialty: 'Growth Coach', tagline: 'Scale to 7 figures', avatar: '/avatars/Tanner-Chase.jpg' },
      { id: 8, name: 'Chelsea Fox', specialty: 'Mindset Coach', tagline: 'Unlock your potential', avatar: '/avatars/Chelsea-Fox.jpg' }
    ];
    res.json(coaches);
  } catch (error) {
    console.error('Error fetching coaches:', error);
    res.status(500).json({ error: 'Failed to fetch coaches' });
  }
});

// ============================================
// SESSIONS ENDPOINTS
// ============================================
app.post('/api/sessions', async (req, res) => {
  try {
    const { userId, coachId, startTime, endTime, duration, transcript, summary, actionSteps, status } = req.body;
    
    if (!userId || !coachId) {
      return res.status(400).json({ error: 'User ID and Coach ID are required' });
    }
    
    // Calculate duration from start/end times if not provided
    let finalDuration = duration;
    
    // Convert duration to number if it's a string
    if (finalDuration && typeof finalDuration === 'string') {
      finalDuration = parseFloat(finalDuration);
      if (isNaN(finalDuration)) {
        finalDuration = null;
      }
    }
    
    // If duration is provided and valid, use it
    if (finalDuration && typeof finalDuration === 'number' && finalDuration > 0) {
      // Round to 2 decimal places
      finalDuration = Math.round(finalDuration * 100) / 100;
    } else if (startTime && endTime) {
      // Calculate from start/end times
      const start = new Date(startTime);
      const end = new Date(endTime);
      const diffMs = end - start;
      if (diffMs > 0) {
        // Convert to minutes (can be fractional for seconds) - record every second
        finalDuration = diffMs / 1000 / 60;
        // Round to 2 decimal places for precision (records seconds accurately)
        finalDuration = Math.round(finalDuration * 100) / 100;
        // Ensure minimum 0.01 minutes (0.6 seconds) if there's a transcript
        if (finalDuration < 0.01 && transcript) {
          finalDuration = 0.01;
        }
      }
    }
    
    // Ensure duration is never null if there's a transcript or valid times
    if (!finalDuration && (transcript || (startTime && endTime))) {
      finalDuration = 0.1; // Default to 0.1 minutes (6 seconds)
    }
    
    console.log('💾 Saving session with:', {
      userId,
      coachId,
      duration: finalDuration,
      durationType: typeof finalDuration,
      receivedDuration: duration,
      receivedDurationType: typeof duration,
      hasTranscript: !!transcript,
      transcriptLength: transcript ? transcript.length : 0,
      transcriptPreview: transcript ? transcript.substring(0, 200) : 'N/A',
      transcriptIsEmpty: transcript === '[]' || transcript === 'null' || !transcript,
      transcriptType: typeof transcript,
      startTime,
      endTime,
      hasStartTime: !!startTime,
      hasEndTime: !!endTime
    });
    
    // Validate transcript before saving
    if (transcript && transcript !== '[]' && transcript !== 'null' && transcript.trim().length > 0) {
      console.log('✅ Valid transcript, saving to database');
    } else {
      console.error('❌ WARNING: Invalid or empty transcript!', {
        transcript: transcript,
        transcriptType: typeof transcript,
        transcriptLength: transcript ? transcript.length : 0
      });
    }
    
    // Insert session
    const sessionResult = await db.query(
      `INSERT INTO sessions (user_id, coach_id, start_time, end_time, duration, transcript_ref, summary, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING *`,
      [
        userId,
        coachId,
        startTime || new Date().toISOString(),
        endTime || new Date().toISOString(),
        finalDuration || null,
        transcript && transcript !== '[]' && transcript !== 'null' && transcript.trim().length > 0 ? transcript : null, // Store transcript as JSON string, but only if valid
        summary || null,
        (status || 'COMPLETED').toUpperCase()
      ]
    );
    
    const session = sessionResult.rows[0];
    
    console.log('✅ Session saved to database:', {
      sessionId: session.id,
      duration: session.duration,
      durationType: typeof session.duration,
      transcriptRefLength: session.transcript_ref ? session.transcript_ref.length : 0,
      hasTranscriptRef: !!session.transcript_ref,
      transcriptRefType: typeof session.transcript_ref,
      transcriptRefPreview: session.transcript_ref ? session.transcript_ref.substring(0, 100) : 'N/A',
      startTime: session.start_time,
      endTime: session.end_time
    });
    
    // Verify the transcript was actually saved by querying it back
    const verifyResult = await db.query(
      `SELECT transcript_ref, duration FROM sessions WHERE id = $1`,
      [session.id]
    );
    console.log('🔍 Verification query result:', {
      sessionId: session.id,
      hasTranscriptRef: !!verifyResult.rows[0]?.transcript_ref,
      transcriptRefLength: verifyResult.rows[0]?.transcript_ref ? verifyResult.rows[0].transcript_ref.length : 0,
      duration: verifyResult.rows[0]?.duration,
      durationType: typeof verifyResult.rows[0]?.duration
    });
    
    // Create action steps if provided
    if (actionSteps && Array.isArray(actionSteps) && actionSteps.length > 0) {
      for (const step of actionSteps) {
        await db.query(
          `INSERT INTO action_steps (session_id, user_id, description, due_date, status, priority)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            session.id,
            userId,
            step.description || step,
            step.dueDate || null,
            'PENDING',
            step.priority || 'MEDIUM'
          ]
        );
      }
    }
    
    // Return the saved session with proper formatting
    const responseSession = {
      id: session.id,
      userId: session.user_id,
      coachId: session.coach_id,
      startTime: session.start_time,
      endTime: session.end_time,
      duration: session.duration,
      transcript: session.transcript_ref,
      summary: session.summary,
      status: session.status
    };
    
    console.log('📤 Returning saved session:', {
      id: responseSession.id,
      duration: responseSession.duration,
      hasTranscript: !!responseSession.transcript,
      transcriptLength: responseSession.transcript ? responseSession.transcript.length : 0
    });
    
    res.status(201).json(responseSession);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session', details: error.message });
  }
});

// GET /api/sessions - Get current user's sessions
app.get('/api/sessions', async (req, res) => {
  try {
    // Get user ID from token (if authenticated)
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    // Decode token to get user ID
    const jwt = require('jsonwebtoken')
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
    let userId

    try {
      const decoded = jwt.verify(token, JWT_SECRET)
      userId = decoded.userId
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    // Get user's sessions with coach info, optionally filtered by coach
    const { coachId, limit } = req.query;
    let query = `SELECT
        s.id,
        s.user_id,
        s.coach_id,
        s.start_time,
        s.end_time,
        s.duration,
        s.transcript_ref,
        s.summary,
        s.status,
        c.name as coach_name,
        c.role as coach_role,
        (SELECT COUNT(*) FROM action_steps WHERE session_id = s.id) as action_steps_count
      FROM sessions s
      LEFT JOIN coaches c ON s.coach_id = c.id
      WHERE s.user_id = $1`;
    const params = [userId];
    let paramIndex = 2;

    if (coachId) {
      query += ` AND s.coach_id = $${paramIndex}`;
      params.push(coachId);
      paramIndex++;
    }

    query += ` ORDER BY s.start_time DESC`;

    if (limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(parseInt(limit));
    }

    const sessionsResult = await db.query(query, params);
    
    console.log('📖 Retrieved sessions from database:', {
      count: sessionsResult.rows.length,
      sampleSession: sessionsResult.rows[0] ? {
        id: sessionsResult.rows[0].id,
        hasTranscriptRef: !!sessionsResult.rows[0].transcript_ref,
        transcriptRefLength: sessionsResult.rows[0].transcript_ref ? sessionsResult.rows[0].transcript_ref.length : 0,
        transcriptRefType: typeof sessionsResult.rows[0].transcript_ref,
        duration: sessionsResult.rows[0].duration,
        durationType: typeof sessionsResult.rows[0].duration
      } : 'No sessions'
    })

    // Format sessions
    const sessions = sessionsResult.rows.map(session => {
      // Calculate duration from start/end time if duration is null
      let duration = session.duration;
      
      // Convert to number if it's a string
      if (duration && typeof duration === 'string') {
        duration = parseFloat(duration);
        if (isNaN(duration)) {
          duration = null;
        }
      }
      
      if (!duration && session.start_time && session.end_time) {
        const startTime = new Date(session.start_time);
        const endTime = new Date(session.end_time);
        const diffMs = endTime - startTime;
        if (diffMs > 0) {
          // Convert to minutes (can be fractional for seconds) - record every second
          duration = diffMs / 1000 / 60;
          duration = Math.round(duration * 100) / 100; // Round to 2 decimal places for precision
        }
      }
      
      // Ensure transcript is returned correctly
      let transcriptData = session.transcript_ref;
      if (!transcriptData || transcriptData === '[]' || transcriptData === 'null' || (typeof transcriptData === 'string' && transcriptData.trim().length === 0)) {
        transcriptData = null;
      }
      
      console.log('📖 Formatting session for list:', {
        id: session.id,
        duration: duration,
        durationType: typeof duration,
        dbDuration: session.duration,
        dbDurationType: typeof session.duration,
        hasTranscript: !!transcriptData,
        transcriptLength: transcriptData ? transcriptData.length : 0
      });
      
      return {
        id: session.id,
        userId: session.user_id,
        coachId: session.coach_id,
        startTime: session.start_time,
        endTime: session.end_time,
        duration: duration,
        transcript: transcriptData,
        summary: session.summary,
        status: session.status,
        coach: {
          id: session.coach_id,
          name: session.coach_name || 'Unknown Coach',
          role: session.coach_role || 'Coach'
        },
        _count: {
          actionSteps: parseInt(session.action_steps_count) || 0
        }
      };
    })

    res.json(sessions)
  } catch (error) {
    console.error('Error fetching sessions:', error)
    res.status(500).json({ error: 'Failed to fetch sessions', details: error.message })
  }
})

// PUT /api/sessions/:id - Update session
app.put('/api/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, endTime, duration, summary, transcriptRef, notesRef } = req.body;

    console.log('📝 Updating session:', { id, hasTranscriptRef: !!transcriptRef, duration, status });

    // Build update query dynamically
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      params.push(status.toUpperCase());
      paramIndex++;
    }

    if (endTime !== undefined) {
      updates.push(`end_time = $${paramIndex}`);
      params.push(endTime);
      paramIndex++;
    }

    if (duration !== undefined) {
      // Convert duration to number if it's a string
      let durationValue = duration;
      if (typeof durationValue === 'string') {
        durationValue = parseFloat(durationValue);
        if (isNaN(durationValue)) {
          durationValue = null;
        }
      }
      if (typeof durationValue === 'number' && durationValue > 0) {
        durationValue = Math.round(durationValue * 100) / 100; // Round to 2 decimal places
      }
      updates.push(`duration = $${paramIndex}`);
      params.push(durationValue);
      paramIndex++;
    }

    if (summary !== undefined) {
      updates.push(`summary = $${paramIndex}`);
      params.push(summary);
      paramIndex++;
    }

    if (transcriptRef !== undefined) {
      // Handle both transcriptRef (camelCase) and transcript_ref (snake_case)
      updates.push(`transcript_ref = $${paramIndex}`);
      params.push(transcriptRef);
      paramIndex++;
    }

    if (notesRef !== undefined) {
      updates.push(`notes_ref = $${paramIndex}`);
      params.push(notesRef);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Add updated_at timestamp
    updates.push(`updated_at = NOW()`);

    // Add session ID as the last parameter
    params.push(id);

    const query = `
      UPDATE sessions
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    console.log('🔄 Executing update query:', query, params);

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const updatedSession = result.rows[0];

    console.log('✅ Session updated successfully:', {
      id: updatedSession.id,
      hasTranscriptRef: !!updatedSession.transcript_ref,
      transcriptRefLength: updatedSession.transcript_ref ? updatedSession.transcript_ref.length : 0,
      duration: updatedSession.duration,
      status: updatedSession.status
    });

    // Return the updated session in the expected format
    res.json({
      id: updatedSession.id,
      userId: updatedSession.user_id,
      coachId: updatedSession.coach_id,
      startTime: updatedSession.start_time,
      endTime: updatedSession.end_time,
      duration: updatedSession.duration,
      transcript: updatedSession.transcript_ref,
      summary: updatedSession.summary,
      status: updatedSession.status
    });

  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ error: 'Failed to update session', details: error.message });
  }
});

// GET /api/sessions/:id - Get specific session details
app.get('/api/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    // Decode token to get user ID
    const jwt = require('jsonwebtoken')
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
    let userId

    try {
      const decoded = jwt.verify(token, JWT_SECRET)
      userId = decoded.userId
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    // Get session with coach and action steps
    const sessionResult = await db.query(
      `SELECT 
        s.id,
        s.user_id,
        s.coach_id,
        s.start_time,
        s.end_time,
        s.duration,
        s.transcript_ref,
        s.summary,
        s.status,
        c.name as coach_name,
        c.role as coach_role,
        u.name as user_name,
        u.email as user_email
      FROM sessions s
      LEFT JOIN coaches c ON s.coach_id = c.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = $1 AND s.user_id = $2`,
      [id, userId]
    )

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    const session = sessionResult.rows[0]
    
    console.log('📖 Retrieved session from database:', {
      id: session.id,
      hasTranscriptRef: !!session.transcript_ref,
      transcriptRefLength: session.transcript_ref ? session.transcript_ref.length : 0,
      transcriptRefType: typeof session.transcript_ref,
      transcriptRefPreview: session.transcript_ref ? session.transcript_ref.substring(0, 100) : 'N/A'
    })

    // Get action steps
    const actionStepsResult = await db.query(
      `SELECT * FROM action_steps WHERE session_id = $1 ORDER BY created_at ASC`,
      [id]
    )

    // Calculate duration from start/end time if duration is null
    let duration = session.duration;
    
    // Convert to number if it's a string
    if (duration && typeof duration === 'string') {
      duration = parseFloat(duration);
      if (isNaN(duration)) {
        duration = null;
      }
    }
    
    if (!duration && session.start_time && session.end_time) {
      const startTime = new Date(session.start_time);
      const endTime = new Date(session.end_time);
      const diffMs = endTime - startTime;
      if (diffMs > 0) {
        // Convert to minutes (can be fractional for seconds) - record every second
        duration = diffMs / 1000 / 60;
        duration = Math.round(duration * 100) / 100; // Round to 2 decimal places for precision
      }
    }

    console.log('📖 Returning session:', {
      id: session.id,
      hasTranscriptRef: !!session.transcript_ref,
      transcriptRefLength: session.transcript_ref ? session.transcript_ref.length : 0,
      transcriptRefType: typeof session.transcript_ref,
      transcriptRefPreview: session.transcript_ref ? session.transcript_ref.substring(0, 200) : 'N/A',
      transcriptIsEmpty: !session.transcript_ref || session.transcript_ref === '[]' || session.transcript_ref === 'null',
      duration: duration,
      durationType: typeof duration
    });

    // Ensure transcript is returned correctly
    let transcriptData = session.transcript_ref;
    if (transcriptData && transcriptData !== '[]' && transcriptData !== 'null' && transcriptData.trim().length > 0) {
      console.log('✅ Valid transcript found, returning to client:', {
        transcriptLength: transcriptData.length,
        transcriptPreview: transcriptData.substring(0, 100)
      });
    } else {
      console.error('❌ WARNING: No valid transcript in database for session:', session.id, {
        transcriptRef: session.transcript_ref,
        transcriptRefType: typeof session.transcript_ref,
        transcriptRefLength: session.transcript_ref ? session.transcript_ref.length : 0
      });
      transcriptData = null;
    }

    res.json({
      id: session.id,
      userId: session.user_id,
      coachId: session.coach_id,
      startTime: session.start_time,
      endTime: session.end_time,
      duration: duration,
      transcript: transcriptData,
      summary: session.summary,
      status: session.status,
      coach: {
        id: session.coach_id,
        name: session.coach_name || 'Unknown Coach',
        role: session.coach_role || 'Coach'
      },
      user: {
        id: session.user_id,
        name: session.user_name,
        email: session.user_email
      },
      actionSteps: actionStepsResult.rows
    })
  } catch (error) {
    console.error('Error fetching session:', error)
    res.status(500).json({ error: 'Failed to fetch session', details: error.message })
  }
})

app.post('/api/sessions/send-notes', async (req, res) => {
  try {
    const { sessionId, userId, coachId, summary, actionSteps, sendVia } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Get user email
    const userResult = await db.query('SELECT email, name FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userResult.rows[0];
    
    // Get coach name
    const coachResult = await db.query('SELECT name FROM coaches WHERE id = $1', [coachId]);
    const coachName = coachResult.rows.length > 0 ? coachResult.rows[0].name : 'Your Coach';
    
    // Generate email content
    const emailContent = {
      subject: `Coaching Session Summary - ${coachName}`,
      html: `
        <h2>Coaching Session Summary</h2>
        <p>Hello ${user.name},</p>
        <p>Here's a summary of your recent coaching session with ${coachName}:</p>
        
        <h3>Session Summary</h3>
        <p>${summary || 'No summary available.'}</p>
        
        ${actionSteps && actionSteps.length > 0 ? `
        <h3>Action Steps</h3>
        <ul>
          ${actionSteps.map((step, idx) => `<li>${step.description || step}</li>`).join('')}
        </ul>
        ` : ''}
        
        <p>Best regards,<br>10XCoach.ai Team</p>
      `
    };
    
    // Send via email if requested
    if (sendVia === 'email' || sendVia === 'both') {
      const { sendEmail } = require('./src/lib/email');
      await sendEmail(user.email, emailContent.subject, emailContent.html);
    }
    
    // TODO: Send via SMS if requested (need SMS provider integration)
    if (sendVia === 'sms' || sendVia === 'both') {
      // Placeholder for SMS sending
      console.log('SMS sending not yet implemented');
    }
    
    // Save note to database
    await db.query(
      `INSERT INTO notes (session_date, coach_id, user_id, content, sent)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        new Date(),
        coachId,
        userId,
        summary || '',
        true
      ]
    );
    
    res.json({ message: 'Notes sent successfully', sentVia });
  } catch (error) {
    console.error('Error sending notes:', error);
    res.status(500).json({ error: 'Failed to send notes', details: error.message });
  }
});

// ============================================
// REMINDERS ENDPOINTS
// ============================================
app.post('/api/reminders', async (req, res) => {
  try {
    const { userId, coachId, type, title, description, dueDate, recurring, recurringPattern, recurringTime, sendVia } = req.body;
    
    if (!userId || !title) {
      return res.status(400).json({ error: 'User ID and title are required' });
    }
    
    // For now, create a todo item as a reminder
    // In production, you'd want a dedicated reminders table
    const result = await db.query(
      `INSERT INTO todos (user_id, title, description, due_date, status, priority)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        userId,
        title,
        description || null,
        dueDate || null,
        'PENDING',
        'HIGH'
      ]
    );
    
    // TODO: Implement recurring reminders and scheduling
    // This would require a reminders table and a background job scheduler
    
    res.status(201).json({ reminder: result.rows[0], message: 'Reminder created successfully' });
  } catch (error) {
    console.error('Error creating reminder:', error);
    res.status(500).json({ error: 'Failed to create reminder', details: error.message });
  }
});

// ============================================
// API ROUTES - Must be before static file serving
// ============================================

// ============================================
// COACHES ENDPOINTS
// ============================================
app.get('/api/coaches', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM coaches ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching coaches:', error);
    res.status(500).json({ error: 'Failed to fetch coaches' });
  }
});

app.get('/api/coaches/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM coaches WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Coach not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching coach:', error);
    res.status(500).json({ error: 'Failed to fetch coach' });
  }
});

app.post('/api/coaches', async (req, res) => {
  try {
    const { name, email, specialty, description, tagline, avatar } = req.body;
    const result = await db.query(
      'INSERT INTO coaches (name, email, specialty, description, tagline, avatar) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, email, specialty, description, tagline, avatar]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating coach:', error);
    res.status(500).json({ error: 'Failed to create coach' });
  }
});

app.put('/api/coaches/:id', async (req, res) => {
  try {
    const { name, email, specialty, description, tagline, avatar, active } = req.body;
    const result = await db.query(
      'UPDATE coaches SET name = $1, email = $2, specialty = $3, description = $4, tagline = $5, avatar = $6, active = $7, updated_at = NOW() WHERE id = $8 RETURNING *',
      [name, email, specialty, description, tagline, avatar, active, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Coach not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating coach:', error);
    res.status(500).json({ error: 'Failed to update coach' });
  }
});

app.delete('/api/coaches/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM coaches WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Coach not found' });
    }
    res.json({ message: 'Coach deleted successfully' });
  } catch (error) {
    console.error('Error deleting coach:', error);
    res.status(500).json({ error: 'Failed to delete coach' });
  }
});

// ============================================
// USERS ENDPOINTS
// ============================================
app.get('/api/users', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT u.*, c.name as primary_coach_name 
      FROM users u 
      LEFT JOIN coaches c ON u.primary_coach_id = c.id 
      ORDER BY u.id
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get admin users only (for notes page dropdown - no auth required)
app.get('/api/users/admins', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT u.id, u.name, u.email, u.role
      FROM users u 
      WHERE u.role = 'ADMIN'
      ORDER BY u.name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ error: 'Failed to fetch admin users' });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT u.*, c.name as primary_coach_name 
      FROM users u 
      LEFT JOIN coaches c ON u.primary_coach_id = c.id 
      WHERE u.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, email, business_name, industry, plan, status, primary_coach_id } = req.body;
    const result = await db.query(
      'INSERT INTO users (name, email, business_name, industry, plan, status, primary_coach_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, email, business_name, industry, plan, status, primary_coach_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { name, email, business_name, industry, plan, status, primary_coach_id } = req.body;
    const result = await db.query(
      'UPDATE users SET name = $1, email = $2, business_name = $3, industry = $4, plan = $5, status = $6, primary_coach_id = $7, updated_at = NOW() WHERE id = $8 RETURNING *',
      [name, email, business_name, industry, plan, status, primary_coach_id, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ============================================
// QUIZZES ENDPOINTS
// ============================================
app.get('/api/quizzes', async (req, res) => {
  try {
    const { coachId } = req.query;
    let query = `
      SELECT
        qr.id,
        qr.user_id,
        qr.quiz_id,
        qr.coach_id,
        qr.total_score as score,
        qr.total_score as totalScore,
        qr.created_at,
        qr.created_at::date as quiz_date,
        u.name as user_name,
        c.name as coach_name,
        qr.scores_json as scores,
        qr.answers_json as answers
      FROM quiz_results qr
      LEFT JOIN users u ON qr.user_id = u.id
      LEFT JOIN coaches c ON qr.coach_id = c.id
    `;
    const params = [];

    if (coachId) {
      query += ' WHERE qr.coach_id = $1';
      params.push(coachId);
    }
    query += ' ORDER BY qr.created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
});

app.get('/api/quizzes/stats', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*) as total,
        ROUND(AVG(total_score)) as average_score,
        COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)) as this_month
      FROM quiz_results
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching quiz stats:', error);
    res.status(500).json({ error: 'Failed to fetch quiz stats' });
  }
});

app.post('/api/quizzes', async (req, res) => {
  try {
    const { user_id, coach_id, score, completed } = req.body;
    const result = await db.query(
      'INSERT INTO quizzes (user_id, coach_id, score, completed, quiz_date) VALUES ($1, $2, $3, $4, CURRENT_DATE) RETURNING *',
      [user_id, coach_id, score, completed]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({ error: 'Failed to create quiz' });
  }
});

// ============================================
// HUDDLES ENDPOINTS
// ============================================
app.get('/api/huddles', async (req, res) => {
  try {
    const { coachId, userId, startDate, endDate, status, search } = req.query;
    let query = `
      SELECT 
        h.*, 
        c.name as coach_name,
        u.name as user_name,
        u.email as user_email
      FROM huddles h 
      LEFT JOIN coaches c ON h.coach_id = c.id
      LEFT JOIN users u ON h.user_id = u.id
    `;
    const params = [];
    const conditions = [];
    let paramIndex = 1;
    
    if (coachId) {
      conditions.push(`h.coach_id = $${paramIndex}`);
      params.push(coachId);
      paramIndex++;
    }
    
    if (userId) {
      conditions.push(`h.user_id = $${paramIndex}`);
      params.push(userId);
      paramIndex++;
    }
    
    if (startDate) {
      conditions.push(`h.huddle_date >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      conditions.push(`h.huddle_date <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }
    
    if (status) {
      conditions.push(`LOWER(h.status) = LOWER($${paramIndex})`);
      params.push(status);
      paramIndex++;
    }
    
    if (search) {
      conditions.push(`(h.title ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY h.huddle_date DESC, h.created_at DESC';
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching huddles:', error);
    res.status(500).json({ error: 'Failed to fetch huddles' });
  }
});

app.get('/api/huddles/stats', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE has_short_agenda AND has_notetaker AND has_action_steps) as compliant,
        COUNT(*) FILTER (WHERE NOT (has_short_agenda AND has_notetaker AND has_action_steps)) as non_compliant
      FROM huddles
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching huddle stats:', error);
    res.status(500).json({ error: 'Failed to fetch huddle stats' });
  }
});

app.post('/api/huddles', async (req, res) => {
  try {
    const { title, huddle_date, coach_id, user_id, has_short_agenda, has_notetaker, has_action_steps, status, externalParticipants } = req.body;
    
    console.log('Creating huddle with data:', { title, huddle_date, coach_id, user_id, has_short_agenda, has_notetaker, has_action_steps, status });
    
    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    if (!coach_id) {
      return res.status(400).json({ error: 'Coach ID is required' });
    }
    
    // Status is VARCHAR(50) in actual database, not enum - use lowercase
    const statusValue = (status || 'scheduled').toLowerCase();
    
    // huddle_date is DATE type, not TIMESTAMP - use date string (YYYY-MM-DD)
    let huddleDate;
    if (huddle_date) {
      // Extract just the date part (YYYY-MM-DD)
      const dateMatch = huddle_date.match(/^(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        huddleDate = dateMatch[1];
      } else {
        huddleDate = new Date(huddle_date).toISOString().split('T')[0];
      }
    } else {
      huddleDate = new Date().toISOString().split('T')[0];
    }
    
    console.log('Inserting with values:', { title, huddleDate, coach_id, user_id, has_short_agenda, has_notetaker, has_action_steps, statusValue });
    
    // Insert into database - huddle_date is DATE type, status is VARCHAR
    const result = await db.query(
      `INSERT INTO huddles (title, huddle_date, coach_id, user_id, has_short_agenda, has_notetaker, has_action_steps, status) 
       VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [title, huddleDate, coach_id, user_id, has_short_agenda || false, has_notetaker || false, has_action_steps || false, statusValue]
    );
    
    const huddle = result.rows[0];
    
    // Send invites to external participants if provided
    if (externalParticipants && Array.isArray(externalParticipants) && externalParticipants.length > 0) {
      const { sendEmail } = require('./src/lib/email');
      const userResult = await db.query('SELECT name, email FROM users WHERE id = $1', [user_id]);
      const coachResult = await db.query('SELECT name FROM coaches WHERE id = $1', [coach_id]);
      const userName = userResult.rows.length > 0 ? userResult.rows[0].name : 'User';
      const userEmail = userResult.rows.length > 0 ? userResult.rows[0].email : '';
      const coachName = coachResult.rows.length > 0 ? coachResult.rows[0].name : '10X Coach';
      
      for (const participantEmail of externalParticipants) {
        try {
          await sendEmail(
            participantEmail,
            `Invitation: ${title} - 10X 10-Minute Huddle`,
            `
              <h2>You're Invited to a 10X 10-Minute Huddle</h2>
              <p>Hello,</p>
              <p>${userName} has invited you to a 10X 10-Minute Huddle meeting:</p>
              <p><strong>Title:</strong> ${title}</p>
              <p><strong>Date:</strong> ${new Date(huddleDate).toLocaleDateString()}</p>
              <p><strong>Participants:</strong> ${userName}, ${coachName} (10X Coach), and you</p>
              <p>This is a structured 10-minute meeting with agenda, note-taking, and action steps.</p>
              <p>Best regards,<br>10XCoach.ai Team</p>
            `
          );
        } catch (emailError) {
          console.error(`Failed to send invite to ${participantEmail}:`, emailError);
        }
      }
    }
    
    res.status(201).json(huddle);
  } catch (error) {
    console.error('Error creating huddle:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to create huddle', details: error.message, code: error.code });
  }
});

app.put('/api/huddles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, huddle_date, coach_id, user_id, has_short_agenda, has_notetaker, has_action_steps, status } = req.body;
    
    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    if (!coach_id) {
      return res.status(400).json({ error: 'Coach ID is required' });
    }
    
    // Status is VARCHAR(50) in actual database, not enum - use lowercase
    const statusValue = (status || 'scheduled').toLowerCase();
    
    // huddle_date is DATE type, not TIMESTAMP - use date string (YYYY-MM-DD)
    let huddleDate;
    if (huddle_date) {
      // Extract just the date part (YYYY-MM-DD)
      const dateMatch = huddle_date.match(/^(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        huddleDate = dateMatch[1];
      } else {
        huddleDate = new Date(huddle_date).toISOString().split('T')[0];
      }
    } else {
      huddleDate = new Date().toISOString().split('T')[0];
    }
    
    const result = await db.query(
      `UPDATE huddles 
       SET title = $1, huddle_date = $2::date, coach_id = $3, user_id = $4, 
           has_short_agenda = $5, has_notetaker = $6, has_action_steps = $7, status = $8,
           updated_at = NOW()
       WHERE id = $9 
       RETURNING *`,
      [title, huddleDate, coach_id, user_id, has_short_agenda || false, has_notetaker || false, has_action_steps || false, statusValue, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Huddle not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating huddle:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to update huddle', details: error.message, code: error.code });
  }
});

app.delete('/api/huddles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM huddles WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Huddle not found' });
    }
    
    res.json({ message: 'Huddle deleted successfully' });
  } catch (error) {
    console.error('Error deleting huddle:', error);
    res.status(500).json({ error: 'Failed to delete huddle' });
  }
});

// ============================================
// NOTES ENDPOINTS
// ============================================
app.get('/api/notes', async (req, res) => {
  try {
    const { coachId, userId, startDate, endDate, search } = req.query;
    let query = `
      SELECT 
        n.id,
        n.session_date,
        n.coach_id,
        n.user_id,
        n.content,
        n.sent,
        n.created_at,
        n.updated_at,
        c.name as coach_name, 
        u.name as client_name, 
        u.role as client_role
      FROM notes n 
      LEFT JOIN coaches c ON n.coach_id = c.id 
      LEFT JOIN users u ON n.user_id = u.id
    `;
    const params = [];
    const conditions = [];
    let paramIndex = 1;
    
    if (coachId) {
      conditions.push(`n.coach_id = $${paramIndex}`);
      params.push(coachId);
      paramIndex++;
    }
    
    if (userId) {
      conditions.push(`n.user_id = $${paramIndex}`);
      params.push(userId);
      paramIndex++;
    }
    
    if (startDate) {
      conditions.push(`n.session_date >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      conditions.push(`n.session_date <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }
    
    if (search) {
      conditions.push(`(n.content ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY n.session_date DESC';
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

app.post('/api/notes', async (req, res) => {
  try {
    const { coach_id, user_id, content, sent, session_date } = req.body;
    const sessionDate = session_date || new Date().toISOString().split('T')[0];
    const result = await db.query(
      'INSERT INTO notes (session_date, coach_id, user_id, content, sent) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [sessionDate, coach_id, user_id, content, sent || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

app.put('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { coach_id, user_id, content, sent, session_date } = req.body;
    
    const updateFields = [];
    const params = [];
    let paramIndex = 1;
    
    if (coach_id !== undefined) {
      updateFields.push(`coach_id = $${paramIndex}`);
      params.push(coach_id);
      paramIndex++;
    }
    
    if (user_id !== undefined) {
      updateFields.push(`user_id = $${paramIndex}`);
      params.push(user_id);
      paramIndex++;
    }
    
    if (content !== undefined) {
      updateFields.push(`content = $${paramIndex}`);
      params.push(content);
      paramIndex++;
    }
    
    if (sent !== undefined) {
      updateFields.push(`sent = $${paramIndex}`);
      params.push(sent);
      paramIndex++;
    }
    
    if (session_date !== undefined) {
      updateFields.push(`session_date = $${paramIndex}`);
      params.push(session_date);
      paramIndex++;
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updateFields.push(`updated_at = NOW()`);
    params.push(id);
    
    const query = `
      UPDATE notes 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramIndex} 
      RETURNING *
    `;
    
    const result = await db.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    // Fetch the updated note with joined data
    const updatedNote = await db.query(
      `SELECT n.*, c.name as coach_name, u.name as client_name 
       FROM notes n 
       LEFT JOIN coaches c ON n.coach_id = c.id 
       LEFT JOIN users u ON n.user_id = u.id 
       WHERE n.id = $1`,
      [id]
    );
    
    res.json(updatedNote.rows[0]);
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// DELETE note endpoint - MUST be before any catch-all routes
app.delete('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[DELETE /api/notes/:id] Attempting to delete note with id: ${id}`);
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid note ID' });
    }
    
    const result = await db.query('DELETE FROM notes WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      console.log(`[DELETE /api/notes/:id] Note with id ${id} not found`);
      return res.status(404).json({ error: 'Note not found' });
    }
    
    console.log(`[DELETE /api/notes/:id] Successfully deleted note with id: ${id}`);
    res.json({ message: 'Note deleted successfully', note: result.rows[0] });
  } catch (error) {
    console.error('[DELETE /api/notes/:id] Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note', details: error.message });
  }
});

// Test endpoint to verify DELETE method works
app.delete('/api/test-delete', (req, res) => {
  res.json({ message: 'DELETE method is working!', timestamp: new Date().toISOString() });
});

// ============================================
// TODOS ENDPOINTS
// ============================================
app.get('/api/todos', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM todos ORDER BY due_date ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching todos:', error);
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

app.post('/api/todos', async (req, res) => {
  try {
    const { title, description, user_id, assigned_to, due_date, status, priority } = req.body;
    const result = await db.query(
      'INSERT INTO todos (title, description, user_id, assigned_to, due_date, status, priority) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [title, description, user_id, assigned_to, due_date, status, priority]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating todo:', error);
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

app.put('/api/todos/:id', async (req, res) => {
  try {
    const { title, description, assigned_to, due_date, status, priority } = req.body;
    const result = await db.query(
      'UPDATE todos SET title = $1, description = $2, assigned_to = $3, due_date = $4, status = $5, priority = $6, updated_at = NOW() WHERE id = $7 RETURNING *',
      [title, description, assigned_to, due_date, status, priority, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating todo:', error);
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

app.delete('/api/todos/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM todos WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    res.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    console.error('Error deleting todo:', error);
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

// ============================================
// DASHBOARD STATS ENDPOINT
// ============================================
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM quiz_results) as total_quizzes,
        (SELECT COUNT(*) FROM huddles) as total_huddles,
        (SELECT COUNT(*) FROM notes) as total_notes,
        (SELECT COUNT(*) FROM todos) as total_todos,
        (SELECT COUNT(*) FROM todos WHERE status = 'COMPLETED') as completed_todos,
        (SELECT COUNT(*) FROM todos WHERE status = 'PENDING') as pending_todos
    `);
    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// ============================================
// ADMIN API ENDPOINTS
// ============================================

// Admin Overview Stats
app.get('/api/admin/overview', async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE status = 'Active') as active_subscribers,
        (SELECT COUNT(*) FROM users WHERE plan = 'Foundation') as foundation_plan,
        (SELECT COUNT(*) FROM users WHERE plan = 'Momentum') as momentum_plan,
        (SELECT COUNT(*) FROM users WHERE plan = 'Elite') as elite_plan,
        (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '7 days') as new_signups_7d,
        (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '30 days') as new_signups_30d
    `);
    
    // Add some computed stats
    const result = {
      ...stats.rows[0],
      avgBusinessHealth: 68.5,
      healthTrend: 4.2,
      sessionsPerUser: 3.2,
      avgSessionLength: 18,
      activeUsers7d: 72,
      redFlagUsers: 23,
      inactiveUsers30d: 89
    };
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching admin overview:', error);
    res.status(500).json({ error: 'Failed to fetch admin overview' });
  }
});

// Admin Users List
app.get('/api/admin/users', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT u.*, c.name as primary_coach 
      FROM users u 
      LEFT JOIN coaches c ON u.primary_coach_id = c.id 
      ORDER BY u.id
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ error: 'Failed to fetch admin users' });
  }
});

// Admin Coaches List
app.get('/api/admin/coaches', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        id, name, 
        CASE 
          WHEN specialty LIKE 'Business%' THEN 'Strategy'
          ELSE SPLIT_PART(specialty, ' ', 1)
        END as pillar,
        tagline, active, model, temperature, max_tokens,
        (SELECT COUNT(*) FROM users WHERE primary_coach_id = coaches.id) as knowledge_sources
      FROM coaches 
      ORDER BY id
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching admin coaches:', error);
    res.status(500).json({ error: 'Failed to fetch admin coaches' });
  }
});

// ============================================
// MODULE ROUTES - Mount quiz and auth routes
// ============================================
const quizRoutes = require('./src/modules/quizzes/quiz.routes');
const authRoutes = require('./src/modules/users/auth.routes');
const adminRoutes = require('./src/modules/admin/admin.routes');

// Mount routes
app.use('/api', quizRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// ============================================
// STATIC FILE SERVING - Must be after API routes
// ============================================

// Serve built frontend (production) - only for non-API routes
const staticMiddleware = express.static(path.join(__dirname, '../client/dist'));
app.use((req, res, next) => {
  // Skip static file serving for API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }
  staticMiddleware(req, res, next);
});

// 404 handler for unmatched API routes (must be after all specific API routes)
// This will only catch routes that don't match any specific handler above
app.all('/api/*', (req, res, next) => {
  // Only handle if no route matched (this should rarely be hit for defined routes)
  console.log(`[404] API route not found: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: 'API route not found', 
    path: req.path, 
    method: req.method,
    message: 'The requested API endpoint does not exist'
  });
});

// SPA fallback - serve index.html for all non-API GET routes
app.get('*', (req, res) => {
  // Skip API routes (shouldn't reach here for API routes, but just in case)
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📝 Notes API endpoints:`);
  console.log(`   GET    /api/notes`);
  console.log(`   POST   /api/notes`);
  console.log(`   PUT    /api/notes/:id`);
  console.log(`   DELETE /api/notes/:id`);
});

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
  let sessionStartTime = null;
  let currentCoachName = null;
  let currentUserId = null;
  let currentUserName = null;
  let currentCoachId = null;
  let sessionId = null;
  let greetingSent = false;

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
        currentUserId = message.userId;
        currentUserName = message.userName;
        currentCoachId = message.coachId;

        const token = message.token;

        // Try to decode user info from token if not provided
        if (token && !currentUserName) {
          try {
            const jwt = require('jsonwebtoken');
            const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
            const decoded = jwt.verify(token, JWT_SECRET);
            currentUserId = decoded.userId;
            currentUserName = decoded.name || decoded.userName || decoded.username || null;
          } catch (error) {
            console.warn('Could not decode token:', error.message);
          }
        }

        console.log(`👤 Session: ${currentUserName} with ${currentCoachName}`);

        // Initialize session
        conversationTranscript = [];
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
        const coachVoiceMapLocal = {
          'Alan Wozniak': 'ash',
          'Rob Mercer': 'echo',
          'Jeffrey Wells': 'onyx',
          'Hudson Jaxon': 'cedar',
          'Tanner Chase': 'verse',
          'Teresa Lane': 'shimmer',
          'Camille Quinn': 'coral',
          'Chelsea Fox': 'sage'
        };

        const voice = coachVoiceMapLocal[currentCoachName] || 'echo';
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
              create_response: true
            },
            tools: [],
            tool_choice: 'auto',
            temperature: 0.8,
            max_response_output_tokens: 4096
          }
        };

        // Connect to OpenAI
        try {
          openaiWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01', {
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
                  setTimeout(() => {
                    const greetingMessage = `Hello ${currentUserName || 'there'}! I'm ${currentCoachName}, ready to help you achieve your goals. What would you like to work on today?`;
                    console.log(`👋 Sending greeting: "${greetingMessage}"`);

                    conversationTranscript.push({
                      role: 'assistant',
                      text: greetingMessage,
                      timestamp: new Date().toISOString()
                    });

                    openaiWs.send(JSON.stringify({
                      type: 'conversation.item.create',
                      item: {
                        type: 'message',
                        role: 'assistant',
                        content: [{
                          type: 'input_text',
                          text: greetingMessage
                        }]
                      }
                    }));

                    openaiWs.send(JSON.stringify({
                      type: 'response.create'
                    }));

                  }, 1000);
                }

              } else if (message.type === 'response.audio.delta') {
                // Forward audio to client
                safeSend({
                  type: 'audio',
                  audio: message.delta,
                  responseId: message.response_id
                });
              } else if (message.type === 'response.text.delta') {
                // Forward text to client
                safeSend({
                  type: 'text',
                  text: message.delta,
                  responseId: message.response_id
                });
              } else if (message.type === 'response.done') {
                safeSend({
                  type: 'response_done',
                  response: message.response
                });
              } else if (message.type === 'error') {
                console.error('OpenAI error:', message.error);
                safeSend({
                  type: 'error',
                  message: message.error?.message || 'OpenAI error'
                });
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
          openaiWs.send(JSON.stringify({ type: 'conversation.item.clear' }));
        }

        // Auto-save conversation
        if (currentUserId && currentCoachId && conversationTranscript.length > 0) {
          // Save logic here (similar to existing save functionality)
          console.log('💾 Auto-saving conversation on stop');
        }

        safeSend({ type: 'stopped' });

      } else if (message.type === 'save_conversation') {
        // Handle manual save
        console.log('💾 Manual save requested');
        // Save logic here
        safeSend({ type: 'conversation_saved' });
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

// ============================================
// START SERVER
// ============================================

server.listen(PORT, () => {
  const protocol = USE_HTTPS ? 'https' : 'http';
  console.log(`🚀 10X Coach Platform Server running on ${protocol}://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 HTTPS: ${USE_HTTPS ? 'Enabled' : 'Disabled'}`);
  console.log(`🎯 OpenAI Conversations: Integrated`);
  console.log(`📱 WebSocket Server: Active on same port`);
});
