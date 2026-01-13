const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const prisma = require('../../lib/prisma');
const { authenticate, generateToken } = require('../../middleware/auth.middleware');

// =============================================
// POST /api/auth/register
// Register a new user (simplified for SQLite)
// =============================================
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Calculate trial dates (14 days from now)
    const trialStartDate = new Date();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14);

    // Create user with 14-day free trial
    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        role: 'USER',
        plan: 'FOUNDATION',
        status: 'ACTIVE',
        // Auto-start 14-day free trial
        trialStartDate: trialStartDate,
        trialEndDate: trialEndDate,
        accessStatus: 'TRIAL_ACTIVE',
        creditBalance: 0
      }
    });

    // Generate token for immediate login
    const token = generateToken(user.id, user.name, user.email);

    res.status(201).json({
      message: 'Registration successful!',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        status: user.status
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// =============================================
// POST /api/auth/login
// Login user (simplified for SQLite)
// =============================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { email: normalizedEmail }
      });
    } catch (error) {
      console.error('Database connection error during login:', error.message);
      if (error.code === 'P1001' || error.message.includes('Authentication')) {
        return res.status(500).json({ 
          error: 'Database connection failed. Please check your PostgreSQL credentials in server/.env',
          details: 'The backend cannot connect to your PostgreSQL database. Please update DATABASE_URL in server/.env with the correct password.'
        });
      }
      return res.status(500).json({ error: 'Login failed - database error' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password - handle both Prisma object and raw query result
    const passwordHash = user.passwordHash || user.password_hash;
    if (!passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check account status
    if (user.status === 'CANCELED') {
      return res.status(403).json({ error: 'Account has been canceled' });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Generate token
    const token = generateToken(user.id, user.name, user.email);

    // Get billing status
    const now = new Date();
    let trialDaysRemaining = null;
    if (user.trialStartDate && user.trialEndDate && now <= user.trialEndDate) {
      trialDaysRemaining = Math.ceil((user.trialEndDate - now) / (1000 * 60 * 60 * 24));
    }

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        status: user.status,
        businessName: user.businessName,
        industry: user.industry,
        trialStartDate: user.trialStartDate,
        trialEndDate: user.trialEndDate,
        trialDaysRemaining,
        accessStatus: user.accessStatus,
        currentPlanName: user.currentPlanName,
        creditBalance: parseFloat(user.creditBalance) || 0
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// =============================================
// GET /api/auth/me
// Get current user profile
// =============================================
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        primaryCoach: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      plan: user.plan,
      status: user.status,
      businessName: user.businessName,
      industry: user.industry,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      primaryCoach: user.primaryCoach ? {
        id: user.primaryCoach.id,
        name: user.primaryCoach.name,
        role: user.primaryCoach.role,
        avatar: user.primaryCoach.avatar
      } : null
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

module.exports = router;

