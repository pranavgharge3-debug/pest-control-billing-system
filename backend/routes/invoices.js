const express = require('express');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const PDFDocument = require('pdfkit');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

// Generate auto invoice number
const generateInvoiceNumber = async () => {
  const lastInvoice = await Invoice.findOne().sort({ createdAt: -1 });
  if (!lastInvoice) {
    return 'INV-001';
  }
  const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[1]);
  const newNumber = (lastNumber + 1).toString().padStart(3, '0');
  return `INV-${newNumber}`;
};

// Get all invoices
router.get('/', adminAuth, async (req, res) => {
  try {
    const invoices = await Invoice.find()
      .populate('customer', 'name email phone')
      .populate('service')
      .sort({ createdAt: -1 });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single invoice
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customer')
      .populate('service');
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create invoice
router.post('/', adminAuth, async (req, res) => {
  try {
    const invoiceNumber = await generateInvoiceNumber();
    
    const { subtotal, gstPercentage } = req.body;
    const gstAmount = (subtotal * gstPercentage) / 100;
    const totalAmount = subtotal + gstAmount;

    const invoice = new Invoice({
      ...req.body,
      invoiceNumber,
      gstAmount,
      totalAmount
    });

    await invoice.save();

    // Update customer total spent
    const customer = await Customer.findById(invoice.customer);
    if (customer) {
      customer.totalSpent += totalAmount;
      await customer.save();
    }

    res.status(201).json(invoice);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update invoice
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete invoice
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update payment status
router.patch('/:id/payment', adminAuth, async (req, res) => {
  try {
    const { paymentStatus, paidAmount, paymentMethod } = req.body;
    const invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    invoice.paymentStatus = paymentStatus;
    invoice.paidAmount = paidAmount || invoice.paidAmount;
    invoice.paymentMethod = paymentMethod || invoice.paymentMethod;
    
    if (paymentStatus === 'paid') {
      invoice.paidDate = new Date();
    }

    await invoice.save();
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Generate PDF invoice
router.get('/:id/pdf', adminAuth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customer')
      .populate('service');

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${invoice.invoiceNumber}.pdf`);
    doc.pipe(res);

    // PDF Content
    doc.fontSize(20).text('PEST CONTROL SERVICES', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Invoice: ${invoice.invoiceNumber}`, { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(12).text(`Customer: ${invoice.customer.name}`);
    doc.text(`Email: ${invoice.customer.email}`);
    doc.text(`Phone: ${invoice.customer.phone}`);
    doc.text(`Address: ${invoice.customer.address.street}, ${invoice.customer.address.city}`);
    doc.moveDown();

    doc.text('Items:', { underline: true });
    invoice.items.forEach((item, index) => {
      doc.text(`${index + 1}. ${item.description} - Qty: ${item.quantity} x ₹${item.rate} = ₹${item.amount}`);
    });
    doc.moveDown();

    doc.text(`Subtotal: ₹${invoice.subtotal}`);
    doc.text(`GST (${invoice.gstPercentage}%): ₹${invoice.gstAmount}`);
    doc.fontSize(14).text(`Total: ₹${invoice.totalAmount}`, { bold: true });
    doc.moveDown();

    doc.text(`Payment Status: ${invoice.paymentStatus.toUpperCase()}`);
    doc.text(`Payment Method: ${invoice.paymentMethod}`);
    if (invoice.paidDate) {
      doc.text(`Paid Date: ${invoice.paidDate.toLocaleDateString()}`);
    }

    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get pending invoices
router.get('/status/pending', adminAuth, async (req, res) => {
  try {
    const invoices = await Invoice.find({ paymentStatus: 'pending' })
      .populate('customer', 'name email phone')
      .sort({ dueDate: 1 });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get customer invoices
router.get('/customer/:customerId', adminAuth, async (req, res) => {
  try {
    const invoices = await Invoice.find({ customer: req.params.customerId })
      .sort({ createdAt: -1 });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
