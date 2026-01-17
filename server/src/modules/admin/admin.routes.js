console.log('[ADMIN ROUTES] Loading admin routes module...');

const express = require('express');
const router = express.Router();

console.log('[ADMIN ROUTES] Router created');

let prisma, db, authenticate, requireAdmin, requireSuperAdmin;

try {
  prisma = require('../../lib/prisma');
  console.log('[ADMIN ROUTES] ✅ Prisma loaded');
} catch (error) {
  console.error('[ADMIN ROUTES] ❌ Error loading prisma:', error.message);
}

try {
  db = require('../../../db');
  console.log('[ADMIN ROUTES] ✅ Database module loaded');
} catch (error) {
  console.error('[ADMIN ROUTES] ❌ Error loading db:', error.message);
}

try {
  const authMiddleware = require('../../middleware/auth.middleware');
  authenticate = authMiddleware.authenticate;
  requireAdmin = authMiddleware.requireAdmin;
  requireSuperAdmin = authMiddleware.requireSuperAdmin;
  console.log('[ADMIN ROUTES] ✅ Auth middleware loaded');
} catch (error) {
  console.error('[ADMIN ROUTES] ❌ Error loading auth middleware:', error.message);
  console.error('[ADMIN ROUTES] Error stack:', error.stack);
}

// Test endpoint (no auth) to verify routing works
router.get('/manage-test', (req, res) => {
  console.log('[ADMIN TEST] ✅ Route hit successfully');
  console.log('[ADMIN TEST] Request path:', req.path);
  console.log('[ADMIN TEST] Request method:', req.method);
  res.json({ message: 'Admin routes are working!', timestamp: new Date().toISOString() });
});

console.log('[ADMIN ROUTES] Test route registered');

// All admin routes require authentication and admin role
if (authenticate && requireAdmin) {
  router.use(authenticate, requireAdmin);
  console.log('[ADMIN ROUTES] ✅ Auth middleware applied to all routes');
} else {
  console.error('[ADMIN ROUTES] ❌ Cannot apply auth middleware - functions not loaded!');
}

console.log('[ADMIN ROUTES] Module setup complete, registering routes...');

// =============================================
// GET /api/manage-overview
// Get admin dashboard overview stats
// =============================================
router.get('/manage-overview', async (req, res) => {
  try {
    const [
      userStats,
      sessionStats,
      coachStats
    ] = await Promise.all([
      // User statistics
      prisma.user.aggregate({
        _count: { id: true }
      }),
      // Session statistics
      prisma.session.aggregate({
        _count: { id: true },
        _avg: { duration: true }
      }),
      // Active coaches count
      prisma.coach.count({ where: { active: true } })
    ]);

    // Get user counts by plan and status
    const usersByPlan = await prisma.user.groupBy({
      by: ['plan'],
      _count: { id: true }
    });

    const usersByStatus = await prisma.user.groupBy({
      by: ['status'],
      _count: { id: true }
    });

    // Recent signups
    const recentSignups = await prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // last 7 days
        }
      }
    });

    // Active users (logged in within last 7 days)
    const activeUsers = await prisma.user.count({
      where: {
        lastLogin: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    });

    res.json({
      totalUsers: userStats._count.id,
      totalSessions: sessionStats._count.id,
      avgSessionDuration: Math.round(sessionStats._avg.duration || 0),
      activeCoaches: coachStats,
      usersByPlan: usersByPlan.reduce((acc, item) => {
        acc[item.plan] = item._count.id;
        return acc;
      }, {}),
      usersByStatus: usersByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {}),
      recentSignups,
      activeUsers,
      // Placeholder metrics (would be calculated from real data)
      avgBusinessHealth: 68.5,
      healthTrend: 4.2,
      sessionsPerUser: sessionStats._count.id / (userStats._count.id || 1),
      redFlagUsers: 0,
      inactiveUsers30d: 0
    });
  } catch (error) {
    console.error('Get admin overview error:', error);
    res.status(500).json({ error: 'Failed to get overview' });
  }
});

