const mongoose = require('mongoose');

const followUpSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  },
  reminderType: {
    type: String,
    enum: ['service_reminder', 'amc_expiry', 'payment_reminder', 'follow_up'],
    required: true
  },
  reminderDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'completed', 'cancelled'],
    default: 'pending'
  },
  notes: String,
  sentDate: Date,
  completedDate: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

followUpSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('FollowUp', followUpSchema);
