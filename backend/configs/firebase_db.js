const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const loadServiceAccount = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (parsed.private_key) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    return parsed;
  }

  const filePath = path.join(__dirname, 'firebase-service.json');
  if (fs.existsSync(filePath)) {
    return require('./firebase-service.json');
  }

  throw new Error(
    'Firebase service account not configured. Set FIREBASE_SERVICE_ACCOUNT env var or add backend/configs/firebase-service.json'
  );
};

const database_url = process.env.DATABASE_URL;

if (!admin.apps.length) {
  const config = {
    credential: admin.credential.cert(loadServiceAccount()),
  };

  if (database_url) {
    config.databaseURL = database_url;
  }

  admin.initializeApp(config);
}

const isFirebaseAuthError = (error) =>
  error?.code === 16 ||
  error?.code === 'app/invalid-credential' ||
  String(error?.message || '').includes('UNAUTHENTICATED') ||
  String(error?.message || '').includes('invalid_grant');

const firebaseErrorResponse = (error) => ({
  status: isFirebaseAuthError(error) ? 503 : 500,
  message: isFirebaseAuthError(error)
    ? 'Firebase server credentials are invalid or expired. Regenerate the service account key in Firebase Console and redeploy.'
    : 'Internal server error',
  error: error.message,
});

module.exports = {
  admin,
  realtime_db: admin.database(),
  service_db: admin.firestore(),
  isFirebaseAuthError,
  firebaseErrorResponse,
};
