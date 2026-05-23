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

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${invoice.invoiceNumber}.pdf`);
    doc.pipe(res);

    // Professional black/gray print style
    const blackColor = '#000000';
    const darkGray = '#333333';
    const mediumGray = '#666666';
    const lightGray = '#cccccc';
    const veryLightGray = '#f5f5f5';

    // ============================================
    // HEADER - Company Details Box
    // ============================================
    const headerTop = 40;
    const headerLeft = 40;
    const headerRight = 555;
    
    // Company box border
    doc.strokeColor(blackColor).lineWidth(1.5).rect(headerLeft, headerTop, headerRight - headerLeft, 70).stroke();
    
    // Company title
    doc.fontSize(18).fillColor(blackColor).font('Helvetica-Bold').text('PEST CONTROL SERVICES', headerLeft + 10, headerTop + 10);
    doc.fontSize(10).fillColor(mediumGray).font('Helvetica').text('Professional Pest Management Solutions', headerLeft + 10, headerTop + 35);
    doc.fontSize(9).fillColor(mediumGray).text('Email: support@pestcontrol.com | Phone: +91 98765 43210', headerLeft + 10, headerTop + 50);

    // ============================================
    // INVOICE DETAILS BOX
    // ============================================
    const invoiceBoxTop = headerTop + 80;
    
    // Invoice box border
    doc.strokeColor(blackColor).lineWidth(1).rect(headerLeft, invoiceBoxTop, headerRight - headerLeft, 50).stroke();
    
    // Invoice details
    doc.fontSize(11).fillColor(blackColor).font('Helvetica-Bold').text('INVOICE DETAILS', headerLeft + 10, invoiceBoxTop + 8);
    
    doc.fontSize(9).fillColor(darkGray).font('Helvetica');
    doc.text(`Invoice No: ${invoice.invoiceNumber}`, headerLeft + 10, invoiceBoxTop + 25);
    doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, headerLeft + 150, invoiceBoxTop + 25);
    doc.text(`Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}`, headerLeft + 280, invoiceBoxTop + 25);

    // ============================================
    // CUSTOMER DETAILS BOX
    // ============================================
    const customerBoxTop = invoiceBoxTop + 60;
    
    // Customer box border
    doc.strokeColor(blackColor).lineWidth(1).rect(headerLeft, customerBoxTop, headerRight - headerLeft, 70).stroke();
    
    // Customer details
    doc.fontSize(11).fillColor(blackColor).font('Helvetica-Bold').text('BILL TO', headerLeft + 10, customerBoxTop + 8);
    
    doc.fontSize(9).fillColor(darkGray).font('Helvetica');
    doc.text(`Customer Name: ${invoice.customer.name}`, headerLeft + 10, customerBoxTop + 25);
    doc.text(`Email: ${invoice.customer.email}`, headerLeft + 10, customerBoxTop + 40);
    doc.text(`Phone: ${invoice.customer.phone}`, headerLeft + 10, customerBoxTop + 55);
    
    if (invoice.customer.address) {
      const address = `${invoice.customer.address.street || ''}${invoice.customer.address.street ? ', ' : ''}${invoice.customer.address.city || ''}${invoice.customer.address.city ? ', ' : ''}${invoice.customer.address.state || ''} ${invoice.customer.address.zipCode || ''}`;
      doc.text(`Address: ${address}`, headerLeft + 250, customerBoxTop + 25);
    }

    // ============================================
    // PAYMENT DETAILS BOX
    // ============================================
    const paymentBoxTop = customerBoxTop + 80;
    
    // Payment box border
    doc.strokeColor(blackColor).lineWidth(1).rect(headerLeft, paymentBoxTop, headerRight - headerLeft, 40).stroke();
    
    // Payment details
    doc.fontSize(11).fillColor(blackColor).font('Helvetica-Bold').text('PAYMENT DETAILS', headerLeft + 10, paymentBoxTop + 8);
    
    doc.fontSize(9).fillColor(darkGray).font('Helvetica');
    doc.text(`Payment Status: ${invoice.paymentStatus.toUpperCase()}`, headerLeft + 10, paymentBoxTop + 25);
    doc.text(`Payment Method: ${invoice.paymentMethod ? invoice.paymentMethod.replace(/_/g, ' ').toUpperCase() : 'N/A'}`, headerLeft + 180, paymentBoxTop + 25);
    
    if (invoice.paidDate) {
      doc.text(`Paid Date: ${new Date(invoice.paidDate).toLocaleDateString()}`, headerLeft + 380, paymentBoxTop + 25);
    }

    // ============================================
    // INVOICE ITEMS TABLE
    // ============================================
    const tableTop = paymentBoxTop + 50;
    const tableLeft = 40;
    const tableRight = 555;
    const rowHeight = 25;

    // Table header
    doc.strokeColor(blackColor).lineWidth(1.5).rect(tableLeft, tableTop, tableRight - tableLeft, rowHeight).stroke();
    
    // Header background
    doc.fillColor(veryLightGray).rect(tableLeft + 1, tableTop + 1, tableRight - tableLeft - 2, rowHeight - 2).fill();
    
    // Header text
    doc.fontSize(10).fillColor(blackColor).font('Helvetica-Bold');
    doc.text('S.No', tableLeft + 8, tableTop + 8);
    doc.text('Description', tableLeft + 50, tableTop + 8);
    doc.text('Qty', tableLeft + 280, tableTop + 8);
    doc.text('Rate (₹)', tableLeft + 340, tableTop + 8);
    doc.text('Amount (₹)', tableRight - 80, tableTop + 8, { width: 70, align: 'right' });

    // Table rows
    doc.font('Helvetica').fontSize(9);
    let currentY = tableTop + rowHeight;
    let serialNo = 1;
    
    if (invoice.items && invoice.items.length > 0) {
      invoice.items.forEach((item, index) => {
        // Row border
        doc.strokeColor(lightGray).lineWidth(0.5).rect(tableLeft, currentY, tableRight - tableLeft, rowHeight).stroke();
        
        // Row text
        doc.fillColor(darkGray);
        doc.text(serialNo.toString(), tableLeft + 8, currentY + 8);
        doc.text(item.description, tableLeft + 50, currentY + 8, { width: 220 });
        doc.text(item.quantity.toString(), tableLeft + 280, currentY + 8);
        doc.text(item.rate.toLocaleString(), tableLeft + 340, currentY + 8);
        doc.text(item.amount.toLocaleString(), tableRight - 80, currentY + 8, { width: 70, align: 'right' });
        
        currentY += rowHeight;
        serialNo++;
      });
    } else {
      // If no items, show service info
      doc.strokeColor(lightGray).lineWidth(0.5).rect(tableLeft, currentY, tableRight - tableLeft, rowHeight).stroke();
      doc.fillColor(darkGray);
      doc.text('1', tableLeft + 8, currentY + 8);
      doc.text(invoice.service?.serviceType || 'General Service', tableLeft + 50, currentY + 8, { width: 220 });
      doc.text('1', tableLeft + 280, currentY + 8);
      doc.text(invoice.subtotal.toLocaleString(), tableLeft + 340, currentY + 8);
      doc.text(invoice.subtotal.toLocaleString(), tableRight - 80, currentY + 8, { width: 70, align: 'right' });
      currentY += rowHeight;
    }

    // Table bottom border
    doc.strokeColor(blackColor).lineWidth(1.5).moveTo(tableLeft, currentY).lineTo(tableRight, currentY).stroke();
    currentY += 10;

    // ============================================
    // SUMMARY SECTION
    // ============================================
    const summaryY = currentY;
    const summaryX = 380;
    
    // Summary box
    doc.strokeColor(blackColor).lineWidth(1).rect(summaryX - 10, summaryY, 185, 90).stroke();
    
    doc.fontSize(9).fillColor(darkGray).font('Helvetica');
    doc.text(`Subtotal:`, summaryX, summaryY + 10);
    doc.text(`₹${invoice.subtotal.toLocaleString()}`, summaryX + 100, summaryY + 10, { width: 60, align: 'right' });
    
    doc.text(`GST (${invoice.gstPercentage}%):`, summaryX, summaryY + 30);
    doc.text(`₹${invoice.gstAmount.toLocaleString()}`, summaryX + 100, summaryY + 30, { width: 60, align: 'right' });
    
    // Total line
    doc.strokeColor(blackColor).lineWidth(1).moveTo(summaryX - 10, summaryY + 50).lineTo(summaryX + 175, summaryY + 50).stroke();
    
    doc.fontSize(11).fillColor(blackColor).font('Helvetica-Bold');
    doc.text(`TOTAL:`, summaryX, summaryY + 60);
    doc.text(`₹${invoice.totalAmount.toLocaleString()}`, summaryX + 100, summaryY + 60, { width: 60, align: 'right' });

    // ============================================
    // DECLARATION SECTION
    // ============================================
    const declarationY = summaryY + 100;
    
    // Declaration box
    doc.strokeColor(blackColor).lineWidth(1).rect(tableLeft, declarationY, tableRight - tableLeft, 40).stroke();
    
    doc.fontSize(9).fillColor(blackColor).font('Helvetica-Bold').text('DECLARATION', tableLeft + 10, declarationY + 8);
    doc.fontSize(8).fillColor(darkGray).font('Helvetica').text('We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.', tableLeft + 10, declarationY + 22);

    // ============================================
    // AUTHORIZED SIGNATURE SECTION
    // ============================================
    const signatureY = declarationY + 50;
    
    // Signature box
    doc.strokeColor(blackColor).lineWidth(1).rect(tableLeft, signatureY, tableRight - tableLeft, 50).stroke();
    
    doc.fontSize(9).fillColor(blackColor).font('Helvetica-Bold').text('AUTHORIZED SIGNATURE', tableLeft + 10, signatureY + 8);
    doc.fontSize(8).fillColor(mediumGray).font('Helvetica').text('For PEST CONTROL SERVICES', tableLeft + 10, signatureY + 25);
    doc.text('Authorized Signatory', tableRight - 120, signatureY + 25);
    
    // Signature line
    doc.strokeColor(blackColor).lineWidth(0.5).moveTo(tableRight - 120, signatureY + 40).lineTo(tableRight - 20, signatureY + 40).stroke();

    // ============================================
    // FOOTER
    // ============================================
    const footerY = signatureY + 60;
    
    doc.strokeColor(lightGray).lineWidth(1).moveTo(tableLeft, footerY).lineTo(tableRight, footerY).stroke();
    
    doc.fontSize(9).fillColor(mediumGray).font('Helvetica').text('Computer Generated Invoice - This is a system generated document and does not require manual signature.', tableLeft, footerY + 10, { align: 'center', width: tableRight - tableLeft });
    doc.fontSize(8).fillColor(mediumGray).text('Thank you for your business!', tableLeft, footerY + 25, { align: 'center', width: tableRight - tableLeft });

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
