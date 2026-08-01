const { admin, realtime_db, service_db } = require('../configs/firebase_db');
const { signToken, setAuthCookie, clearAuthCookie, getTokenFromRequest, verifyTokenSignature } = require('../utils/jwt');

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
const FIREBASE_SIGN_IN_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;
const FIREBASE_SIGN_UP_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`;

const RTDB_TIMEOUT_MS = 2000;

const withTimeout = (promise, ms = RTDB_TIMEOUT_MS) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database timeout')), ms);
    }),
  ]);

const formatPublicUser = (profile) => ({
  userId: profile.userId,
  email: profile.email,
  name: profile.name || profile.email?.split('@')[0] || 'User',
  role: profile.role || 'supervisor',
});

const buildFallbackProfile = (userId, { email, name, role = 'supervisor' }) => ({
  userId,
  email,
  name: name || email.split('@')[0],
  role,
});

const getUserProfile = async (userId) => {
  const snapshot = await realtime_db.ref(`users/${userId}`).once('value');
  return snapshot.exists() ? snapshot.val() : null;
};

const ensureUserProfile = async (userId, { email, name, role = 'supervisor' }) => {
  const userRef = realtime_db.ref(`users/${userId}`);
  const snapshot = await userRef.once('value');

  if (!snapshot.exists()) {
    const profile = {
      userId,
      email,
      name: name || email.split('@')[0],
      role: role || 'supervisor',
      createdAt: admin.database.ServerValue.TIMESTAMP,
      firebaseUid: userId,
      isActive: true,
    };
    await userRef.set(profile);
    return profile;
  }

  const profile = snapshot.val();
  // Preserve the existing role from the database
  const existingRole = profile.role;
  
  // Make the update non-blocking - don't wait for it
  userRef.update({
    lastLogin: admin.database.ServerValue.TIMESTAMP,
    isActive: true,
  }).catch(err => console.warn('Failed to update lastLogin:', err));

  return { ...profile, email: profile.email || email, role: existingRole || profile.role };
};

const resolveUserProfile = async (userId, data) => {
  try {
    const profile = await withTimeout(ensureUserProfile(userId, data));
    return formatPublicUser(profile);
  } catch (error) {
    console.warn('RTDB profile sync skipped:', error.message);
    // Quick fallback with shorter timeout
    try {
      const existing = await withTimeout(getUserProfile(userId), 1000);
      if (existing) {
        return formatPublicUser(existing);
      }
    } catch {
      // Use auth response only
    }
    // Build fallback profile but try to preserve role from existing data
    const fallback = buildFallbackProfile(userId, data);
    return formatPublicUser(fallback);
  }
};

const issueAuthResponse = (res, user) => {
  const token = signToken({
    userId: user.userId,
    email: user.email,
    role: user.role,
  });
  setAuthCookie(res, token);
  return token;
};

const isSignupEnabled = async () => {
  try {
    const settingsDoc = await service_db.collection('settings').doc('app').get();
    if (!settingsDoc.exists) {
      return true;
    }
    const settings = settingsDoc.data();
    return settings.signupEnabled !== false;
  } catch (error) {
    console.warn('Could not read signup setting, defaulting to enabled:', error.message);
    return true;
  }
};

const signInWithFirebase = async (email, password) => {
  if (!FIREBASE_API_KEY) {
    throw new Error('FIREBASE_API_KEY is not configured');
  }

  const response = await fetch(FIREBASE_SIGN_IN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });

  const data = await response.json();

  if (!response.ok) {
    const code = data.error?.message;
    if (['INVALID_PASSWORD', 'EMAIL_NOT_FOUND', 'INVALID_LOGIN_CREDENTIALS'].includes(code)) {
      return { success: false, message: 'Invalid email or password' };
    }
    return { success: false, message: data.error?.message || 'Authentication failed' };
  }

  return {
    success: true,
    data: {
      userId: data.localId,
      email: data.email,
      name: data.displayName || email.split('@')[0],
      idToken: data.idToken,
    },
  };
};

const signUpWithFirebase = async (email, password) => {
  if (!FIREBASE_API_KEY) {
    throw new Error('FIREBASE_API_KEY is not configured');
  }

  const response = await fetch(FIREBASE_SIGN_UP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });

  const data = await response.json();

  if (!response.ok) {
    const code = data.error?.message;
    if (code === 'EMAIL_EXISTS') {
      return { success: false, message: 'An account with this email already exists', status: 409 };
    }
    if (code === 'WEAK_PASSWORD' || code === 'INVALID_PASSWORD') {
      return { success: false, message: 'Password is too weak', status: 400 };
    }
    if (code === 'OPERATION_NOT_ALLOWED') {
      return {
        success: false,
        message: 'Email/password signup is disabled in Firebase. Enable it in Firebase Console → Authentication → Sign-in method.',
        status: 400,
      };
    }
    return { success: false, message: data.error?.message || 'Signup failed', status: 400 };
  }

  return {
    success: true,
    data: {
      userId: data.localId,
      email: data.email,
      name: data.displayName || email.split('@')[0],
      idToken: data.idToken,
    },
  };
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const authResult = await signInWithFirebase(email.trim(), password);
    if (!authResult.success) {
      return res.status(401).json({ success: false, message: authResult.message });
    }

    const { userId, email: userEmail, name } = authResult.data;
    const user = await resolveUserProfile(userId, { email: userEmail, name });
    const token = issueAuthResponse(res, user);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { user, token },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.signup = async (req, res) => {
  try {
    const signupEnabled = await isSignupEnabled();
    if (!signupEnabled) {
      return res.status(403).json({
        success: false,
        message: 'New account registration is currently disabled. Contact your manager.',
      });
    }

    const { email, password, role = 'supervisor' } = req.body;
    const trimmedEmail = email?.trim();

    if (!trimmedEmail || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }
    if (!['manager', 'supervisor'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const displayName = trimmedEmail.split('@')[0];
    const authResult = await signUpWithFirebase(trimmedEmail, password);

    if (!authResult.success) {
      return res.status(authResult.status || 400).json({
        success: false,
        message: authResult.message,
      });
    }

    const { userId } = authResult.data;
    const user = await resolveUserProfile(userId, {
      email: trimmedEmail,
      name: displayName,
      role,
    });
    const token = issueAuthResponse(res, user);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: { user, token },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.logout = async (req, res) => {
  try {
    const token = getTokenFromRequest(req);
    const decoded = token ? verifyTokenSignature(token) : null;
    const userId = decoded?.userId || req.user?.userId;

    if (userId) {
      try {
        await withTimeout(
          realtime_db.ref(`users/${userId}`).update({
            isActive: false,
            lastLogout: admin.database.ServerValue.TIMESTAMP,
          }),
          2000
        );
      } catch {
        // Non-blocking
      }
    }

    clearAuthCookie(res);

    return res.status(200).json({ success: true, message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getSession = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    return res.status(200).json({
      success: true,
      message: 'Session active',
      data: { user: req.user },
    });
  } catch (error) {
    console.error('Session error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getSignupStatus = async (_req, res) => {
  try {
    const signupEnabled = await isSignupEnabled();
    return res.status(200).json({
      success: true,
      data: { signupEnabled },
    });
  } catch (error) {
    console.error('Signup status error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.formatPublicUser = formatPublicUser;
exports.getUserProfile = getUserProfile;
exports.isSignupEnabled = isSignupEnabled;
