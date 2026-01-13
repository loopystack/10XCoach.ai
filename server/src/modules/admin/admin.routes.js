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
    const transporterConfig = {
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465 (SSL), false for 587 (TLS)
      auth: {
        user: smtpUsername,
        pass: smtpPassword
      }
    };
    
    // For port 587 (TLS), require TLS
    if (smtpPort === 587) {
      transporterConfig.requireTLS = true;
    }
    
    const transporter = nodemailer.createTransport(transporterConfig);

    // Verify connection
    await transporter.verify();

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

    const info = await transporter.sendMail(mailOptions);
    console.log('Test email sent successfully:', info.messageId);

    res.json({ 
      message: 'Test email sent successfully',
      messageId: info.messageId
    });
  } catch (error) {
    console.error('Send test email error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to send test email. Please check your SMTP configuration.' 
    });
  }
});

// =============================================
// GET /api/manage-analytics
// Get analytics data
// =============================================
router.get('/manage-analytics', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let dateFilter;
    switch (period) {
      case '7d':
        dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        dateFilter = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const [
      newUsers,
      totalSessions,
      completedActions
    ] = await Promise.all([
      prisma.user.count({
        where: { createdAt: { gte: dateFilter } }
      }),
      prisma.session.count({
        where: { startTime: { gte: dateFilter } }
      }),
      prisma.actionStep.count({
        where: {
          status: 'COMPLETED',
          completedAt: { gte: dateFilter }
        }
      })
    ]);

    // Sessions by coach
    const sessionsByCoach = await prisma.session.groupBy({
      by: ['coachId'],
      where: { startTime: { gte: dateFilter } },
      _count: { id: true }
    });

    // Get coach names
    const coachIds = sessionsByCoach.map(s => s.coachId);
    const coaches = await prisma.coach.findMany({
      where: { id: { in: coachIds } },
      select: { id: true, name: true }
    });

    const coachMap = coaches.reduce((acc, c) => {
      acc[c.id] = c.name;
      return acc;
    }, {});

    res.json({
      period,
      newUsers,
      totalSessions,
      completedActions,
      sessionsByCoach: sessionsByCoach.map(s => ({
        coachId: s.coachId,
        coachName: coachMap[s.coachId] || 'Unknown',
        count: s._count.id
      }))
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
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

console.log('[ADMIN ROUTES] All routes registered, exporting router...');
console.log('[ADMIN ROUTES] Router type:', typeof router);
console.log('[ADMIN ROUTES] Router is function?', typeof router === 'function');

module.exports = router;

console.log('[ADMIN ROUTES] ✅ Module exported successfully');

