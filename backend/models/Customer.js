const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
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
  alternatePhone: {
    type: String
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    landmark: String
  },
  pestHistory: [{
    pestType: String,
    severity: String,
    date: Date,
    notes: String
  }],
  amcContract: {
    hasAMC: { type: Boolean, default: false },
    startDate: Date,
    endDate: Date,
    servicesIncluded: [String],
    amount: Number
  },
  customerType: {
    type: String,
    enum: ['residential', 'commercial', 'industrial'],
    default: 'residential'
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  lastServiceDate: Date,
  nextFollowUpDate: Date,
  complaintHistory: [{
    date: Date,
    issue: String,
    status: String,
    resolution: String
  }],
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

customerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Customer', customerSchema);
