const express = require('express');
const FollowUp = require('../models/FollowUp');
const Customer = require('../models/Customer');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get all follow-ups
router.get('/', adminAuth, async (req, res) => {
  try {
    const followUps = await FollowUp.find()
      .populate('customer', 'name email phone')
      .populate('service')
      .sort({ reminderDate: -1 });
    res.json(followUps);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single follow-up
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const followUp = await FollowUp.findById(req.params.id)
      .populate('customer')
      .populate('service');
    if (!followUp) {
      return res.status(404).json({ message: 'Follow-up not found' });
    }
    res.json(followUp);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create follow-up
router.post('/', adminAuth, async (req, res) => {
  try {
    const followUp = new FollowUp(req.body);
    await followUp.save();

    // Update customer next follow-up date
    const customer = await Customer.findById(followUp.customer);
    if (customer) {
      customer.nextFollowUpDate = followUp.reminderDate;
      await customer.save();
    }

    res.status(201).json(followUp);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update follow-up
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const followUp = await FollowUp.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!followUp) {
      return res.status(404).json({ message: 'Follow-up not found' });
    }
    res.json(followUp);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete follow-up
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const followUp = await FollowUp.findByIdAndDelete(req.params.id);
    if (!followUp) {
      return res.status(404).json({ message: 'Follow-up not found' });
    }
    res.json({ message: 'Follow-up deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark follow-up as sent
router.patch('/:id/sent', adminAuth, async (req, res) => {
  try {
    const followUp = await FollowUp.findById(req.params.id);
    if (!followUp) {
      return res.status(404).json({ message: 'Follow-up not found' });
    }
    followUp.status = 'sent';
    followUp.sentDate = new Date();
    await followUp.save();
    res.json(followUp);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark follow-up as completed
router.patch('/:id/complete', adminAuth, async (req, res) => {
  try {
    const followUp = await FollowUp.findById(req.params.id);
    if (!followUp) {
      return res.status(404).json({ message: 'Follow-up not found' });
    }
    followUp.status = 'completed';
    followUp.completedDate = new Date();
    await followUp.save();
    res.json(followUp);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get upcoming reminders
router.get('/upcoming', adminAuth, async (req, res) => {
  try {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const followUps = await FollowUp.find({
      reminderDate: { $gte: today, $lte: nextWeek },
      status: 'pending'
    })
      .populate('customer', 'name email phone')
      .sort({ reminderDate: 1 });

    res.json(followUps);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get overdue reminders
router.get('/overdue', adminAuth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const followUps = await FollowUp.find({
      reminderDate: { $lt: today },
      status: 'pending'
    })
      .populate('customer', 'name email phone')
      .sort({ reminderDate: 1 });

    res.json(followUps);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get customer follow-ups
router.get('/customer/:customerId', adminAuth, async (req, res) => {
  try {
    const followUps = await FollowUp.find({ customer: req.params.customerId })
      .sort({ reminderDate: -1 });
    res.json(followUps);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
