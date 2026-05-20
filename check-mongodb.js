// Script to check MongoDB connection status
const mongoose = require('mongoose');

async function checkMongoDB() {
  console.log('Checking MongoDB connection...');
  console.log('Connection string: mongodb://localhost:27017/pestcontrol');
  
  try {
    const conn = await mongoose.connect('mongodb://localhost:27017/pestcontrol', {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    
    console.log('✓ MongoDB is running and accessible');
    console.log(`✓ Connected to: ${conn.connection.host}`);
    console.log(`✓ Database: ${conn.connection.name}`);
    
    await mongoose.connection.close();
    console.log('✓ Connection test successful');
    process.exit(0);
  } catch (error) {
    console.error('✗ MongoDB connection failed');
    console.error('Error:', error.message);
    console.log('\nTroubleshooting steps:');
    console.log('1. Ensure MongoDB is installed on your system');
    console.log('2. Start MongoDB service:');
    console.log('   - Windows: net start MongoDB (or run mongod directly)');
    console.log('   - Linux/Mac: sudo systemctl start mongod');
    console.log('3. Check if MongoDB is running on port 27017');
    console.log('4. Verify MongoDB configuration allows local connections');
    console.log('\nThe application will run without MongoDB, but database features will not work.');
    process.exit(1);
  }
}

checkMongoDB();
