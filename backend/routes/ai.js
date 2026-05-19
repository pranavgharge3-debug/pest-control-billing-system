const express = require('express');
const Customer = require('../models/Customer');
const Service = require('../models/Service');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

// AI Pest Suggestion - Based on pest history and season
router.post('/pest-suggestion', adminAuth, async (req, res) => {
  try {
    const { customerId, symptoms, location } = req.body;

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Analyze pest history
    const pestFrequency = {};
    customer.pestHistory.forEach(pest => {
      pestFrequency[pest.pestType] = (pestFrequency[pest.pestType] || 0) + 1;
    });

    // Season-based suggestions
    const month = new Date().getMonth();
    const seasonalPests = {
      // Winter (Dec-Feb)
      0: ['rodents', 'cockroaches'],
      1: ['rodents', 'cockroaches'],
      2: ['rodents', 'termites'],
      // Spring (Mar-May)
      3: ['termites', 'ants', 'bed_bugs'],
      4: ['termites', 'ants', 'mosquitoes'],
      5: ['mosquitoes', 'ants', 'flies'],
      // Summer (Jun-Aug)
      6: ['mosquitoes', 'flies', 'cockroaches'],
      7: ['mosquitoes', 'cockroaches', 'bed_bugs'],
      8: ['cockroaches', 'bed_bugs', 'flies'],
      // Fall (Sep-Nov)
      9: ['rodents', 'cockroaches', 'spiders'],
      10: ['rodents', 'termites', 'cockroaches'],
      11: ['rodents', 'cockroaches']
    };

    const suggestions = seasonalPests[month] || ['general_pest_control'];

    // Add customer's frequent pests
    const frequentPests = Object.entries(pestFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([pest]) => pest);

    const uniqueSuggestions = [...new Set([...suggestions, ...frequentPests])];

    res.json({
      suggestions: uniqueSuggestions,
      confidence: 0.85,
      reasoning: 'Based on seasonal patterns and customer pest history'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// AI Service Recommendation
router.post('/service-recommendation', adminAuth, async (req, res) => {
  try {
    const { customerId, pestType, severity } = req.body;

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const recommendations = {
      serviceType: 'general_pest_control',
      frequency: 'one_time',
      estimatedDuration: '2-3 hours',
      chemicals: [],
      followUpDays: 7
    };

    // Based on pest type
    switch (pestType) {
      case 'termites':
        recommendations.serviceType = 'termite_treatment';
        recommendations.frequency = customer.amcContract.hasAMC ? 'quarterly' : 'one_time';
        recommendations.estimatedDuration = '4-6 hours';
        recommendations.chemicals = ['Termidor', 'Imidacloprid'];
        recommendations.followUpDays = 30;
        break;
      case 'bed_bugs':
        recommendations.serviceType = 'bed_bug_treatment';
        recommendations.frequency = 'multiple_sessions';
        recommendations.estimatedDuration = '3-4 hours';
        recommendations.chemicals = ['Pyrethroids', 'Neem oil'];
        recommendations.followUpDays = 14;
        break;
      case 'rodents':
        recommendations.serviceType = 'rodent_control';
        recommendations.frequency = 'monthly';
        recommendations.estimatedDuration = '1-2 hours';
        recommendations.chemicals = ['Rodenticides', 'Bait stations'];
        recommendations.followUpDays = 7;
        break;
      case 'mosquitoes':
        recommendations.serviceType = 'mosquito_control';
        recommendations.frequency = 'weekly';
        recommendations.estimatedDuration = '1 hour';
        recommendations.chemicals = ['Larvicides', 'Fogging chemicals'];
        recommendations.followUpDays = 7;
        break;
      case 'cockroaches':
        recommendations.serviceType = 'cockroach_control';
        recommendations.frequency = 'monthly';
        recommendations.estimatedDuration = '1-2 hours';
        recommendations.chemicals = ['Gel baits', 'Sprays'];
        recommendations.followUpDays = 14;
        break;
      default:
        recommendations.serviceType = 'general_pest_control';
        recommendations.frequency = 'one_time';
        recommendations.chemicals = ['General pesticides'];
    }

    // Adjust based on severity
    if (severity === 'severe') {
      recommendations.frequency = 'intensive';
      recommendations.estimatedDuration = 'Extended duration';
      recommendations.followUpDays = 3;
    }

    res.json({
      recommendation: recommendations,
      confidence: 0.82,
      factors: ['Pest type', 'Severity level', 'Customer history']
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// AI Follow-up Prediction
router.post('/followup-prediction', adminAuth, async (req, res) => {
  try {
    const { customerId, serviceType } = req.body;

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const services = await Service.find({ customer: customerId })
      .sort({ serviceDate: -1 })
      .limit(5);

    // Calculate average service interval
    let avgInterval = 30; // Default 30 days
    if (services.length > 1) {
      const intervals = [];
      for (let i = 0; i < services.length - 1; i++) {
        const diff = services[i].serviceDate - services[i + 1].serviceDate;
        intervals.push(diff / (1000 * 60 * 60 * 24)); // Convert to days
      }
      avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    }

    // Predict based on service type
    const followUpDays = {
      'termite_treatment': 90,
      'bed_bug_treatment': 14,
      'rodent_control': 30,
      'mosquito_control': 7,
      'cockroach_control': 30,
      'general_pest_control': 60
    };

    const predictedDays = followUpDays[serviceType] || Math.round(avgInterval);
    const nextFollowUpDate = new Date();
    nextFollowUpDate.setDate(nextFollowUpDate.getDate() + predictedDays);

    // Customer loyalty score
    const loyaltyScore = customer.totalSpent > 10000 ? 'high' : 
                        customer.totalSpent > 5000 ? 'medium' : 'low';

    res.json({
      predictedFollowUpDate: nextFollowUpDate,
      recommendedFollowUpDays: predictedDays,
      confidence: 0.78,
      loyaltyScore,
      factors: [
        'Service type patterns',
        'Customer service history',
        'Average service interval'
      ]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// AI Customer Risk Assessment
router.post('/risk-assessment', adminAuth, async (req, res) => {
  try {
    const { customerId } = req.body;

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const services = await Service.find({ customer: customerId });
    const invoices = await Invoice.find({ customer: customerId });

    // Calculate risk factors
    let riskScore = 0;
    const riskFactors = [];

    // Payment history
    const pendingInvoices = invoices.filter(inv => inv.paymentStatus === 'pending').length;
    if (pendingInvoices > 2) {
      riskScore += 30;
      riskFactors.push('Multiple pending payments');
    }

    // Complaint history
    if (customer.complaintHistory.length > 2) {
      riskScore += 20;
      riskFactors.push('High complaint rate');
    }

    // Service frequency
    if (services.length < 2 && customer.createdAt < new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)) {
      riskScore += 15;
      riskFactors.push('Low service frequency');
    }

    // AMC status
    if (!customer.amcContract.hasAMC) {
      riskScore += 10;
      riskFactors.push('No AMC contract');
    }

    const riskLevel = riskScore > 50 ? 'high' : riskScore > 25 ? 'medium' : 'low';

    res.json({
      riskLevel,
      riskScore,
      riskFactors,
      recommendations: riskLevel === 'high' ? 
        ['Follow up immediately', 'Offer AMC discount', 'Review service quality'] :
        riskLevel === 'medium' ?
        ['Schedule follow-up call', 'Send service reminder'] :
        ['Maintain regular contact', 'Send seasonal offers']
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
