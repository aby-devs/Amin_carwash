const authService = require('../services/authService');
const { getTokenFromRequest, verifyTokenSignature } = require('../utils/jwt');

const verifyToken = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const decoded = verifyTokenSignature(token);
    if (!decoded?.userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    const profile = await authService.getUserProfile(decoded.userId);
    if (!profile) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    if (profile.isActive === false) {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please sign in again.',
      });
    }

    req.user = authService.formatPublicUser(profile);
    req.auth = { userId: decoded.userId, token };
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
