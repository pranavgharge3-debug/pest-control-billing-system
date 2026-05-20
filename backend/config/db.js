const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pestcontrol');
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });
    
    return conn;
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message);
    console.log('Starting server without database connection...');
    console.log('Some features may not work properly.');
    console.log('Please ensure MongoDB is running on: mongodb://localhost:27017/pestcontrol');
    // Don't exit process, allow server to start without DB
    return null;
  }
};

module.exports = connectDB;