// =============================================
// GET /api/manage-users
// Get all users with detailed info
// =============================================
router.get('/manage-users', async (req, res) => {
  console.log('[ADMIN USERS] Route hit - GET /api/manage-users');
  console.log('[ADMIN USERS] User:', req.user ? { id: req.user.id, email: req.user.email, role: req.user.role } : 'No user');
  console.log('[ADMIN USERS] Query params:', req.query);
  
  try {
    const { plan, status, search, sortBy, sortOrder } = req.query;

    // Build WHERE clause using raw SQL with proper escaping
    let whereConditions = [];
    const queryParams = [];

    if (plan) {
      whereConditions.push(`u.plan = $${queryParams.length + 1}`);
      queryParams.push(plan.toUpperCase());
    }

    if (status) {
      whereConditions.push(`u.status = $${queryParams.length + 1}`);
      queryParams.push(status.toUpperCase());
    }

    if (search) {
      const searchParam = `%${search.toLowerCase()}%`;
      whereConditions.push(`(
        LOWER(u.name) LIKE $${queryParams.length + 1} OR 
        LOWER(u.email) LIKE $${queryParams.length + 1} OR 
        LOWER(COALESCE(u.business_name, '')) LIKE $${queryParams.length + 1}
      )`);
      queryParams.push(searchParam);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Build ORDER BY clause
    let orderByClause = 'ORDER BY u.created_at DESC';
    if (sortBy) {
      const validSortFields = {
        'name': 'u.name',
        'email': 'u.email',
        'plan': 'u.plan',
        'status': 'u.status',
        'createdAt': 'u.created_at',
        'lastLogin': 'u.last_login'
      };
      const sortField = validSortFields[sortBy] || 'u.created_at';
      const sortDirection = (sortOrder || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      orderByClause = `ORDER BY ${sortField} ${sortDirection}`;
    }

    // Build the query
    const query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.plan,
        u.status,
        u.business_name as "businessName",
        u.industry,
        u.last_login as "lastLogin",
        u.last_session as "lastSession",
        u.created_at as "createdAt",
        c.id as "primaryCoachId",
        c.name as "primaryCoachName"
      FROM users u
      LEFT JOIN coaches c ON u.primary_coach_id = c.id
      ${whereClause}
      ${orderByClause}
    `;

    // Use db.js connection for more reliable queries
    let result;
    try {
      result = await db.query(query, queryParams);
    } catch (dbError) {
      console.error('Database query error:', dbError);
      console.error('Database error details:', {
        message: dbError.message,
        code: dbError.code,
        stack: dbError.stack
      });
      
      // Check for specific database errors
      if (dbError.code === '42P01' || dbError.message?.includes('does not exist')) {
        return res.status(500).json({ 
          error: 'Database table not found',
          message: 'The users table does not exist. Please check your database schema.',
          details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        });
      }
      
      if (dbError.code === 'ECONNREFUSED' || dbError.code === 'ENOTFOUND' || dbError.message?.includes('connection')) {
        return res.status(500).json({ 
          error: 'Database connection failed',
          message: 'Unable to connect to the database. Please check your database configuration.',
          details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        });
      }
      
      // Re-throw to be caught by outer catch block
      throw dbError;
    }
    
    const users = result.rows || [];

    // Format the response to match expected structure
    const formattedUsers = users.map(user => ({
      id: user.id,
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'USER',
      plan: user.plan || 'FOUNDATION',
      status: user.status || 'ACTIVE',
      businessName: user.businessName || '',
      industry: user.industry || '',
      lastLogin: user.lastLogin,
      lastSession: user.lastSession,
      createdAt: user.createdAt,
      primaryCoach: user.primaryCoachId ? {
        id: user.primaryCoachId,
        name: user.primaryCoachName
      } : null
    }));

    res.json(formattedUsers);
  } catch (error) {
    console.error('Get admin users error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      query: req.query
    });
    
    // Ensure we always return JSON, never HTML
    if (!res.headersSent) {
      res.status(500).json({ 
        error: error.message || 'Failed to get users',
        message: 'An error occurred while fetching users. Please check the server logs for details.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
});

// =============================================
// GET /api/manage-coaches
// Get all coaches with stats
// =============================================
router.get('/manage-coaches', async (req, res) => {
  console.log('[ADMIN COACHES] Route hit - GET /api/manage-coaches');
  console.log('[ADMIN COACHES] User:', req.user ? { id: req.user.id, email: req.user.email, role: req.user.role } : 'No user');
  
  try {
    const coaches = await prisma.coach.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        specialty: true,
        tagline: true,
        avatar: true,
        active: true,
        model: true,
        temperature: true,
        maxTokens: true,
        createdAt: true,
        _count: {
          select: {
            primaryUsers: true,
            sessions: true
          }
        }
      },
      orderBy: { id: 'asc' }
    });

    console.log('[ADMIN COACHES] Found coaches:', coaches.length);
    res.json(coaches);
  } catch (error) {
    console.error('[ADMIN COACHES] Get admin coaches error:', error);
    console.error('[ADMIN COACHES] Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      meta: error.meta
    });
    
    // Ensure we always return JSON, never HTML
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ 
        error: error.message || 'Failed to get coaches',
        message: 'An error occurred while fetching coaches. Please check the server logs for details.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
});

// =============================================
// GET /api/manage-sessions
// Get all sessions with filters
// =============================================
router.get('/manage-sessions', async (req, res) => {
  try {
    const { coachId, userId, status, from, to } = req.query;

    const where = {};
    if (coachId) where.coachId = parseInt(coachId);
    if (userId) where.userId = parseInt(userId);
    if (status) where.status = status;
    if (from || to) {
      where.startTime = {};
      if (from) where.startTime.gte = new Date(from);
      if (to) where.startTime.lte = new Date(to);
    }

    const sessions = await prisma.session.findMany({
      where,
      select: {
        id: true,
        startTime: true,
        endTime: true,
        duration: true,
        status: true,
        summary: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        coach: {
          select: {
            id: true,
            name: true,
            role: true
          }
        },
        _count: {
          select: {
            actionSteps: true
          }
        }
      },
      orderBy: { startTime: 'desc' },
      take: 100
    });

    res.json(sessions);
  } catch (error) {
    console.error('Get admin sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// =============================================
// GET /api/manage-settings
// Get all admin settings (from database, with env fallback)
// =============================================
router.get('/manage-settings', async (req, res) => {
  try {
    const settings = await prisma.adminSettings.findMany();
    
    // Create a map of database settings
    const dbSettingsMap = {};
    settings.forEach(s => {
      if (s.key && s.value) {
        dbSettingsMap[s.key] = s.value;
      }
    });
    
    // Return database settings, but also include current env values for reference
    // This allows frontend to show actual current values even if not saved in DB
    const allSettings = settings.map(s => ({
      key: s.key,
      value: s.value
    }));
    
    // Add current environment variable values if not in database
    // This helps show what's currently being used
    const envDefaults = {
      smtpHost: process.env.SMTP_HOST,
      smtpPort: process.env.SMTP_PORT,
      smtpUsername: process.env.SMTP_USERNAME || process.env.SMTP_USER,
      smtpPassword: process.env.SMTP_PASSWORD,
      smtpFromEmail: process.env.SMTP_FROM_EMAIL,
      smtpFromName: process.env.SMTP_FROM_NAME,
      clientEmail: process.env.CLIENT_EMAIL
    };
    
    // Add env values as defaults if not in database
    Object.entries(envDefaults).forEach(([key, value]) => {
      if (value && !dbSettingsMap[key]) {
        allSettings.push({ key, value });
      }
    });
    
    res.json(allSettings);
  } catch (error) {
    console.error('Get admin settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// =============================================
// POST /api/manage-settings
// Update admin settings (feature toggles)
// =============================================
router.post('/manage-settings', async (req, res) => {
  try {
    const { settings } = req.body;

    if (!Array.isArray(settings)) {
      return res.status(400).json({ error: 'Settings must be an array' });
    }

    // Upsert each setting
    const updates = settings.map(({ key, value }) =>
      prisma.adminSettings.upsert({
        where: { key },
        update: { value },
        create: { key, value: value || null }
      })
    );

    await Promise.all(updates);

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update admin settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// =============================================
// POST /api/manage-emails-test
// Send a test email to verify SMTP configuration
// =============================================
router.post('/manage-emails-test', async (req, res) => {
  try {
    const { to, subject, message } = req.body;

    if (!to) {
      return res.status(400).json({ error: 'Recipient email is required' });
    }

    // Get SMTP settings from database
    const settings = await prisma.adminSettings.findMany();
    const settingsMap = {};
    settings.forEach(s => {
      if (s.key && s.value) {
        settingsMap[s.key] = s.value;
      }
    });

    const smtpHost = settingsMap.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(settingsMap.smtpPort || process.env.SMTP_PORT || '465', 10);
    const smtpUsername = settingsMap.smtpUsername || process.env.SMTP_USERNAME || process.env.SMTP_USER;
    const smtpPassword = settingsMap.smtpPassword || process.env.SMTP_PASSWORD;
    const smtpFromEmail = settingsMap.smtpFromEmail || process.env.SMTP_FROM_EMAIL || smtpUsername;
    const smtpFromName = settingsMap.smtpFromName || process.env.SMTP_FROM_NAME || '10XCoach.ai';

    if (!smtpUsername || !smtpPassword) {
      return res.status(400).json({ error: 'SMTP configuration is incomplete. Please configure SMTP username and password.' });
    }

    const nodemailer = require('nodemailer');
    
    // Determine secure mode based on port
    // Ports 465, 443 = SSL (secure: true)
    // Ports 587, 2525, 80 = TLS or plain (secure: false, requireTLS: true for 587)
    const isSecurePort = smtpPort === 465 || smtpPort === 443;
    const isTLSPort = smtpPort === 587 || smtpPort === 2525;
    
    const transporterConfig = {
      host: smtpHost,
      port: smtpPort,
      secure: isSecurePort, // true for 465/443 (SSL), false for others
      auth: {
        user: smtpUsername,
        pass: smtpPassword
      },
      // Connection timeout settings
      connectionTimeout: 30000, // 30 seconds to establish connection
      greetingTimeout: 30000,  // 30 seconds for server greeting
      socketTimeout: 30000,     // 30 seconds for socket operations
      // Pool connections for better reliability
      pool: false,
      // Debug mode (set to true for verbose logging)
      debug: false,
      logger: false
    };
    
    // For TLS ports (587, 2525), configure TLS properly
    if (isTLSPort) {
      transporterConfig.requireTLS = true;
      transporterConfig.tls = {
        rejectUnauthorized: false, // Allow self-signed certificates
        minVersion: 'TLSv1.2',
        ciphers: 'SSLv3'
      };
    }
    
    // For SSL ports (465, 443), configure SSL/TLS properly
    if (isSecurePort) {
      transporterConfig.tls = {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2',
        ciphers: 'SSLv3'
      };
      transporterConfig.secure = true;
    }
    
    // For port 80 (HTTP), try plain connection (unlikely to work but worth trying)
    if (smtpPort === 80) {
      transporterConfig.secure = false;
      transporterConfig.requireTLS = false;
    }
    
    console.log('[TEST EMAIL] SMTP Config:', {
      host: smtpHost,
      port: smtpPort,
      secure: transporterConfig.secure,
      requireTLS: transporterConfig.requireTLS,
      username: smtpUsername,
      fromEmail: smtpFromEmail,
      connectionTimeout: transporterConfig.connectionTimeout
    });
    
    const transporter = nodemailer.createTransport(transporterConfig);

    // Verify connection with extended timeout (30 seconds for network issues)
    console.log('[TEST EMAIL] Verifying SMTP connection to', smtpHost + ':' + smtpPort);
    console.log('[TEST EMAIL] This may take up to 30 seconds if there are network issues...');
    
    try {
      // Use a longer timeout for verification (30 seconds) since network can be slow
      await Promise.race([
        transporter.verify(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('SMTP verification timeout after 30 seconds. The server cannot reach the SMTP server. Check firewall and network settings.')), 30000)
        )
      ]);
      console.log('[TEST EMAIL] ✅ SMTP connection verified');
    } catch (verifyError) {
      console.error('[TEST EMAIL] ❌ SMTP verification failed:', verifyError.message);
      console.error('[TEST EMAIL] Error code:', verifyError.code);
      console.error('[TEST EMAIL] Error command:', verifyError.command);
      console.error('[TEST EMAIL] Full error:', JSON.stringify(verifyError, Object.getOwnPropertyNames(verifyError)));
      
      // Provide more helpful error messages
      let errorMessage = 'Could not connect to SMTP server.';
      let helpfulHint = '';
      
      if (verifyError.code === 'EAUTH') {
        errorMessage = 'SMTP authentication failed.';
        helpfulHint = 'Please check your username and password. If you have 2FA enabled, use an app-specific password.';
      } else if (verifyError.code === 'ETIMEDOUT' && verifyError.command === 'CONN') {
        errorMessage = '❌ NETWORK BLOCKED: Cannot reach SMTP server';
        helpfulHint = 'Your VPS server CANNOT connect to ' + smtpHost + ':' + smtpPort + '. This is a FIREWALL/NETWORK restriction by your hosting provider. Your server is blocked from reaching Zoho SMTP. Solutions: 1) Contact your hosting provider to unblock ports 465/587, 2) Use a different SMTP service (Gmail, SendGrid, Mailgun, AWS SES) that might not be blocked, 3) Test connectivity: Run "timeout 5 bash -c \"</dev/tcp/' + smtpHost + '/' + smtpPort + '\"" on your VPS - if it fails, the port is blocked.';
      } else if (verifyError.code === 'ECONNECTION' || verifyError.code === 'ETIMEDOUT') {
        errorMessage = 'Could not connect to SMTP server.';
        helpfulHint = 'Please check your SMTP host and port. For Zoho, try port 465 (SSL) instead of 587, or ensure your server allows outbound connections on port 587.';
      } else if (verifyError.code === 'ESOCKET' || verifyError.message?.includes('socket')) {
        errorMessage = 'Network connection error.';
        helpfulHint = 'Check your server\'s firewall and network settings. Ensure outbound connections to SMTP ports are allowed.';
      } else if (verifyError.message?.includes('timeout')) {
        errorMessage = 'Connection timeout - Network blocked.';
        helpfulHint = 'Your server cannot reach the SMTP server. This is likely a firewall restriction. Contact your hosting provider or use a different SMTP service.';
      } else {
        errorMessage = verifyError.message || 'SMTP connection failed.';
        helpfulHint = 'Please verify your SMTP settings match your email provider\'s requirements.';
      }
      
      return res.status(500).json({ 
        error: 'SMTP connection failed',
        message: errorMessage,
        hint: helpfulHint,
        details: process.env.NODE_ENV === 'development' ? {
          code: verifyError.code,
          command: verifyError.command,
          message: verifyError.message,
          stack: verifyError.stack
        } : undefined
      });
    }

    // Send test email
    const mailOptions = {
      from: `"${smtpFromName}" <${smtpFromEmail}>`,
      to: to,
      subject: subject || 'Test Email from 10XCoach.ai',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">Test Email</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
            <p>${message || 'This is a test email to verify your SMTP configuration is working correctly.'}</p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              If you received this email, your SMTP configuration is working properly!
            </p>
          </div>
          <div style="background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
            <p>This email was sent from 10XCoach.ai Admin Panel</p>
          </div>
        </div>
      `,
      text: message || 'This is a test email to verify your SMTP configuration is working correctly.'
    };

    console.log('[TEST EMAIL] Sending email...');
    const info = await Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email sending timeout after 30 seconds')), 30000)
      )
    ]);
    console.log('[TEST EMAIL] ✅ Email sent successfully:', info.messageId);

    res.json({ 
      message: 'Test email sent successfully',
      messageId: info.messageId
    });
  } catch (error) {
    console.error('[TEST EMAIL] ❌ Error:', error.message);
    console.error('[TEST EMAIL] Error stack:', error.stack);
    
    // Provide more specific error messages
    let errorMessage = error.message || 'Failed to send test email. Please check your SMTP configuration.';
    let statusCode = 500;
    
    if (error.message && error.message.includes('timeout')) {
      errorMessage = 'Email operation timed out. Please check your SMTP server settings and network connection.';
    } else if (error.code === 'EAUTH') {
      errorMessage = 'SMTP authentication failed. Please check your username and password.';
      statusCode = 401;
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      errorMessage = 'Could not connect to SMTP server. Please check your SMTP host and port settings.';
      statusCode = 503;
    } else if (error.code === 'EENVELOPE') {
      errorMessage = 'Invalid email address. Please check the recipient email.';
      statusCode = 400;
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// =============================================
// GET /api/manage-analytics
// Get comprehensive analytics data
// =============================================
router.get('/manage-analytics', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let dateFilter;
    let days;
    switch (period) {
      case '7d':
        days = 7;
        dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        days = 30;
        dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        days = 90;
        dateFilter = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        days = 365;
        dateFilter = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        days = 30;
        dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    // Calculate previous period for trends
    const previousDateFilter = new Date(dateFilter.getTime() - (days * 24 * 60 * 60 * 1000));

    // User Metrics
    const [
      totalUsers,
      activeUsers,
      newUsers,
      previousPeriodUsers,
      usersWithSessions
    ] = await Promise.all([
      prisma.user.count({
        where: { role: 'USER' }
      }),
      prisma.user.count({
        where: {
          role: 'USER',
          lastLogin: { gte: dateFilter }
        }
      }),
      prisma.user.count({
        where: {
          role: 'USER',
          createdAt: { gte: dateFilter }
        }
      }),
      prisma.user.count({
        where: {
          role: 'USER',
          createdAt: { gte: previousDateFilter, lt: dateFilter }
        }
      }),
      prisma.user.count({
        where: {
          role: 'USER',
          sessions: { some: { startTime: { gte: dateFilter } } }
        }
      })
    ]);

    // Session Metrics
    const [
      totalSessions,
      sessionsWithDuration,
      previousPeriodSessions
    ] = await Promise.all([
      prisma.session.count({
        where: { startTime: { gte: dateFilter } }
      }),
      prisma.session.findMany({
        where: {
          startTime: { gte: dateFilter },
          duration: { not: null }
        },
        select: { duration: true }
      }),
      prisma.session.count({
        where: {
          startTime: { gte: previousDateFilter, lt: dateFilter }
        }
      })
    ]);

    // Calculate average session duration
    const avgSessionDuration = sessionsWithDuration.length > 0
      ? sessionsWithDuration.reduce((sum, s) => sum + parseFloat(s.duration || 0), 0) / sessionsWithDuration.length
      : 0;

    // Content Metrics
    const [
      totalQuizzes,
      totalHuddles,
      totalNotes,
      totalTodos,
      completedTodos,
      totalActionSteps,
      completedActionSteps
    ] = await Promise.all([
      prisma.quizResult.count({
        where: { createdAt: { gte: dateFilter } }
      }),
      prisma.huddle.count({
        where: { createdAt: { gte: dateFilter } }
      }),
      prisma.note.count({
        where: { createdAt: { gte: dateFilter } }
      }),
      prisma.todo.count({
        where: { createdAt: { gte: dateFilter } }
      }),
      prisma.todo.count({
        where: {
          createdAt: { gte: dateFilter },
          status: 'COMPLETED'
        }
      }),
      prisma.actionStep.count({
        where: { createdAt: { gte: dateFilter } }
      }),
      prisma.actionStep.count({
        where: {
          createdAt: { gte: dateFilter },
          status: 'COMPLETED'
        }
      })
    ]);

    // Plan Distribution
    const planDistribution = await prisma.user.groupBy({
      by: ['plan'],
      where: { role: 'USER' },
      _count: { id: true }
    });

    // Sessions by Coach
    const sessionsByCoach = await prisma.session.groupBy({
      by: ['coachId'],
      where: { startTime: { gte: dateFilter } },
      _count: { id: true }
    });

    // Get coach names
    const coachIds = sessionsByCoach.map(s => s.coachId).filter(Boolean);
    const coaches = await prisma.coach.findMany({
      where: { id: { in: coachIds } },
      select: { id: true, name: true }
    });

    const coachMap = coaches.reduce((acc, c) => {
      acc[c.id] = c.name;
      return acc;
    }, {});

    // Pillar Scores (from Quiz Results)
    const quizResults = await prisma.quizResult.findMany({
      where: { createdAt: { gte: dateFilter } },
      select: { scoresJson: true }
    });

    const pillarScores = {};
    const pillarCounts = {};
    quizResults.forEach(result => {
      if (result.scoresJson && typeof result.scoresJson === 'object') {
        Object.keys(result.scoresJson).forEach(pillar => {
          const score = result.scoresJson[pillar];
          if (typeof score === 'number') {
            pillarScores[pillar] = (pillarScores[pillar] || 0) + score;
            pillarCounts[pillar] = (pillarCounts[pillar] || 0) + 1;
          }
        });
      }
    });

    const avgPillarScores = Object.keys(pillarScores).map(pillar => ({
      name: pillar,
      score: pillarCounts[pillar] > 0 ? Math.round((pillarScores[pillar] / pillarCounts[pillar]) * 10) / 10 : 0,
      trend: 0 // Can calculate later if needed
    }));

    const avgBusinessHealth = avgPillarScores.length > 0
      ? Math.round((avgPillarScores.reduce((sum, p) => sum + p.score, 0) / avgPillarScores.length) * 10) / 10
      : 0;

    // Top Coaches (by session count)
    const topCoaches = sessionsByCoach
      .map(s => ({
        name: coachMap[s.coachId] || 'Unknown',
        sessions: s._count.id
      }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 5);

    // Generate date range for trends
    const generateDateRange = (days) => {
      const dates = [];
      const now = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
      }
      return dates;
    };

    const dateRange = generateDateRange(days);

    // User Growth Trend
    const userGrowth = await Promise.all(
      dateRange.map(async (date) => {
        const count = await prisma.user.count({
          where: {
            role: 'USER',
            createdAt: { lte: new Date(date + 'T23:59:59') }
          }
        });
        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          users: count
        };
      })
    );

    // Engagement Trend (Sessions and Quizzes per day)
    const engagementTrend = await Promise.all(
      dateRange.map(async (date) => {
        const [sessions, quizzes] = await Promise.all([
          prisma.session.count({
            where: {
              startTime: {
                gte: new Date(date + 'T00:00:00'),
                lt: new Date(date + 'T23:59:59')
              }
            }
          }),
          prisma.quizResult.count({
            where: {
              createdAt: {
                gte: new Date(date + 'T00:00:00'),
                lt: new Date(date + 'T23:59:59')
              }
            }
          })
        ]);
        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          sessions,
          quizzes
        };
      })
    );

    // Calculate trends
    const userGrowthTrend = previousPeriodUsers > 0
      ? ((newUsers - previousPeriodUsers) / previousPeriodUsers * 100).toFixed(1)
      : 0;
    const sessionGrowthTrend = previousPeriodSessions > 0
      ? ((totalSessions - previousPeriodSessions) / previousPeriodSessions * 100).toFixed(1)
      : 0;

    res.json({
      period,
      // User Metrics
      totalUsers,
      activeUsers,
      newUsers,
      userGrowthTrend: parseFloat(userGrowthTrend),
      // Session Metrics
      totalSessions,
      avgSessionDuration: Math.round(avgSessionDuration),
      sessionGrowthTrend: parseFloat(sessionGrowthTrend),
      // Content Metrics
      totalQuizzes,
      totalHuddles,
      totalNotes,
      totalTodos,
      completedTodos,
      totalActionSteps,
      completedActionSteps,
      // Business Health
      avgBusinessHealth,
      pillarScores: avgPillarScores,
      // Plan Distribution
      planDistribution: planDistribution.map(p => ({
        plan: p.plan || 'FOUNDATION',
        count: p._count.id,
        revenue: 0 // Not tracking revenue in this version
      })),
      // Top Coaches
      topCoaches,
      // Trends
      userGrowth,
      engagementTrend
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics', details: error.message });
  }
});

// =============================================
// PUT /api/admin/users/:id/role
// Update user role (Super Admin only)
// =============================================
router.put('/manage-users/:id/role', requireSuperAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Validate role
    const validRoles = ['USER', 'COACH_ADMIN', 'SUPER_ADMIN', 'ADMIN'];
    if (!role || !validRoles.includes(role.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid role. Must be USER, COACH_ADMIN, or SUPER_ADMIN' });
    }

    const normalizedRole = role.toUpperCase();

    // Check if user exists using raw SQL
    const userCheck = await prisma.$queryRaw`
      SELECT id, email, role
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `;

    if (!Array.isArray(userCheck) || userCheck.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userCheck[0];

    // Prevent changing Daniel Rosario's role
    const userEmail = (user.email || '').toLowerCase();
    if (userEmail === 'danrosario0604@gmail.com') {
      return res.status(403).json({ error: 'Cannot change role for this user' });
    }

    // Update user role using raw SQL
    // First, try to add enum values if they don't exist (for COACH_ADMIN and SUPER_ADMIN)
    if (normalizedRole === 'COACH_ADMIN' || normalizedRole === 'SUPER_ADMIN') {
      // Try to add the enum value if it doesn't exist
      // Note: ALTER TYPE ADD VALUE cannot be run in a transaction, so we do it separately
      try {
        // Check if the enum value already exists by trying to use it
        const testQuery = await prisma.$queryRawUnsafe(`
          SELECT 1 WHERE '${normalizedRole}'::text = ANY(
            SELECT unnest(enum_range(NULL::"UserRole"))::text
          )
        `);
        
        // If test query returns empty, the value doesn't exist, so add it
        if (!testQuery || testQuery.length === 0) {
          console.log(`Adding enum value: ${normalizedRole}`);
          await prisma.$executeRawUnsafe(`ALTER TYPE "UserRole" ADD VALUE '${normalizedRole}'`);
          console.log(`Successfully added enum value: ${normalizedRole}`);
        }
      } catch (alterError) {
        // Error code 42710 means the value already exists, which is fine
        // Other errors might mean we need superuser privileges
        if (alterError.code === '42710' || alterError.message.includes('already exists')) {
          console.log(`Enum value ${normalizedRole} already exists`);
        } else {
          console.error('Could not alter enum:', alterError.message);
          // Continue anyway - might work if value was added by another process
        }
      }
    }
    
    // Now try to update the user role
    try {
      const updatedUser = await prisma.$queryRaw`
        UPDATE users 
        SET role = ${normalizedRole}::text::"UserRole", updated_at = NOW()
        WHERE id = ${userId}
        RETURNING 
          id, 
          name, 
          email, 
          role, 
          plan, 
          status, 
          business_name as "businessName", 
          industry
      `;
      
      if (!Array.isArray(updatedUser) || updatedUser.length === 0) {
        return res.status(500).json({ error: 'Failed to update user role' });
      }
      
      return res.json(updatedUser[0]);
    } catch (enumError) {
      // If enum doesn't support the value, provide helpful error message
      if (enumError.code === '22P02' || enumError.message.includes('invalid input value for enum')) {
        return res.status(400).json({ 
          error: `The role "${normalizedRole}" is not available in the database. The system attempted to add it automatically but may require database superuser privileges. Please run this SQL manually: ALTER TYPE "UserRole" ADD VALUE '${normalizedRole}';` 
        });
      }
      throw enumError;
    }
  } catch (error) {
    console.error('Update user role error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      userId: req.params.id,
      role: req.body.role
    });
    res.status(500).json({ error: error.message || 'Failed to update user role' });
  }
});

