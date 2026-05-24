const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// Database Connection with improved error handling and retry logic
const connectDB = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pestcontrol', {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000
      });
      
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      console.log(`Database: ${conn.connection.name}`);
      
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
      console.error(`MongoDB Connection Attempt ${i + 1}/${retries} Failed:`, error.message);
      
      if (i < retries - 1) {
        console.log('Retrying in 3 seconds...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }
  
  // All retries failed
  console.error('MongoDB Connection Failed after', retries, 'attempts');
  console.log('='.repeat(60));
  console.log('SERVER STARTING WITHOUT DATABASE CONNECTION');
  console.log('='.repeat(60));
  console.log('The application will run in limited mode without MongoDB.');
  console.log('');
  console.log('To enable full functionality, please:');
  console.log('1. Install MongoDB if not already installed');
  console.log('2. Start MongoDB service:');
  console.log('   - Windows: Run "mongod" in a terminal or start MongoDB service');
  console.log('   - Linux/Mac: sudo systemctl start mongod');
  console.log('3. Verify MongoDB is running on port 27017');
  console.log('4. Restart this server');
  console.log('');
  console.log('Run "node check-mongodb.js" to test MongoDB connection');
  console.log('='.repeat(60));
  return null;
};

// Connect to database
connectDB();

// Database health check endpoint
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  res.json({
    status: 'ok',
    database: {
      state: dbStates[dbState] || 'unknown',
      connected: dbState === 1,
      host: mongoose.connection.host || 'N/A'
    },
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/auth', require('./backend/routes/auth'));
app.use('/api/customers', require('./backend/routes/customers'));
app.use('/api/invoices', require('./backend/routes/invoices'));
app.use('/api/services', require('./backend/routes/services'));
app.use('/api/technicians', require('./backend/routes/technicians'));
app.use('/api/dashboard', require('./backend/routes/dashboard'));
app.use('/api/followups', require('./backend/routes/followups'));
app.use('/api/payments', require('./backend/routes/payments'));
app.use('/api/ai', require('./backend/routes/ai'));

// Error handling middleware for database connection errors
app.use((err, req, res, next) => {
  if (err.name === 'MongooseError' || err.name === 'MongoError') {
    console.error('Database Error:', err.message);
    return res.status(503).json({
      message: 'Database connection error. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
  next(err);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Serve frontend for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
});
