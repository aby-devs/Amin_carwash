const authService = require('../services/authService');

// Simple auth: client sends X-User-Id header after login/signup
const verifyToken = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const profile = await authService.getUserProfile(userId);

    if (!profile) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    req.user = authService.formatPublicUser(profile);
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

const requireManager = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (req.user.role !== 'manager') {
    return res.status(403).json({
      success: false,
      message: 'Manager role required for this action',
    });
  }

  next();
};

module.exports = {
  verifyToken,
  requireManager,
};
