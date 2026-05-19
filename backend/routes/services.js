const express = require('express');
const Service = require('../models/Service');
const Customer = require('../models/Customer');
const Technician = require('../models/Technician');
const { adminAuth, auth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Get all services
router.get('/', adminAuth, async (req, res) => {
  try {
    const services = await Service.find()
      .populate('customer', 'name email phone')
      .populate('technician', 'name employeeId')
      .sort({ serviceDate: -1 });
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single service
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('customer')
      .populate('technician');
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.json(service);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create service
router.post('/', adminAuth, async (req, res) => {
  try {
    const service = new Service(req.body);
    await service.save();

    // Update customer last service date
    const customer = await Customer.findById(service.customer);
    if (customer) {
      customer.lastServiceDate = service.serviceDate;
      await customer.save();
    }

    // Add to technician's assigned jobs
    const technician = await Technician.findById(service.technician);
    if (technician) {
      technician.assignedJobs.push(service._id);
      await technician.save();
    }

    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update service
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.json(service);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete service
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Upload before images
router.post('/:id/before-images', adminAuth, upload.array('images', 5), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const imagePaths = req.files.map(file => `/uploads/${file.filename}`);
    service.beforeImages = [...service.beforeImages, ...imagePaths];
    await service.save();

    res.json(service);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Upload after images
router.post('/:id/after-images', adminAuth, upload.array('images', 5), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const imagePaths = req.files.map(file => `/uploads/${file.filename}`);
    service.afterImages = [...service.afterImages, ...imagePaths];
    await service.save();

    res.json(service);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Complete service
router.patch('/:id/complete', adminAuth, async (req, res) => {
  try {
    const { customerRating, customerFeedback } = req.body;
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    service.status = 'completed';
    service.completionTime = new Date();
    service.customerRating = customerRating;
    service.customerFeedback = customerFeedback;
    await service.save();

    // Update technician completed services count
    const technician = await Technician.findById(service.technician);
    if (technician) {
      technician.completedServices += 1;
      await technician.save();
    }

    res.json(service);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get technician services (for technician portal)
router.get('/technician/my-services', auth, async (req, res) => {
  try {
    if (req.user.role !== 'technician') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const services = await Service.find({ technician: req.user.id })
      .populate('customer', 'name phone address')
      .sort({ serviceDate: -1 });
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get today's services
router.get('/date/today', adminAuth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const services = await Service.find({
      serviceDate: { $gte: today, $lt: tomorrow }
    })
      .populate('customer', 'name phone')
      .populate('technician', 'name')
      .sort('scheduledTime');

    res.json(services);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get customer services
router.get('/customer/:customerId', adminAuth, async (req, res) => {
  try {
    const services = await Service.find({ customer: req.params.customerId })
      .populate('technician', 'name')
      .sort({ serviceDate: -1 });
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
