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

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected Successfully'))
  .catch(err => console.log('MongoDB Connection Error:', err));

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

// Serve frontend for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
