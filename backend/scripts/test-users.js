const { admin, realtime_db } = require('../configs/firebase_db');

async function testRealtimeDB() {
  try {
    console.log('Testing Realtime Database connection...');
    
    // Test basic write/read
    const testRef = realtime_db.ref('test');
    await testRef.set({ 
      message: 'Test connection', 
      timestamp: Date.now(),
      test: true 
    });
    
    const snapshot = await testRef.once('value');
    console.log('Test data written and read:', snapshot.val());
    
    // Clean up
    await testRef.remove();
    console.log('Test data cleaned up');
    
    // Check if users exist
    const usersRef = realtime_db.ref('users');
    const usersSnapshot = await usersRef.once('value');
    
    console.log('Users exist:', usersSnapshot.exists());
    console.log('Number of users:', usersSnapshot.numChildren());
    
    if (usersSnapshot.exists()) {
      usersSnapshot.forEach((childSnapshot) => {
        console.log('User:', childSnapshot.key, childSnapshot.val());
      });
    } else {
      console.log('No users found. Creating test users...');
      
      // Create test users
      const testUsers = [
        {
          userId: 'test-manager-1',
          email: 'manager@test.com',
          name: 'Test Manager',
          role: 'manager',
          createdAt: admin.database.ServerValue.TIMESTAMP,
          isActive: true
        },
        {
          userId: 'test-supervisor-1',
          email: 'supervisor@test.com',
          name: 'Test Supervisor',
          role: 'supervisor',
          createdAt: admin.database.ServerValue.TIMESTAMP,
          isActive: true
        }
      ];
      
      for (const user of testUsers) {
        await usersRef.child(user.userId).set(user);
        console.log('Created test user:', user.email);
      }
    }
    
    console.log('Realtime Database test completed successfully!');
    
  } catch (error) {
    console.error('Realtime Database test failed:', error);
  }
}

// Run the test
testRealtimeDB().then(() => {
  console.log('Test script finished');
  process.exit(0);
}).catch((error) => {
  console.error('Test script failed:', error);
  process.exit(1);
});
