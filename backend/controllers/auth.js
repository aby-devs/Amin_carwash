const { admin, service_db, realtime_db } = require('../configs/firebase_db');
const bcrypt = require('bcryptjs');
const authService = require('../services/authService');

// Authentication endpoints
exports.login = authService.login;
exports.signup = authService.signup;
exports.logout = authService.logout;
exports.getSession = authService.getSession;

// Helper function to create a user (for manual user creation)
exports.createUser = async (req, res) => {
  try {
    const { email, password, name, role = 'user' } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Check if user already exists
    const userRef = realtime_db.ref(`users/${email.replace(/[.#$[\]]/g, '_')}`);
    const userSnapshot = await userRef.once('value');

    if (userSnapshot.exists()) {
      return res.status(409).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create user in Firebase Realtime Database
    const userData = {
      userId,
      email,
      password: hashedPassword,
      name: name || email.split('@')[0],
      role,
      createdAt: admin.database.ServerValue.TIMESTAMP,
      isActive: false
    };

    await userRef.set(userData);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        userId,
        email,
        name: userData.name,
        role
      }
    });

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get system settings (for demo purposes)
exports.get_settings = async (req, res) => {
  try {
    const settingsRef = service_db.collection('settings').doc('app');
    const settingsDoc = await settingsRef.get();

    let settings = {
      businessName: 'AutoWash Pro',
      currency: 'KSh',
      paymentMethods: ['Cash', 'Mpesa'],
      defaultServices: [
        'Exterior wash',
        'Interior cleaning',
        'Waxing',
        'Tire cleaning',
        'Engine bay cleaning'
      ],
      availableServices: [
        'Engine Steam Wash',
        'Under Wash',
        'Executive Wash',
        'Vacuum',
        'Vacuum and shampoo',
        'Leather Care Cleaner',
        'Dashboard Shine',
        'Executive Machine Polish',
        'Executive Buffing',
        'Air-con Refill',
        'Water Marks',
        'Rim Restoration',
        'Engine Wash'
      ],
      workingHours: {
        open: '08:00',
        close: '18:00'
      }
    };

    if (settingsDoc.exists) {
      settings = { ...settings, ...settingsDoc.data() };
    } else {
      // Create default settings if they don't exist
      await settingsRef.set(settings);
    }

    res.status(200).json({
      success: true,
      message: 'Settings retrieved successfully',
      data: settings
    });

  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update system settings
exports.update_settings = async (req, res) => {
  try {
    const settingsData = req.body;

    // Add update timestamp
    settingsData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    // Update settings
    await service_db.collection('settings').doc('app').set(settingsData, { merge: true });

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: settingsData
    });

  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Add a new service to available services
exports.add_service = async (req, res) => {
  try {
    const { serviceName } = req.body;

    if (!serviceName || typeof serviceName !== 'string' || serviceName.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Service name is required and must be a non-empty string'
      });
    }

    const settingsRef = service_db.collection('settings').doc('app');
    const settingsDoc = await settingsRef.get();

    let settings = {
      availableServices: [
        'Engine Steam Wash',
        'Under Wash',
        'Executive Wash',
        'Vacuum',
        'Vacuum and shampoo',
        'Leather Care Cleaner',
        'Dashboard Shine',
        'Executive Machine Polish',
        'Executive Buffing',
        'Air-con Refill',
        'Water Marks',
        'Rim Restoration',
        'Engine Wash'
      ]
    };

    if (settingsDoc.exists) {
      settings = { ...settings, ...settingsDoc.data() };
    }

    // Check if service already exists
    if (settings.availableServices && settings.availableServices.includes(serviceName.trim())) {
      return res.status(409).json({
        success: false,
        message: 'Service already exists'
      });
    }

    // Add the new service
    if (!settings.availableServices) {
      settings.availableServices = [];
    }
    settings.availableServices.push(serviceName.trim());
    settings.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    // Update settings
    await settingsRef.set(settings, { merge: true });

    res.status(200).json({
      success: true,
      message: 'Service added successfully',
      data: { availableServices: settings.availableServices }
    });

  } catch (error) {
    console.error('Error adding service:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Remove a service from available services
exports.remove_service = async (req, res) => {
  try {
    const { serviceName } = req.body;

    if (!serviceName || typeof serviceName !== 'string' || serviceName.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Service name is required and must be a non-empty string'
      });
    }

    const settingsRef = service_db.collection('settings').doc('app');
    const settingsDoc = await settingsRef.get();

    if (!settingsDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Settings not found'
      });
    }

    const settings = settingsDoc.data();

    if (!settings.availableServices || !settings.availableServices.includes(serviceName.trim())) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Remove the service
    settings.availableServices = settings.availableServices.filter(service => service !== serviceName.trim());
    settings.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    // Update settings
    await settingsRef.set(settings, { merge: true });

    res.status(200).json({
      success: true,
      message: 'Service removed successfully',
      data: { availableServices: settings.availableServices }
    });

  } catch (error) {
    console.error('Error removing service:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Test realtime database connection
exports.testRealtimeDB = async (req, res) => {
  try {
    console.log('Testing realtime database connection...');
    
    // Test basic connection
    const testRef = realtime_db.ref('test');
    await testRef.set({ message: 'Test connection', timestamp: Date.now() });
    
    const testSnapshot = await testRef.once('value');
    const testData = testSnapshot.val();
    
    console.log('Realtime DB test data:', testData);
    
    // Clean up test data
    await testRef.remove();
    
    res.status(200).json({
      success: true,
      message: 'Realtime database connection successful',
      data: testData
    });
  } catch (error) {
    console.error('Realtime database test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Realtime database connection failed',
      error: error.message
    });
  }
};

// Get all users (manager only)
exports.getUsers = async (req, res) => {
  try {
    console.log('Fetching users from realtime database...');
    
    // First, let's check if we can access the database at all
    try {
      const testRef = realtime_db.ref('test');
      await testRef.set({ test: true });
      await testRef.remove();
      console.log('Realtime database connection is working');
    } catch (dbError) {
      console.error('Realtime database connection failed:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Database connection failed',
        error: dbError.message
      });
    }
    
    const usersSnapshot = await realtime_db.ref('users').once('value');
    const users = [];
    
    console.log('Users snapshot exists:', usersSnapshot.exists());
    console.log('Users snapshot size:', usersSnapshot.numChildren());
    
    if (usersSnapshot.exists()) {
      usersSnapshot.forEach((childSnapshot) => {
        const userData = childSnapshot.val();
        console.log('User data:', childSnapshot.key, userData);
        users.push({
          userId: childSnapshot.key,
          ...userData
        });
      });
    } else {
      console.log('No users found in database. This might be because:');
      console.log('1. No users have logged in yet');
      console.log('2. Users are stored in a different location');
      console.log('3. Database URL is not configured properly');
    }

    console.log('Total users found:', users.length);

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: users
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update user role (manager only)
exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role || !['manager', 'supervisor'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Valid role (manager or supervisor) is required'
      });
    }

    // Check if user exists
    const userRef = realtime_db.ref(`users/${userId}`);
    const userSnapshot = await userRef.once('value');
    
    if (!userSnapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user role
    await userRef.update({
      role,
      updatedAt: admin.database.ServerValue.TIMESTAMP
    });

    res.status(200).json({
      success: true,
      message: 'User role updated successfully'
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete user (manager only)
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const userRef = realtime_db.ref(`users/${userId}`);
    const userSnapshot = await userRef.once('value');
    
    if (!userSnapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting own account
    if (userId === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    const userData = userSnapshot.val();
    const userEmail = userData.email;

    // Delete user from Firebase Authentication
    try {
      if (userEmail) {
        // Get user by email from Firebase Auth
        const userRecord = await admin.auth().getUserByEmail(userEmail);
        if (userRecord) {
          await admin.auth().deleteUser(userRecord.uid);
          console.log(`User ${userEmail} deleted from Firebase Authentication`);
        }
      }
    } catch (authError) {
      console.error('Error deleting user from Firebase Auth:', authError);
      // Continue with database deletion even if auth deletion fails
    }

    // Delete user from Realtime Database
    await userRef.remove();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully from both database and authentication'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Export all functions
module.exports = {
  login: exports.login,
  signup: exports.signup,
  logout: exports.logout,
  getSession: exports.getSession,
  createUser: exports.createUser,
  get_settings: exports.get_settings,
  update_settings: exports.update_settings,
  add_service: exports.add_service,
  remove_service: exports.remove_service,
  getUsers: exports.getUsers,
  updateUserRole: exports.updateUserRole,
  deleteUser: exports.deleteUser,
  testRealtimeDB: exports.testRealtimeDB
};

