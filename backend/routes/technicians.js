const express = require('express');
const Technician = require('../models/Technician');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get all technicians
router.get('/', adminAuth, async (req, res) => {
  try {
    const technicians = await Technician.find()
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(technicians);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single technician
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const technician = await Technician.findById(req.params.id)
      .select('-password')
      .populate('assignedJobs');
    if (!technician) {
      return res.status(404).json({ message: 'Technician not found' });
    }
    res.json(technician);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create technician
router.post('/', adminAuth, async (req, res) => {
  try {
    const technician = new Technician(req.body);
    await technician.save();
    const technicianResponse = technician.toObject();
    delete technicianResponse.password;
    res.status(201).json(technicianResponse);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update technician
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const technician = await Technician.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!technician) {
      return res.status(404).json({ message: 'Technician not found' });
    }
    res.json(technician);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete technician
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const technician = await Technician.findByIdAndDelete(req.params.id);
    if (!technician) {
      return res.status(404).json({ message: 'Technician not found' });
    }
    res.json({ message: 'Technician deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update technician status (activate/deactivate)
router.patch('/:id/status', adminAuth, async (req, res) => {
  try {
    const { isActive } = req.body;
    const technician = await Technician.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password');
    
    if (!technician) {
      return res.status(404).json({ message: 'Technician not found' });
    }
    res.json(technician);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add daily performance
router.post('/:id/performance', adminAuth, async (req, res) => {
  try {
    const technician = await Technician.findById(req.params.id);
    if (!technician) {
      return res.status(404).json({ message: 'Technician not found' });
    }
    technician.dailyPerformance.push(req.body);
    await technician.save();
    res.json(technician);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get technician performance stats
router.get('/:id/stats', adminAuth, async (req, res) => {
  try {
    const technician = await Technician.findById(req.params.id)
      .select('-password')
      .populate('assignedJobs');
    
    if (!technician) {
      return res.status(404).json({ message: 'Technician not found' });
    }

    const assignedJobs = technician.assignedJobs || [];
    const completedJobs = assignedJobs.filter(job => job.status === 'completed').length;
    const pendingJobs = assignedJobs.filter(job => job.status === 'scheduled').length;

    res.json({
      technician: {
        id: technician._id,
        name: technician.name,
        employeeId: technician.employeeId,
        rating: technician.rating,
        completedServices: technician.completedServices
      },
      stats: {
        totalAssigned: assignedJobs.length,
        completed: completedJobs,
        pending: pendingJobs,
        performanceHistory: technician.dailyPerformance
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
