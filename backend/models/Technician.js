const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const technicianSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  employeeId: {
    type: String,
    required: true,
    unique: true
  },
  specialization: [String],
  experience: {
    type: Number,
    default: 0
  },
  assignedJobs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  }],
  completedServices: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  isActive: {
    type: Boolean,
    default: true
  },
  dailyPerformance: [{
    date: Date,
    jobsCompleted: Number,
    revenueGenerated: Number,
    customerRating: Number
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

technicianSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

technicianSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

technicianSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Technician', technicianSchema);
