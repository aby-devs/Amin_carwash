const express = require('express');
const router = express.Router();
const { AuthLogic } = require('../controllers');
const { verifyToken, requireManager } = require('../middleware/auth');

// Authentication routes
router.post('/login', AuthLogic.login);
router.post('/signup', AuthLogic.signup);
router.post('/logout', AuthLogic.logout);
router.get('/me', AuthLogic.getSession);
router.post('/create-user', AuthLogic.createUser); // For manual user creation

// Settings routes
router.get('/settings', AuthLogic.get_settings);
router.put('/settings', AuthLogic.update_settings);

// Service management routes
router.post('/services', verifyToken, AuthLogic.add_service);
router.delete('/services', verifyToken, AuthLogic.remove_service);

// User management routes (manager only)
router.get('/users', verifyToken, requireManager, AuthLogic.getUsers);
router.put('/users/:userId/role', verifyToken, requireManager, AuthLogic.updateUserRole);
router.delete('/users/:userId', verifyToken, requireManager, AuthLogic.deleteUser);

// Test routes
router.get('/test-realtime', AuthLogic.testRealtimeDB);

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Car Wash API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
