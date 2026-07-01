const { admin, realtime_db } = require('../configs/firebase_db');
  
// Script to manually create a user in Firebase Authentication
async function createUser(email, password, name, role = 'user') {
  try {
    
    // Create user in Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name || email.split('@')[0],
      emailVerified: true
    });

    console.log('User created successfully!');
    console.log('Firebase UID:', userRecord.uid);
    console.log('Email:', email);
    console.log('Name:', userRecord.displayName);
    console.log('Role:', role);
    
    // Also create user data in Realtime Database for our app
    const userRef = realtime_db.ref(`users/${userRecord.uid}`);
    await userRef.set({
      userId: userRecord.uid,
      email,
      name: userRecord.displayName || email.split('@')[0],
      role,
      createdAt: admin.database.ServerValue.TIMESTAMP,
      isActive: false,
      firebaseUid: userRecord.uid
    });

    console.log('User data also saved to Realtime Database');
    console.log('\nYou can now login with these credentials.');

  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
    } else {
      console.error('Error creating user:', error);
    }
  }
}

// Get command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node create-user.js <email> <password> [name] [role]');
  console.log('Example: node create-user.js admin@example.com password123 "Admin User" admin');
  process.exit(1);
}

const [email, password, name, role] = args;

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error('Invalid email format!');
  process.exit(1);
}

// Validate password length
if (password.length < 6) {
  console.error('Password must be at least 6 characters long!');
  process.exit(1);
}

// Create the user
createUser(email, password, name, role)
  .then(() => {
    console.log('\nUser creation completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to create user:', error);
    process.exit(1);
  });
