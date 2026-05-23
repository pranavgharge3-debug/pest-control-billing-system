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

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${invoice.invoiceNumber}.pdf`);
    doc.pipe(res);

    // Print-friendly black/gray colors
    const black = '#000000';
    const darkGray = '#333333';
    const mediumGray = '#666666';
    const lightGray = '#999999';

    const left = 30;
    const right = 565;
    const width = right - left;

    // ============================================
    // OUTER BORDER
    // ============================================
    doc.strokeColor(black).lineWidth(2).rect(left, 30, width, 770).stroke();

    // ============================================
    // HEADER - PROFORMA INVOICE TITLE
    // ============================================
    doc.fontSize(22).fillColor(black).font('Helvetica-Bold').text('PROFORMA INVOICE', left, 45, { width: width, align: 'center' });
    doc.fontSize(10).fillColor(mediumGray).font('Helvetica').text('Credit Sales', left, 72, { width: width, align: 'center' });

    // Header divider
    doc.strokeColor(black).lineWidth(1).moveTo(left, 85).lineTo(right, 85).stroke();

    // ============================================
    // COMPANY DETAILS (LEFT SIDE)
    // ============================================
    const companyY = 95;
    doc.fontSize(11).fillColor(black).font('Helvetica-Bold').text('PEST CONTROL SERVICES', left, companyY);
    doc.fontSize(8).fillColor(darkGray).font('Helvetica');
    doc.text('123 Business Street, City - 123456', left, companyY + 15);
    doc.text('Email: support@pestcontrol.com', left, companyY + 27);
    doc.text('Phone: +91 98765 43210', left, companyY + 39);
    doc.text('GSTIN: 29ABCDE1234F1Z5', left, companyY + 51);

    // ============================================
    // INVOICE DETAILS BOX (RIGHT SIDE)
    // ============================================
    const detailsBoxX = 320;
    const detailsBoxY = 95;
    const detailsBoxWidth = 245;
    const detailsBoxHeight = 70;

    doc.strokeColor(black).lineWidth(1).rect(detailsBoxX, detailsBoxY, detailsBoxWidth, detailsBoxHeight).stroke();

    doc.fontSize(8).fillColor(black).font('Helvetica-Bold');
    doc.text('Invoice No:', detailsBoxX + 5, detailsBoxY + 8);
    doc.text('Date:', detailsBoxX + 5, detailsBoxY + 20);
    doc.text('Payment Mode:', detailsBoxX + 5, detailsBoxY + 32);
    doc.text('Delivery Note:', detailsBoxX + 5, detailsBoxY + 44);
    doc.text('Reference No:', detailsBoxX + 5, detailsBoxY + 56);

    doc.fontSize(8).fillColor(darkGray).font('Helvetica');
    doc.text(invoice.invoiceNumber, detailsBoxX + 80, detailsBoxY + 8);
    doc.text(new Date(invoice.createdAt).toLocaleDateString(), detailsBoxX + 80, detailsBoxY + 20);
    doc.text(invoice.paymentMethod ? invoice.paymentMethod.replace(/_/g, ' ').toUpperCase() : 'N/A', detailsBoxX + 80, detailsBoxY + 32);
    doc.text('N/A', detailsBoxX + 80, detailsBoxY + 44);
    doc.text('N/A', detailsBoxX + 80, detailsBoxY + 56);

    // ============================================
    // BILL TO SECTION
    // ============================================
    const billToY = 175;
    doc.strokeColor(black).lineWidth(1).rect(left, billToY, width, 60).stroke();
    
    doc.fontSize(9).fillColor(black).font('Helvetica-Bold').text('BILL TO', left + 5, billToY + 5);
    
    doc.fontSize(8).fillColor(darkGray).font('Helvetica');
    doc.text(`${invoice.customer.name}`, left + 5, billToY + 18);
    
    if (invoice.customer.address) {
      const address = `${invoice.customer.address.street || ''}${invoice.customer.address.street ? ', ' : ''}${invoice.customer.address.city || ''}${invoice.customer.address.city ? ', ' : ''}${invoice.customer.address.state || ''} ${invoice.customer.address.zipCode || ''}`;
      doc.text(address, left + 5, billToY + 30);
    }
    
    doc.text(invoice.customer.email, left + 5, billToY + 42);
    doc.text(invoice.customer.phone, left + 5, billToY + 52);

    // ============================================
    // SHIP TO SECTION
    // ============================================
    const shipToY = 240;
    doc.strokeColor(black).lineWidth(1).rect(left, shipToY, width, 60).stroke();
    
    doc.fontSize(9).fillColor(black).font('Helvetica-Bold').text('SHIP TO', left + 5, shipToY + 5);
    
    doc.fontSize(8).fillColor(darkGray).font('Helvetica');
    if (invoice.customer.address) {
      const address = `${invoice.customer.address.street || ''}${invoice.customer.address.street ? ', ' : ''}${invoice.customer.address.city || ''}${invoice.customer.address.city ? ', ' : ''}${invoice.customer.address.state || ''} ${invoice.customer.address.zipCode || ''}`;
      doc.text(address, left + 5, shipToY + 18);
    } else {
      doc.text('Same as Bill To Address', left + 5, shipToY + 18);
    }

    // ============================================
    // ITEMS TABLE
    // ============================================
    const tableY = 305;
    const tableHeight = 200;
    const colWidths = [40, 200, 50, 60, 40, 115];
    const colX = [left, left + 40, left + 240, left + 290, left + 350, left + 410];
    const rowHeight = 22;

    // Table outer border
    doc.strokeColor(black).lineWidth(1.5).rect(left, tableY, width, tableHeight).stroke();

    // Table header
    doc.fillColor('#f0f0f0').rect(left + 1, tableY + 1, width - 2, rowHeight - 2).fill();
    
    doc.fontSize(8).fillColor(black).font('Helvetica-Bold');
    doc.text('Sr No', colX[0] + 5, tableY + 7);
    doc.text('Description', colX[1] + 5, tableY + 7);
    doc.text('Qty', colX[2] + 5, tableY + 7);
    doc.text('Rate', colX[3] + 5, tableY + 7);
    doc.text('Per', colX[4] + 5, tableY + 7);
    doc.text('Amount', colX[5] + 5, tableY + 7);

    // Table rows
    doc.font('Helvetica').fontSize(8);
    let currentY = tableY + rowHeight;
    let srNo = 1;
    let maxRows = 8;

    if (invoice.items && invoice.items.length > 0) {
      invoice.items.forEach((item, index) => {
        if (index < maxRows) {
          // Row border
          doc.strokeColor(lightGray).lineWidth(0.5).rect(left + 1, currentY, width - 2, rowHeight).stroke();
          
          // Row text
          doc.fillColor(darkGray);
          doc.text(srNo.toString(), colX[0] + 5, currentY + 7);
          doc.text(item.description, colX[1] + 5, currentY + 7, { width: 190 });
          doc.text(item.quantity.toString(), colX[2] + 5, currentY + 7);
          doc.text(item.rate.toLocaleString(), colX[3] + 5, currentY + 7);
          doc.text('Nos', colX[4] + 5, currentY + 7);
          doc.text(item.amount.toLocaleString(), colX[5] + 5, currentY + 7);
          
          currentY += rowHeight;
          srNo++;
        }
      });
    } else {
      // If no items, show service info
      doc.strokeColor(lightGray).lineWidth(0.5).rect(left + 1, currentY, width - 2, rowHeight).stroke();
      doc.fillColor(darkGray);
      doc.text('1', colX[0] + 5, currentY + 7);
      doc.text(invoice.service?.serviceType || 'General Service', colX[1] + 5, currentY + 7, { width: 190 });
      doc.text('1', colX[2] + 5, currentY + 7);
      doc.text(invoice.subtotal.toLocaleString(), colX[3] + 5, currentY + 7);
      doc.text('Nos', colX[4] + 5, currentY + 7);
      doc.text(invoice.subtotal.toLocaleString(), colX[5] + 5, currentY + 7);
      currentY += rowHeight;
    }

    // Fill remaining rows with borders
    while (srNo <= maxRows) {
      doc.strokeColor(lightGray).lineWidth(0.5).rect(left + 1, currentY, width - 2, rowHeight).stroke();
      currentY += rowHeight;
      srNo++;
    }

    // ============================================
    // SUMMARY ROWS
    // ============================================
    const summaryY = tableY + tableHeight - rowHeight * 3;
    
    // Subtotal row
    doc.strokeColor(black).lineWidth(1).moveTo(left, summaryY).lineTo(right, summaryY).stroke();
    doc.fontSize(9).fillColor(black).font('Helvetica-Bold').text('Subtotal:', colX[4] + 5, summaryY + 7);
    doc.text(`₹${invoice.subtotal.toLocaleString()}`, colX[5] + 5, summaryY + 7);
    
    // GST row
    doc.strokeColor(lightGray).lineWidth(0.5).moveTo(left, summaryY + rowHeight).lineTo(right, summaryY + rowHeight).stroke();
    doc.fontSize(9).fillColor(black).font('Helvetica').text(`GST (${invoice.gstPercentage}%):`, colX[4] + 5, summaryY + rowHeight + 7);
    doc.text(`₹${invoice.gstAmount.toLocaleString()}`, colX[5] + 5, summaryY + rowHeight + 7);
    
    // Grand Total row
    doc.strokeColor(black).lineWidth(1.5).moveTo(left, summaryY + rowHeight * 2).lineTo(right, summaryY + rowHeight * 2).stroke();
    doc.fontSize(10).fillColor(black).font('Helvetica-Bold').text('GRAND TOTAL:', colX[4] + 5, summaryY + rowHeight * 2 + 7);
    doc.text(`₹${invoice.totalAmount.toLocaleString()}`, colX[5] + 5, summaryY + rowHeight * 2 + 7);

    // ============================================
    // AMOUNT IN WORDS
    // ============================================
    const amountWordsY = 515;
    doc.strokeColor(black).lineWidth(1).rect(left, amountWordsY, width, 25).stroke();
    doc.fontSize(8).fillColor(black).font('Helvetica-Bold').text('Amount in Words:', left + 5, amountWordsY + 8);
    doc.fontSize(8).fillColor(darkGray).font('Helvetica').text(`Rupees ${invoice.totalAmount.toLocaleString()} Only`, left + 100, amountWordsY + 8);

    // ============================================
    // BANK DETAILS
    // ============================================
    const bankY = 545;
    doc.strokeColor(black).lineWidth(1).rect(left, bankY, width, 50).stroke();
    
    doc.fontSize(9).fillColor(black).font('Helvetica-Bold').text('BANK DETAILS', left + 5, bankY + 5);
    
    doc.fontSize(8).fillColor(darkGray).font('Helvetica');
    doc.text('Bank Name: State Bank of India', left + 5, bankY + 18);
    doc.text('Account No: 1234567890123456', left + 5, bankY + 30);
    doc.text('IFSC Code: SBIN0001234', left + 200, bankY + 18);
    doc.text('Branch: Main Branch', left + 200, bankY + 30);

    // ============================================
    // DECLARATION
    // ============================================
    const declY = 600;
    doc.strokeColor(black).lineWidth(1).rect(left, declY, width, 35).stroke();
    
    doc.fontSize(8).fillColor(black).font('Helvetica-Bold').text('DECLARATION', left + 5, declY + 5);
    doc.fontSize(7).fillColor(darkGray).font('Helvetica').text('We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.', left + 5, declY + 18);

    // ============================================
    // AUTHORIZED SIGNATURE
    // ============================================
    const sigY = 640;
    doc.strokeColor(black).lineWidth(1).rect(left, sigY, width, 45).stroke();
    
    doc.fontSize(8).fillColor(black).font('Helvetica-Bold').text('For PEST CONTROL SERVICES', left + 5, sigY + 8);
    doc.fontSize(7).fillColor(mediumGray).font('Helvetica').text('Authorized Signatory', right - 120, sigY + 8);
    
    // Signature line
    doc.strokeColor(black).lineWidth(0.5).moveTo(right - 120, sigY + 35).lineTo(right - 20, sigY + 35).stroke();

    // ============================================
    // FOOTER
    // ============================================
    const footerY = 690;
    doc.strokeColor(lightGray).lineWidth(1).moveTo(left, footerY).lineTo(right, footerY).stroke();
    
    doc.fontSize(8).fillColor(mediumGray).font('Helvetica').text('This is a Computer Generated Invoice', left, footerY + 10, { width: width, align: 'center' });
    doc.fontSize(7).fillColor(mediumGray).text('Subject to local jurisdiction', left, footerY + 22, { width: width, align: 'center' });

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
