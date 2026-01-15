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
      phone: user.phone,
      address: user.address,
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

// =============================================
// PUT /api/auth/profile
// Update current user's profile (name, businessName, industry, phone, address)
// =============================================
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, businessName, industry, phone, address } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (businessName !== undefined) updateData.businessName = businessName;
    if (industry !== undefined) updateData.industry = industry;
    
    // Only include phone and address if they're provided and the fields exist in the database
    // We'll try to update them, but if they don't exist, we'll catch the error and provide a helpful message
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    try {
      // Try to build the select object dynamically based on what fields exist
      const selectFields = {
        id: true,
        name: true,
        email: true,
        businessName: true,
        industry: true,
        updatedAt: true
      };

      // Try to include phone and address in select, but don't fail if they don't exist
      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: updateData,
        select: selectFields
      });

      // Try to fetch phone and address separately if they were updated
      let phoneValue = null;
      let addressValue = null;
      if (phone !== undefined || address !== undefined) {
        try {
          const fullUser = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { phone: true, address: true }
          });
          if (fullUser) {
            phoneValue = fullUser.phone;
            addressValue = fullUser.address;
          }
        } catch (fieldError) {
          // Fields don't exist yet - that's okay, we'll return null
          console.warn('Phone/address fields may not exist in database yet:', fieldError.message);
        }
      }

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          ...user,
          phone: phoneValue,
          address: addressValue
        }
      });
    } catch (updateError) {
      // Check if it's a database field error
      if (updateError.message && (
        updateError.message.includes('Unknown arg') ||
        updateError.message.includes('does not exist') ||
        updateError.code === 'P2009' || // Prisma query validation error
        updateError.code === 'P2012'    // Missing required value (but could also be field doesn't exist)
      )) {
        console.error('Database field error - phone/address may not exist yet:', updateError.message);
        console.error('Error code:', updateError.code);
        console.error('Full error:', updateError);
        
        // Try updating without phone/address
        const safeUpdateData = { ...updateData };
        delete safeUpdateData.phone;
        delete safeUpdateData.address;
        
        if (Object.keys(safeUpdateData).length === 0) {
          return res.status(400).json({ 
            error: 'Phone and address fields are not available yet. Please run database migration first.',
            details: 'The database schema needs to be updated to include phone and address fields. Please contact support or run: npm run db:push'
          });
        }

        // Update with only safe fields
        const user = await prisma.user.update({
          where: { id: req.user.id },
          data: safeUpdateData,
          select: {
            id: true,
            name: true,
            email: true,
            businessName: true,
            industry: true,
            updatedAt: true
          }
        });

        return res.json({
          success: true,
          message: 'Profile updated (phone and address fields not available yet - database migration needed)',
          user: {
            ...user,
            phone: null,
            address: null
          },
          warning: 'Phone and address fields require a database migration. Other fields were updated successfully.'
        });
      }
      
      // Re-throw other errors
      throw updateError;
    }
  } catch (error) {
    console.error('Update profile error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(500).json({ 
      error: 'Failed to update profile',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

