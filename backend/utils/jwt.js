const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const COOKIE_NAME = 'auth_token';

if (!JWT_SECRET) {
  console.warn(
    'JWT_SECRET is not set. Using an insecure development default. Set JWT_SECRET in production.'
  );
}

const getSecret = () => JWT_SECRET || 'dev-jwt-secret-change-in-production';

const signToken = (payload) =>
  jwt.sign(payload, getSecret(), { expiresIn: JWT_EXPIRES_IN });

const verifyTokenSignature = (token) => {
  try {
    return jwt.verify(token, getSecret());
  } catch {
    return null;
  }
};

const getTokenFromRequest = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return req.cookies?.[COOKIE_NAME] || null;
};

const isProduction = () => process.env.NODE_ENV === 'production';

const setAuthCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: isProduction() ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
};

const clearAuthCookie = (res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: isProduction() ? 'none' : 'lax',
    path: '/',
  });
};

module.exports = {
  signToken,
  verifyTokenSignature,
  getTokenFromRequest,
  setAuthCookie,
  clearAuthCookie,
  COOKIE_NAME,
};