// =============================================
// DELETE /api/admin/users/:id
// Delete a user (Super Admin only)
// =============================================
router.delete('/manage-users/:id', requireSuperAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting Daniel Rosario
    const userEmail = (user.email || '').toLowerCase();
    if (userEmail === 'danrosario0604@gmail.com') {
      return res.status(403).json({ error: 'Cannot delete this user' });
    }

    // Delete user (cascade will handle related records if configured)
    await prisma.user.delete({
      where: { id: userId }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// =============================================
// HUDDLES MANAGEMENT ROUTES (ADMIN)
// =============================================

// GET /api/manage-huddles
// Get all huddles for admin management (with filtering)
router.get('/manage-huddles', async (req, res) => {
  try {
    const { 
      search, 
      userId, 
      coachId, 
      status, 
      compliance, 
      startDate, 
      endDate 
    } = req.query;

    const where = {};

    // Filter by user if specified
    if (userId) {
      where.userId = parseInt(userId);
    }

    // Filter by coach if specified
    if (coachId) {
      where.coachId = parseInt(coachId);
    }

    // Filter by status if specified
    if (status) {
      where.status = status.toUpperCase();
    }

    // Filter by date range if specified
    if (startDate || endDate) {
      where.huddleDate = {};
      if (startDate) {
        where.huddleDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.huddleDate.lte = new Date(endDate + 'T23:59:59');
      }
    }

    // Search filter (title, user name, coach name)
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { coach: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const huddles = await prisma.huddle.findMany({
      where,
      include: {
        coach: {
          select: {
            id: true,
            name: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        huddleDate: 'desc'
      }
    });

    // Transform to match frontend expectations
    let transformedHuddles = huddles.map(h => ({
      id: h.id,
      title: h.title,
      huddle_date: h.huddleDate,
      date: h.huddleDate,
      coach_id: h.coachId,
      coachId: h.coachId,
      user_id: h.userId,
      userId: h.userId,
      has_short_agenda: h.hasShortAgenda,
      hasShortAgenda: h.hasShortAgenda,
      has_notetaker: h.hasNotetaker,
      hasNotetaker: h.hasNotetaker,
      has_action_steps: h.hasActionSteps,
      hasActionSteps: h.hasActionSteps,
      compliance_line_item_1: h.complianceLineItem1,
      complianceLineItem1: h.complianceLineItem1,
      compliance_line_item_2: h.complianceLineItem2,
      complianceLineItem2: h.complianceLineItem2,
      compliance_line_item_3: h.complianceLineItem3,
      complianceLineItem3: h.complianceLineItem3,
      compliance_line_item_4: h.complianceLineItem4,
      complianceLineItem4: h.complianceLineItem4,
      status: h.status,
      coach_name: h.coach?.name,
      user_name: h.user?.name,
      user_email: h.user?.email
    }));

    // Client-side compliance filter (if needed)
    if (compliance === 'compliant') {
      transformedHuddles = transformedHuddles.filter(h => 
        h.has_short_agenda && h.has_notetaker && h.has_action_steps
      );
    } else if (compliance === 'non-compliant') {
      transformedHuddles = transformedHuddles.filter(h => 
        !(h.has_short_agenda && h.has_notetaker && h.has_action_steps)
      );
    }

    res.json(transformedHuddles);
  } catch (error) {
    console.error('Error fetching admin huddles:', error);
    res.status(500).json({ error: 'Failed to fetch huddles', details: error.message });
  }
});

// GET /api/manage-huddles/stats
// Get huddle statistics for admin (all huddles)
router.get('/manage-huddles/stats', async (req, res) => {
  try {
    const total = await prisma.huddle.count();

    const compliant = await prisma.huddle.count({
      where: {
        hasShortAgenda: true,
        hasNotetaker: true,
        hasActionSteps: true
      }
    });

    const nonCompliant = total - compliant;

    res.json({
      total,
      compliant,
      non_compliant: nonCompliant,
      nonCompliant
    });
  } catch (error) {
    console.error('Error fetching huddle stats:', error);
    res.status(500).json({ error: 'Failed to fetch huddle stats', details: error.message });
  }
});

// POST /api/manage-huddles
// Create a new huddle (admin can create for any user)
router.post('/manage-huddles', async (req, res) => {
  try {
    const { 
      title, 
      coach_id, 
      user_id, 
      has_short_agenda, 
      has_notetaker, 
      has_action_steps, 
      compliance_line_item_1, 
      compliance_line_item_2, 
      compliance_line_item_3, 
      compliance_line_item_4, 
      status, 
      huddle_date 
    } = req.body;
    
    // Convert status to uppercase enum value for Prisma
    let statusValue = (status || 'scheduled').toUpperCase();
    if (!['SCHEDULED', 'COMPLETED', 'CANCELLED'].includes(statusValue)) {
      statusValue = 'SCHEDULED';
    }
    
    // Handle huddle_date - Prisma expects DateTime
    let huddleDate;
    if (huddle_date) {
      if (huddle_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        huddleDate = new Date(huddle_date + 'T00:00:00');
      } else {
        huddleDate = new Date(huddle_date);
      }
    } else {
      huddleDate = new Date();
    }
    
    const huddle = await prisma.huddle.create({
      data: {
        title,
        huddleDate,
        coachId: parseInt(coach_id),
        userId: parseInt(user_id),
        hasShortAgenda: has_short_agenda || false,
        hasNotetaker: has_notetaker || false,
        hasActionSteps: has_action_steps || false,
        complianceLineItem1: compliance_line_item_1 || null,
        complianceLineItem2: compliance_line_item_2 || null,
        complianceLineItem3: compliance_line_item_3 || null,
        complianceLineItem4: compliance_line_item_4 || null,
        status: statusValue
      },
      include: {
        coach: {
          select: {
            id: true,
            name: true
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

    // Transform response
    res.status(201).json({
      id: huddle.id,
      title: huddle.title,
      huddle_date: huddle.huddleDate,
      date: huddle.huddleDate,
      coach_id: huddle.coachId,
      coachId: huddle.coachId,
      user_id: huddle.userId,
      userId: huddle.userId,
      has_short_agenda: huddle.hasShortAgenda,
      hasShortAgenda: huddle.hasShortAgenda,
      has_notetaker: huddle.hasNotetaker,
      hasNotetaker: huddle.hasNotetaker,
      has_action_steps: huddle.hasActionSteps,
      hasActionSteps: huddle.hasActionSteps,
      compliance_line_item_1: huddle.complianceLineItem1,
      complianceLineItem1: huddle.complianceLineItem1,
      compliance_line_item_2: huddle.complianceLineItem2,
      complianceLineItem2: huddle.complianceLineItem2,
      compliance_line_item_3: huddle.complianceLineItem3,
      complianceLineItem3: huddle.complianceLineItem3,
      compliance_line_item_4: huddle.complianceLineItem4,
      complianceLineItem4: huddle.complianceLineItem4,
      status: huddle.status,
      coach_name: huddle.coach?.name,
      user_name: huddle.user?.name,
      user_email: huddle.user?.email
    });
  } catch (error) {
    console.error('Error creating huddle:', error);
    res.status(500).json({ error: 'Failed to create huddle', details: error.message });
  }
});

// PUT /api/manage-huddles/:id
// Update a huddle (admin can update any huddle)
router.put('/manage-huddles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      coach_id, 
      user_id, 
      has_short_agenda, 
      has_notetaker, 
      has_action_steps, 
      compliance_line_item_1, 
      compliance_line_item_2, 
      compliance_line_item_3, 
      compliance_line_item_4, 
      status, 
      huddle_date 
    } = req.body;
    
    // Convert status to uppercase enum value for Prisma
    let statusValue = (status || 'scheduled').toUpperCase();
    if (!['SCHEDULED', 'COMPLETED', 'CANCELLED'].includes(statusValue)) {
      statusValue = 'SCHEDULED';
    }
    
    // Handle huddle_date - Prisma expects DateTime
    let huddleDate;
    if (huddle_date) {
      if (huddle_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        huddleDate = new Date(huddle_date + 'T00:00:00');
      } else {
        huddleDate = new Date(huddle_date);
      }
    }
    
    const updateData = {
      title,
      status: statusValue,
      coachId: parseInt(coach_id),
      userId: parseInt(user_id),
      hasShortAgenda: has_short_agenda || false,
      hasNotetaker: has_notetaker || false,
      hasActionSteps: has_action_steps || false,
      complianceLineItem1: compliance_line_item_1 || null,
      complianceLineItem2: compliance_line_item_2 || null,
      complianceLineItem3: compliance_line_item_3 || null,
      complianceLineItem4: compliance_line_item_4 || null
    };

    if (huddleDate) {
      updateData.huddleDate = huddleDate;
    }
    
    const huddle = await prisma.huddle.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        coach: {
          select: {
            id: true,
            name: true
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

    // Transform response
    res.json({
      id: huddle.id,
      title: huddle.title,
      huddle_date: huddle.huddleDate,
      date: huddle.huddleDate,
      coach_id: huddle.coachId,
      coachId: huddle.coachId,
      user_id: huddle.userId,
      userId: huddle.userId,
      has_short_agenda: huddle.hasShortAgenda,
      hasShortAgenda: huddle.hasShortAgenda,
      has_notetaker: huddle.hasNotetaker,
      hasNotetaker: huddle.hasNotetaker,
      has_action_steps: huddle.hasActionSteps,
      hasActionSteps: huddle.hasActionSteps,
      compliance_line_item_1: huddle.complianceLineItem1,
      complianceLineItem1: huddle.complianceLineItem1,
      compliance_line_item_2: huddle.complianceLineItem2,
      complianceLineItem2: huddle.complianceLineItem2,
      compliance_line_item_3: huddle.complianceLineItem3,
      complianceLineItem3: huddle.complianceLineItem3,
      compliance_line_item_4: huddle.complianceLineItem4,
      complianceLineItem4: huddle.complianceLineItem4,
      status: huddle.status,
      coach_name: huddle.coach?.name,
      user_name: huddle.user?.name,
      user_email: huddle.user?.email
    });
  } catch (error) {
    console.error('Error updating huddle:', error);
    res.status(500).json({ error: 'Failed to update huddle', details: error.message });
  }
});

// DELETE /api/manage-huddles/:id
// Delete a huddle (admin can delete any huddle)
router.delete('/manage-huddles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.huddle.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Huddle deleted successfully' });
  } catch (error) {
    console.error('Error deleting huddle:', error);
    res.status(500).json({ error: 'Failed to delete huddle', details: error.message });
  }
});

// =============================================
// KNOWLEDGE BASE ROUTES
// =============================================

// GET /api/manage-knowledge-base
// Get all knowledge base items (books, manuscripts, etc.)
router.get('/manage-knowledge-base', async (req, res) => {
  try {
    const knowledgeBase = await prisma.knowledgeBase.findMany({
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' }
      ]
    });
    res.json(knowledgeBase);
  } catch (error) {
    console.error('Get knowledge base error:', error);
    res.status(500).json({ error: 'Failed to get knowledge base' });
  }
});

// POST /api/manage-knowledge-base
// Create new knowledge base item
router.post('/manage-knowledge-base', async (req, res) => {
  try {
    const { title, author, type, content, summary, isActive, order } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    const knowledgeItem = await prisma.knowledgeBase.create({
      data: {
        title,
        author: author || null,
        type: type || 'book',
        content,
        summary: summary || null,
        isActive: isActive !== false,
        order: order || 0
      }
    });
    
    res.status(201).json(knowledgeItem);
  } catch (error) {
    console.error('Create knowledge base error:', error);
    res.status(500).json({ error: 'Failed to create knowledge base item' });
  }
});

// PUT /api/manage-knowledge-base/:id
// Update knowledge base item
router.put('/manage-knowledge-base/:id', async (req, res) => {
  try {
    const { title, author, type, content, summary, isActive, order } = req.body;
    
    const knowledgeItem = await prisma.knowledgeBase.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(title && { title }),
        ...(author !== undefined && { author }),
        ...(type && { type }),
        ...(content && { content }),
        ...(summary !== undefined && { summary }),
        ...(isActive !== undefined && { isActive }),
        ...(order !== undefined && { order })
      }
    });
    
    res.json(knowledgeItem);
  } catch (error) {
    console.error('Update knowledge base error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Knowledge base item not found' });
    }
    res.status(500).json({ error: 'Failed to update knowledge base item' });
  }
});

// DELETE /api/manage-knowledge-base/:id
// Delete knowledge base item
router.delete('/manage-knowledge-base/:id', async (req, res) => {
  try {
    await prisma.knowledgeBase.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ message: 'Knowledge base item deleted successfully' });
  } catch (error) {
    console.error('Delete knowledge base error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Knowledge base item not found' });
    }
    res.status(500).json({ error: 'Failed to delete knowledge base item' });
  }
});

console.log('[ADMIN ROUTES] All routes registered, exporting router...');
console.log('[ADMIN ROUTES] Router type:', typeof router);
console.log('[ADMIN ROUTES] Router is function?', typeof router === 'function');

module.exports = router;

console.log('[ADMIN ROUTES] ✅ Module exported successfully');

