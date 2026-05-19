const express = require('express');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Technician = require('../models/Technician');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Admin Registration
router.post('/admin/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    const admin = new Admin({ name, email, password });
    await admin.save();

    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.status(201).json({
      message: 'Admin registered successfully',
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin Login
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.json({
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Technician Registration
router.post('/technician/register', async (req, res) => {
  try {
    const { name, email, phone, password, employeeId, specialization, experience } = req.body;

    const existingTechnician = await Technician.findOne({ email });
    if (existingTechnician) {
      return res.status(400).json({ message: 'Technician already exists' });
    }

    const existingEmployeeId = await Technician.findOne({ employeeId });
    if (existingEmployeeId) {
      return res.status(400).json({ message: 'Employee ID already exists' });
    }

    const technician = new Technician({
      name,
      email,
      phone,
      password,
      employeeId,
      specialization: specialization || [],
      experience: experience || 0
    });

    await technician.save();

    const token = jwt.sign(
      { id: technician._id, email: technician.email, role: 'technician' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.status(201).json({
      message: 'Technician registered successfully',
      token,
      technician: {
        id: technician._id,
        name: technician.name,
        email: technician.email,
        employeeId: technician.employeeId,
        role: 'technician'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Technician Login
router.post('/technician/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const technician = await Technician.findOne({ email });
    if (!technician) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await technician.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!technician.isActive) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    const token = jwt.sign(
      { id: technician._id, email: technician.email, role: 'technician' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.json({
      message: 'Login successful',
      token,
      technician: {
        id: technician._id,
        name: technician.name,
        email: technician.email,
        employeeId: technician.employeeId,
        role: 'technician'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get Current User
router.get('/me', auth, async (req, res) => {
  try {
    let user;
    if (req.user.role === 'admin') {
      user = await Admin.findById(req.user.id).select('-password');
    } else {
      user = await Technician.findById(req.user.id).select('-password');
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user, role: req.user.role });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
