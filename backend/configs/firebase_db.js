const admin = require('firebase-admin');
const fs = require('fs');
const os = require('os');
const path = require('path');

const backendDir = path.join(__dirname, '..');

const normalizePrivateKey = (privateKey) => {
  if (!privateKey || typeof privateKey !== 'string') {
    return privateKey;
  }

  const normalized = privateKey.includes('\\n')
    ? privateKey.replace(/\\n/g, '\n')
    : privateKey;

  if (!normalized.includes('-----BEGIN PRIVATE KEY-----')) {
    throw new Error(
      'Firebase private_key is malformed. Re-upload the full service account JSON from Firebase Console.'
    );
  }

  return normalized;
};

const parseServiceAccount = (raw) => {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new Error(
      'Firebase service account JSON is incomplete. It must include project_id, client_email, and private_key.'
    );
  }

  parsed.private_key = normalizePrivateKey(parsed.private_key);
  return parsed;
};

const parseServiceAccountFile = (filePath) => {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return parseServiceAccount(raw);
};

const resolveServiceAccountPath = (configuredPath) => {
  const expanded = configuredPath.startsWith('~/')
    ? path.join(os.homedir(), configuredPath.slice(2))
    : configuredPath;

  return path.isAbsolute(expanded)
    ? expanded
    : path.resolve(backendDir, expanded);
};

const loadServiceAccount = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log('Loading Firebase credentials from FIREBASE_SERVICE_ACCOUNT env var');
    return parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT);
  }

  const configuredPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!configuredPath) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_PATH is not set. Add it to backend/.env (local) or Render environment variables.'
    );
  }

  const filePath = resolveServiceAccountPath(configuredPath);
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Firebase service account file not found at ${filePath}. Check FIREBASE_SERVICE_ACCOUNT_PATH in your .env.`
    );
  }

  console.log(`Loading Firebase credentials from ${filePath}`);
  return parseServiceAccountFile(filePath);
};

const database_url = process.env.DATABASE_URL;

if (!admin.apps.length) {
  const serviceAccount = loadServiceAccount();
  console.log(`Firebase project: ${serviceAccount.project_id}`);

  const config = {
    credential: admin.credential.cert(serviceAccount),
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
