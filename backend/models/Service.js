const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  technician: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Technician',
    required: true
  },
  serviceType: {
    type: String,
    required: true,
    enum: ['general_pest_control', 'termite_treatment', 'bed_bug_treatment', 'rodent_control', 'mosquito_control', 'cockroach_control', 'other']
  },
  serviceDate: {
    type: Date,
    required: true
  },
  scheduledTime: String,
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  chemicalsUsed: [{
    name: String,
    quantity: String,
    brand: String
  }],
  serviceNotes: String,
  beforeImages: [String],
  afterImages: [String],
  areaTreated: String,
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'severe'],
    default: 'medium'
  },
  customerRating: {
    type: Number,
    min: 1,
    max: 5
  },
  customerFeedback: String,
  completionTime: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

serviceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Service', serviceSchema);
