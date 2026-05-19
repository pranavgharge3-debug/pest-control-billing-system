const express = require('express');
const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get all payments
router.get('/', adminAuth, async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('invoice', 'invoiceNumber totalAmount')
      .populate('customer', 'name email phone')
      .sort({ paymentDate: -1 });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single payment
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('invoice')
      .populate('customer');
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create payment
router.post('/', adminAuth, async (req, res) => {
  try {
    const payment = new Payment(req.body);
    await payment.save();

    // Update invoice payment status
    const invoice = await Invoice.findById(payment.invoice);
    if (invoice) {
      invoice.paidAmount += payment.amount;
      
      if (invoice.paidAmount >= invoice.totalAmount) {
        invoice.paymentStatus = 'paid';
      } else if (invoice.paidAmount > 0) {
        invoice.paymentStatus = 'partial';
      }
      
      await invoice.save();
    }

    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update payment
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete payment
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get customer payments
router.get('/customer/:customerId', adminAuth, async (req, res) => {
  try {
    const payments = await Payment.find({ customer: req.params.customerId })
      .populate('invoice', 'invoiceNumber')
      .sort({ paymentDate: -1 });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get payment statistics
router.get('/stats/summary', adminAuth, async (req, res) => {
  try {
    const payments = await Payment.find({ status: 'completed' });
    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayPayments = await Payment.find({
      paymentDate: { $gte: today, $lt: tomorrow },
      status: 'completed'
    });
    const todayCollected = todayPayments.reduce((sum, p) => sum + p.amount, 0);

    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthPayments = await Payment.find({
      paymentDate: { $gte: thisMonth },
      status: 'completed'
    });
    const monthCollected = monthPayments.reduce((sum, p) => sum + p.amount, 0);

    res.json({
      totalCollected,
      todayCollected,
      monthCollected,
      totalTransactions: payments.length,
      todayTransactions: todayPayments.length,
      monthTransactions: monthPayments.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
