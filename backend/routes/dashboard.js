const express = require('express');
const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');
const Service = require('../models/Service');
const Technician = require('../models/Technician');
const FollowUp = require('../models/FollowUp');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get dashboard statistics
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const totalCustomers = await Customer.countDocuments();
    const totalTechnicians = await Technician.countDocuments({ isActive: true });
    
    const invoices = await Invoice.find();
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const pendingPayments = invoices
      .filter(inv => inv.paymentStatus === 'pending')
      .reduce((sum, inv) => sum + (inv.totalAmount - inv.paidAmount), 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayBookings = await Service.countDocuments({
      serviceDate: { $gte: today, $lt: tomorrow }
    });

    const upcomingReminders = await FollowUp.countDocuments({
      reminderDate: { $gte: today },
      status: 'pending'
    });

    const activeServices = await Service.countDocuments({ status: 'in_progress' });
    const completedServices = await Service.countDocuments({ status: 'completed' });

    res.json({
      totalCustomers,
      totalTechnicians,
      totalRevenue,
      pendingPayments,
      todayBookings,
      upcomingReminders,
      activeServices,
      completedServices
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get recent activities
router.get('/recent-activities', adminAuth, async (req, res) => {
  try {
    const recentCustomers = await Customer.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email createdAt');

    const recentInvoices = await Invoice.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('customer', 'name')
      .select('invoiceNumber totalAmount paymentStatus createdAt');

    const recentServices = await Service.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('customer', 'name')
      .populate('technician', 'name')
      .select('serviceType serviceDate status');

    res.json({
      recentCustomers,
      recentInvoices,
      recentServices
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get revenue chart data
router.get('/revenue-chart', adminAuth, async (req, res) => {
  try {
    const months = [];
    const revenueData = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthName = date.toLocaleString('default', { month: 'short' });
      months.push(monthName);

      const invoices = await Invoice.find({
        createdAt: { $gte: monthStart, $lte: monthEnd }
      });

      const monthlyRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      revenueData.push(monthlyRevenue);
    }

    res.json({ months, revenue: revenueData });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get service distribution
router.get('/service-distribution', adminAuth, async (req, res) => {
  try {
    const services = await Service.find();
    const distribution = {};

    services.forEach(service => {
      const type = service.serviceType;
      distribution[type] = (distribution[type] || 0) + 1;
    });

    res.json(distribution);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get top customers by revenue
router.get('/top-customers', adminAuth, async (req, res) => {
  try {
    const customers = await Customer.find()
      .sort({ totalSpent: -1 })
      .limit(10)
      .select('name email phone totalSpent customerType');

    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get technician performance
router.get('/technician-performance', adminAuth, async (req, res) => {
  try {
    const technicians = await Technician.find({ isActive: true })
      .select('name employeeId completedServices rating')
      .sort({ completedServices: -1 });

    res.json(technicians);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
