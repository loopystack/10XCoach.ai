const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Middleware to verify JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true,
        status: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.status === 'INACTIVE' || user.status === 'CANCELED') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
};

/**
 * Middleware to check if user is admin (SUPER_ADMIN or COACH_ADMIN)
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Allow SUPER_ADMIN, COACH_ADMIN, ADMIN (legacy), or Daniel Rosario's email
  const userEmail = (req.user.email || '').toLowerCase();
  const userRole = (req.user.role || '').toUpperCase();
  
  const isSuperAdmin = userRole === 'SUPER_ADMIN' || userEmail === 'danrosario0604@gmail.com';
  const isCoachAdmin = userRole === 'COACH_ADMIN';
  const isLegacyAdmin = userRole === 'ADMIN'; // Legacy support
  
  if (!isSuperAdmin && !isCoachAdmin && !isLegacyAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  // Attach role info to request for use in other middlewares
  req.user.isSuperAdmin = isSuperAdmin;
  req.user.isCoachAdmin = isCoachAdmin;
  
  next();
};

/**
 * Middleware to check if user is super admin only
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const userEmail = (req.user.email || '').toLowerCase();
  const userRole = (req.user.role || '').toUpperCase();
  
  const isSuperAdmin = userRole === 'SUPER_ADMIN' || userEmail === 'danrosario0604@gmail.com';
  
  if (!isSuperAdmin) {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  
  next();
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true,
        status: true
      }
    });

    if (user) {
      req.user = user;
    }
    
    next();
  } catch (error) {
    // Token invalid but continue without user
    next();
  }
};

/**
 * Generate JWT token
 */
const generateToken = (userId, userName = null, userEmail = null) => {
  const payload = { userId };
  if (userName) payload.userName = userName;
  if (userEmail) payload.userEmail = userEmail;

  return jwt.sign(
    payload,
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

module.exports = {
  authenticate,
  requireAdmin,
  requireSuperAdmin,
  optionalAuth,
  generateToken
};

