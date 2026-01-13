/**
 * Access Control Middleware
 * Checks if user has access based on trial/plan status
 */

const prisma = require('../lib/prisma');

/**
 * Check if user has access to features
 * Returns access decision object
 */
const checkUserAccess = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        trialStartDate: true,
        trialEndDate: true,
        accessStatus: true,
        currentPlanName: true,
        planStartDate: true,
        planEndDate: true,
        creditBalance: true
      }
    });

    if (!user) {
      return { hasAccess: false, reason: 'User not found' };
    }

    // Admins always have access
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'COACH_ADMIN') {
      return { hasAccess: true, reason: 'Admin access' };
    }

    const now = new Date();

    // Check if trial is active
    if (user.trialStartDate && user.trialEndDate) {
      if (now >= user.trialStartDate && now <= user.trialEndDate) {
        return {
          hasAccess: true,
          reason: 'Trial active',
          trialDaysRemaining: Math.ceil((user.trialEndDate - now) / (1000 * 60 * 60 * 24)),
          trialEndDate: user.trialEndDate
        };
      }
    }

    // Check if plan is active
    if (user.currentPlanName && user.planStartDate) {
      if (!user.planEndDate || now <= user.planEndDate) {
        return {
          hasAccess: true,
          reason: 'Plan active',
          planName: user.currentPlanName,
          planEndDate: user.planEndDate
        };
      }
    }

    // Trial expired and no active plan
    return {
      hasAccess: false,
      reason: 'Trial expired - upgrade required',
      trialEndDate: user.trialEndDate,
      creditBalance: user.creditBalance
    };
  } catch (error) {
    console.error('Error checking user access:', error);
    return { hasAccess: false, reason: 'Error checking access' };
  }
};

/**
 * Middleware to require active access (trial or paid plan)
 * Blocks requests if user doesn't have access
 */
const requireAccess = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Authentication required',
        requiresUpgrade: false
      });
    }

    const access = await checkUserAccess(req.user.id);

    if (!access.hasAccess) {
      return res.status(403).json({
        error: access.reason,
        requiresUpgrade: true,
        trialEndDate: access.trialEndDate,
        creditBalance: access.creditBalance,
        redirectTo: '/plans'
      });
    }

    // Attach access info to request
    req.userAccess = access;
    next();
  } catch (error) {
    console.error('Access middleware error:', error);
    res.status(500).json({ error: 'Error checking access' });
  }
};

/**
 * Optional access check - doesn't block, just attaches info
 */
const checkAccess = async (req, res, next) => {
  try {
    if (req.user && req.user.id) {
      const access = await checkUserAccess(req.user.id);
      req.userAccess = access;
    }
    next();
  } catch (error) {
    console.error('Access check error:', error);
    next(); // Continue even on error
  }
};

module.exports = {
  checkUserAccess,
  requireAccess,
  checkAccess
};

