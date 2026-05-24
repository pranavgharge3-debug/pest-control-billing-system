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

const COMPANY = {
  name: 'PEST CONTROL SERVICES',
  address: '123 Business Street, City - 123456',
  email: 'support@pestcontrol.com',
  phone: '+91 98765 43210',
  gstin: '29ABCDE1234F1Z5',
  pan: 'ABCDE1234F',
  state: 'Karnataka',
  stateCode: '29',
  bank: {
    name: 'State Bank of India',
    account: '1234567890123456',
    ifsc: 'SBIN0001234',
    branch: 'Main Branch'
  }
};

const formatIndianDate = (date) => {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const formatAddress = (address) => {
  if (!address) return '';
  return [address.street, address.city, address.state, address.zipCode].filter(Boolean).join(', ');
};

const formatPaymentMethod = (method) => {
  if (!method) return '';
  return method.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatCurrency = (amount) => {
  const value = Number(amount) || 0;
  return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const numberToIndianWords = (amount) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertBelowThousand = (n) => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ''}`.trim();
    return `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${convertBelowThousand(n % 100)}` : ''}`.trim();
  };

  const convert = (n) => {
    if (n === 0) return 'Zero';
    if (n < 1000) return convertBelowThousand(n);
    if (n < 100000) {
      return `${convert(Math.floor(n / 1000))} Thousand${n % 1000 ? ` ${convertBelowThousand(n % 1000)}` : ''}`.trim();
    }
    if (n < 10000000) {
      return `${convert(Math.floor(n / 100000))} Lakh${n % 100000 ? ` ${convert(n % 100000)}` : ''}`.trim();
    }
    return `${convert(Math.floor(n / 10000000))} Crore${n % 10000000 ? ` ${convert(n % 10000000)}` : ''}`.trim();
  };

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let words = `${convert(rupees)} Rupees`;
  if (paise > 0) words += ` and ${convert(paise)} Paise`;
  return `${words} Only`;
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

    const doc = new PDFDocument({ margin: 0, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    // Create a safe filename and set both legacy `filename` and RFC5987 `filename*`
    const safeFilename = `${invoice.invoiceNumber}.pdf`.replace(/["\\\r\n]/g, '');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`);
    doc.pipe(res);

    const black = '#000000';
    const PAGE_W = 595.28;
    const PAGE_H = 841.89;
    const M = 15;
    const L = M;
    const T = M;
    const W = PAGE_W - M * 2;
    const B = PAGE_H - M;

    const strokeBox = (x, y, w, h, lw = 0.75) => {
      doc.save();
      doc.lineWidth(lw).strokeColor(black).rect(x, y, w, h).stroke();
      doc.restore();
    };

    const hLine = (x, y, len, lw = 0.75) => {
      doc.save();
      doc.lineWidth(lw).strokeColor(black).moveTo(x, y).lineTo(x + len, y).stroke();
      doc.restore();
    };

    const vLine = (x, y, len, lw = 0.75) => {
      doc.save();
      doc.lineWidth(lw).strokeColor(black).moveTo(x, y).lineTo(x, y + len).stroke();
      doc.restore();
    };

    const writeText = (text, x, y, w, options = {}) => {
      const { size = 7, bold = false, align = 'left', lineGap = 0 } = options;
      doc.save();
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(size)
        .fillColor(black)
        .text(String(text ?? ''), x + 3, y + 2, { width: w - 6, align, lineGap });
      doc.restore();
    };

    const customerAddress = formatAddress(invoice.customer?.address);
    const halfGst = invoice.gstPercentage / 2;
    const cgstAmount = invoice.gstAmount / 2;
    const sgstAmount = invoice.gstAmount / 2;

    const lineItems = (invoice.items && invoice.items.length > 0)
      ? invoice.items
      : [{
          description: invoice.service?.serviceType || 'Pest Control Service',
          quantity: 1,
          rate: invoice.subtotal,
          amount: invoice.subtotal
        }];

    strokeBox(L, T, W, B - T, 1.5);

    const titleH = 34;
    writeText('PROFORMA INVOICE', L, T, W, { size: 16, bold: true, align: 'center' });
    writeText('(Original for Recipient)', L, T + 16, W, { size: 7, align: 'center' });
    hLine(L, T + titleH, W, 1);

    const headerY = T + titleH;
    const headerH = 172;
    const leftColW = Math.round(W * 0.55);
    const rightColW = W - leftColW;
    const rightColX = L + leftColW;

    strokeBox(L, headerY, W, headerH);
    vLine(rightColX, headerY, headerH);

    let leftY = headerY + 4;
    writeText(COMPANY.name, L, leftY, leftColW, { size: 9, bold: true });
    leftY += 12;
    writeText(COMPANY.address, L, leftY, leftColW, { size: 7 });
    leftY += 10;
    writeText(`Email: ${COMPANY.email}`, L, leftY, leftColW, { size: 7 });
    leftY += 9;
    writeText(`Phone: ${COMPANY.phone}`, L, leftY, leftColW, { size: 7 });
    leftY += 9;
    writeText(`GSTIN/UIN: ${COMPANY.gstin}`, L, leftY, leftColW, { size: 7 });
    leftY += 9;
    writeText(`State Name: ${COMPANY.state}, Code: ${COMPANY.stateCode}`, L, leftY, leftColW, { size: 7 });

    const consigneeY = headerY + 58;
    hLine(L, consigneeY, leftColW);
    writeText('Consignee (Ship To)', L, consigneeY + 2, leftColW, { size: 7, bold: true });
    writeText(invoice.customer?.name || '', L, consigneeY + 12, leftColW, { size: 7 });
    writeText(customerAddress, L, consigneeY + 21, leftColW, { size: 7 });

    const buyerY = headerY + 102;
    hLine(L, buyerY, leftColW);
    writeText('Buyer (Bill To)', L, buyerY + 2, leftColW, { size: 7, bold: true });
    writeText(invoice.customer?.name || '', L, buyerY + 12, leftColW, { size: 7, bold: true });
    writeText(customerAddress, L, buyerY + 21, leftColW, { size: 7 });
    writeText(`Email: ${invoice.customer?.email || ''}`, L, buyerY + 30, leftColW, { size: 7 });
    writeText(`Phone: ${invoice.customer?.phone || ''}`, L, buyerY + 39, leftColW, { size: 7 });

    const metaFields = [
      { label: 'Invoice No.', value: invoice.invoiceNumber },
      { label: 'Dated', value: formatIndianDate(invoice.createdAt) },
      { label: 'Delivery Note', value: '' },
      { label: 'Mode/Terms of Payment', value: formatPaymentMethod(invoice.paymentMethod) },
      { label: 'Reference No. & Date.', value: '' },
      { label: 'Other References', value: invoice.notes || '' },
      { label: "Buyer's Order No.", value: '' },
      { label: 'Dispatch Doc No.', value: '' },
      { label: 'Delivery Note Date', value: '' },
      { label: 'Dispatched through', value: '' },
      { label: 'Destination', value: customerAddress },
      { label: 'Terms of Delivery', value: '' }
    ];

    const metaLabelW = 108;
    const metaRowH = headerH / metaFields.length;

    metaFields.forEach((field, index) => {
      const rowY = headerY + index * metaRowH;
      if (index > 0) hLine(rightColX, rowY, rightColW);
      vLine(rightColX + metaLabelW, rowY, metaRowH);
      writeText(field.label, rightColX, rowY + 1, metaLabelW, { size: 6.5, bold: true });
      writeText(field.value, rightColX + metaLabelW, rowY + 1, rightColW - metaLabelW, { size: 6.5 });
    });

    const tableY = headerY + headerH;
    const footerBlockH = 148;
    const footerNoteH = 14;
    const tableH = B - tableY - footerBlockH - footerNoteH;

    const cols = [
      { label: 'Sl\nNo.', w: 26 },
      { label: 'Description of Goods/Services', w: 214 },
      { label: 'HSN/SAC', w: 52 },
      { label: 'Quantity', w: 44 },
      { label: 'Rate', w: 52 },
      { label: 'Per', w: 34 },
      { label: 'Amount', w: W - 26 - 214 - 52 - 44 - 52 - 34 }
    ];

    const colX = [];
    let cx = L;
    cols.forEach((col) => {
      colX.push(cx);
      cx += col.w;
    });

    const headerRowH = 24;
    const itemRowH = 16;
    const totalsRowH = 18;
    const totalsRows = 4;
    const tableBodyH = tableH - headerRowH - totalsRowH * totalsRows;

    strokeBox(L, tableY, W, tableH);

    cols.forEach((col, i) => {
      if (i > 0) vLine(colX[i], tableY, headerRowH);
      writeText(col.label, colX[i], tableY + 4, col.w, { size: 6.5, bold: true, align: 'center' });
    });
    hLine(L, tableY + headerRowH, W);

    cols.forEach((col, i) => {
      if (i > 0) vLine(colX[i], tableY + headerRowH, tableH - headerRowH);
    });

    let rowY = tableY + headerRowH;
    const maxItemRows = Math.floor(tableBodyH / itemRowH);

    lineItems.slice(0, maxItemRows).forEach((item, index) => {
      writeText(index + 1, colX[0], rowY + 3, cols[0].w, { size: 7, align: 'center' });
      writeText(item.description, colX[1], rowY + 3, cols[1].w, { size: 7 });
      writeText('998311', colX[2], rowY + 3, cols[2].w, { size: 7, align: 'center' });
      writeText(item.quantity, colX[3], rowY + 3, cols[3].w, { size: 7, align: 'center' });
      writeText(formatCurrency(item.rate), colX[4], rowY + 3, cols[4].w, { size: 7, align: 'right' });
      writeText('Nos', colX[5], rowY + 3, cols[5].w, { size: 7, align: 'center' });
      writeText(formatCurrency(item.amount), colX[6], rowY + 3, cols[6].w, { size: 7, align: 'right' });
      rowY += itemRowH;
    });

    for (let i = lineItems.length; i < maxItemRows; i++) {
      rowY += itemRowH;
    }

    for (let i = 1; i <= maxItemRows; i++) {
      hLine(L, tableY + headerRowH + i * itemRowH, W, 0.5);
    }

    const totalsY = tableY + tableH - totalsRowH * totalsRows;
    hLine(L, totalsY, W);
    hLine(L, totalsY + totalsRowH, W);
    hLine(L, totalsY + totalsRowH * 2, W);
    hLine(L, totalsY + totalsRowH * 3, W);

    const labelColX = colX[4];
    const labelColW = cols[4].w + cols[5].w;
    const amountColX = colX[6];
    const amountColW = cols[6].w;

    const totalRows = [
      { label: 'Sub Total', value: formatCurrency(invoice.subtotal), bold: true },
      { label: `CGST @ ${halfGst}%`, value: formatCurrency(cgstAmount), bold: false },
      { label: `SGST @ ${halfGst}%`, value: formatCurrency(sgstAmount), bold: false },
      { label: 'Grand Total', value: formatCurrency(invoice.totalAmount), bold: true }
    ];

    totalRows.forEach((row, index) => {
      const y = totalsY + index * totalsRowH;
      writeText(row.label, labelColX, y + 4, labelColW, { size: 7, bold: row.bold, align: 'right' });
      writeText(`Rs. ${row.value}`, amountColX, y + 4, amountColW, { size: 7, bold: row.bold, align: 'right' });
    });

    const footerY = tableY + tableH;
    const footerH = footerBlockH;
    strokeBox(L, footerY, W, footerH);

    const footerLeftW = Math.round(W * 0.62);
    const footerRightW = W - footerLeftW;
    const footerRightX = L + footerLeftW;
    vLine(footerRightX, footerY, footerH);

    const wordsH = 28;
    writeText('Amount Chargeable (in words)', L, footerY + 3, footerLeftW, { size: 7, bold: true });
    writeText(numberToIndianWords(invoice.totalAmount), L, footerY + 14, footerLeftW, { size: 7 });
    hLine(L, footerY + wordsH, footerLeftW);

    const declY = footerY + wordsH;
    writeText('Declaration', L, declY + 4, footerLeftW, { size: 7, bold: true });
    writeText(
      'We declare that this invoice shows the actual price of the goods/services described and that all particulars are true and correct.',
      L,
      declY + 14,
      footerLeftW,
      { size: 6.5, lineGap: 1 }
    );

    const bankH = 72;
    writeText("Company's Bank Details", footerRightX, footerY + 4, footerRightW, { size: 7, bold: true });
    writeText(`Bank Name: ${COMPANY.bank.name}`, footerRightX, footerY + 14, footerRightW, { size: 6.5 });
    writeText(`A/c No.: ${COMPANY.bank.account}`, footerRightX, footerY + 23, footerRightW, { size: 6.5 });
    writeText(`Branch & IFS Code: ${COMPANY.bank.branch} & ${COMPANY.bank.ifsc}`, footerRightX, footerY + 32, footerRightW, { size: 6.5 });
    hLine(footerRightX, footerY + bankH, footerRightW);

    const signY = footerY + bankH;
    const signH = footerH - bankH;
    writeText(`For ${COMPANY.name}`, footerRightX, signY + 6, footerRightW, { size: 7, bold: true, align: 'right' });
    hLine(footerRightX + 20, signY + signH - 22, footerRightW - 40);
    writeText('Authorised Signatory', footerRightX, signY + signH - 14, footerRightW, { size: 6.5, align: 'right' });

    hLine(L, footerY + footerH + 2, W, 0.75);
    writeText('This is a Computer Generated Invoice', L, footerY + footerH + 4, W, { size: 6.5, align: 'center' });

    doc.end();
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
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
