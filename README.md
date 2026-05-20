# Pest Control Billing and Customer Tracking System

A comprehensive, production-ready Pest Control Management System built with Node.js, Express.js, MongoDB, and modern frontend technologies.

## Features

### 1. Admin Dashboard
- **Total Customers**: View and track all registered customers
- **Total Revenue**: Monitor overall business revenue
- **Pending Payments**: Track outstanding payments
- **Today's Bookings**: View scheduled services for the day
- **Follow-up Reminders**: Manage upcoming reminders
- **Revenue Charts**: Visual revenue trends over time
- **Service Distribution**: Pie chart showing service types

### 2. Customer Management
- Add, edit, and delete customers
- View customer history and pest history
- Track address and contact details
- Customer lifetime value tracking
- Search functionality
- Customer type classification (Residential, Commercial, Industrial)

### 3. Billing System
- Generate invoices with auto-incrementing invoice numbers
- GST calculation (configurable rates: 0%, 5%, 12%, 18%, 28%)
- Payment status tracking (Pending, Partial, Paid, Overdue)
- Multiple payment methods (Cash, Card, UPI, Bank Transfer, Cheque)
- Print and download invoices as PDF
- Payment history tracking

### 4. Service Management
- Schedule and manage pest control services
- Technician assignment
- Chemical usage tracking
- Service notes and documentation
- Before/after image upload support
- Service status tracking (Scheduled, In Progress, Completed, Cancelled)
- Severity assessment (Low, Medium, High, Severe)
- Customer rating and feedback

### 5. Customer Tracking
- Last service date tracking
- Next follow-up date prediction
- Repeat customer identification
- AMC (Annual Maintenance Contract) contract tracking
- Complaint history management
- Customer lifetime value calculation

### 6. Technician Management
- Technician registration and authentication
- Assigned jobs management
- Completed services tracking
- Daily performance monitoring
- Rating system
- Specialization tracking
- Activate/deactivate technician accounts

### 7. Reminder System
- Upcoming service reminders
- AMC expiry notifications
- Pending payment reminders
- Follow-up scheduling
- Reminder status tracking (Pending, Sent, Completed)

### 8. AI Features
- **AI Pest Suggestion**: Intelligent pest identification based on symptoms and season
- **AI Service Recommendation**: Personalized service recommendations based on pest type and severity
- **AI Follow-up Prediction**: Predict optimal follow-up dates using service history
- **Customer Risk Assessment**: Analyze customer risk factors and provide retention recommendations

### 9. UI/UX Features
- Modern responsive design
- Dark/Light mode toggle
- Sidebar navigation
- Professional dashboard cards
- Real-time statistics
- Interactive charts
- Modal-based forms
- Status badges
- Search and filter functionality

### 10. Security
- Admin authentication with JWT
- Technician authentication
- Password hashing with bcrypt
- Protected API routes
- Role-based access control

## Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **PDFKit** - PDF generation
- **Multer** - File uploads
- **CORS** - Cross-origin resource sharing

### Frontend
- **HTML5** - Structure
- **CSS3** - Styling with CSS variables for theming
- **JavaScript (ES6+)** - Functionality
- **Chart.js** - Data visualization
- **Font Awesome** - Icons

## Project Structure

```
pest-control-system/
├── backend/
│   ├── config/
│   │   └── db.js                 # Database configuration
│   ├── middleware/
│   │   └── auth.js               # Authentication middleware
│   ├── models/
│   │   ├── Admin.js              # Admin model
│   │   ├── Customer.js           # Customer model
│   │   ├── Invoice.js            # Invoice model
│   │   ├── Service.js            # Service model
│   │   ├── Technician.js         # Technician model
│   │   ├── FollowUp.js           # Follow-up model
│   │   └── Payment.js            # Payment model
│   └── routes/
│       ├── auth.js               # Authentication routes
│       ├── customers.js          # Customer routes
│       ├── invoices.js           # Invoice routes
│       ├── services.js           # Service routes
│       ├── technicians.js        # Technician routes
│       ├── dashboard.js          # Dashboard routes
│       ├── followups.js          # Follow-up routes
│       ├── payments.js           # Payment routes
│       └── ai.js                 # AI features routes
├── frontend/
│   ├── css/
│   │   └── style.css             # Main stylesheet
│   ├── js/
│   │   └── app.js                # Frontend JavaScript
│   └── index.html                # Main HTML file
├── uploads/                      # Image upload directory
├── server.js                     # Main server file
├── package.json                  # Dependencies
├── .env                          # Environment variables
├── .gitignore                    # Git ignore file
└── README.md                     # This file
```

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher) - See [MONGODB_SETUP.md](MONGODB_SETUP.md) for detailed setup instructions
- npm or yarn

### Step 1: Clone the repository
```bash
cd "c:\PEST CONTROL"
```

### Step 2: Install dependencies
```bash
npm install
```

### Step 3: Configure environment variables
Run the setup script to create `.env` file:
```bash
npm run setup-env
```

Or manually create a `.env` file in the root directory with the following variables:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/pestcontrol
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_EXPIRE=7d
NODE_ENV=development
```

**Important**: Change `JWT_SECRET` to a secure random string in production.

### Step 4: Set up MongoDB
The application requires MongoDB for full functionality. Follow the detailed setup guide in [MONGODB_SETUP.md](MONGODB_SETUP.md).

Quick start:
```bash
# Check if MongoDB is running
npm run check-mongodb

# If MongoDB is not running, start it:
# Windows:
net start MongoDB

# Linux:
sudo systemctl start mongod

# macOS:
brew services start mongodb-community
```

**Note**: The server will start without MongoDB connection and run in limited mode. Database features will not work until MongoDB is connected.

### Step 5: Create uploads directory
```bash
mkdir uploads
```

### Step 6: Start the server
```bash
# Development mode with auto-reload
npm run dev

# Or production mode
npm start
```

The server will start on `http://localhost:5000`

### Step 7: Verify MongoDB connection
Check the health endpoint:
```bash
curl http://localhost:5000/api/health
```

Expected response when MongoDB is connected:
```json
{
  "status": "ok",
  "database": {
    "state": "connected",
    "connected": true,
    "host": "localhost"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Usage

### Initial Setup

1. **Register an Admin Account**
   - Open `http://localhost:5000` in your browser
   - Click "Register" on the login page
   - Select "Admin" as the role
   - Fill in the required details
   - Submit the form

2. **Login as Admin**
   - Use your admin credentials to login
   - You'll be redirected to the dashboard

3. **Add Technicians**
   - Navigate to Technicians section
   - Click "Add Technician"
   - Fill in technician details
   - Technicians can then login using their credentials

### Adding Customers

1. Navigate to Customers section
2. Click "Add Customer"
3. Fill in customer details:
   - Name, Email, Phone (required)
   - Address information
   - Customer type (Residential/Commercial/Industrial)
4. Click "Save Customer"

### Creating Services

1. Navigate to Services section
2. Click "Add Service"
3. Select customer and technician
4. Choose service type:
   - General Pest Control
   - Termite Treatment
   - Bed Bug Treatment
   - Rodent Control
   - Mosquito Control
   - Cockroach Control
5. Set service date and time
6. Add severity level and notes
7. Click "Save Service"

### Generating Invoices

1. Navigate to Invoices section
2. Click "Create Invoice"
3. Select customer
4. Add invoice items:
   - Description
   - Quantity
   - Rate
5. Set GST percentage
6. Choose payment method
7. Set due date (optional)
8. Click "Create Invoice"

### Managing Payments

1. Navigate to Payments section
2. Click "Record Payment"
3. Select customer and invoice
4. Enter payment amount
5. Choose payment method
6. Add transaction ID (optional)
7. Click "Record Payment"

### Using AI Features

1. Navigate to AI Features section
2. Choose an AI feature:
   - **Pest Suggestion**: Get pest identification based on symptoms
   - **Service Recommendation**: Get service recommendations
   - **Follow-up Prediction**: Predict optimal follow-up dates
   - **Risk Assessment**: Analyze customer risk factors
3. Fill in the required information
4. Click the respective button to get AI-powered insights

## API Endpoints

### Authentication
- `POST /api/auth/admin/register` - Register admin
- `POST /api/auth/admin/login` - Admin login
- `POST /api/auth/technician/register` - Register technician
- `POST /api/auth/technician/login` - Technician login
- `GET /api/auth/me` - Get current user

### Customers
- `GET /api/customers` - Get all customers
- `GET /api/customers/:id` - Get single customer
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer
- `POST /api/customers/:id/pest-history` - Add pest history
- `POST /api/customers/:id/complaint` - Add complaint
- `GET /api/customers/search/:query` - Search customers

### Invoices
- `GET /api/invoices` - Get all invoices
- `GET /api/invoices/:id` - Get single invoice
- `POST /api/invoices` - Create invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice
- `PATCH /api/invoices/:id/payment` - Update payment status
- `GET /api/invoices/:id/pdf` - Download PDF invoice
- `GET /api/invoices/status/pending` - Get pending invoices
- `GET /api/invoices/customer/:customerId` - Get customer invoices

### Services
- `GET /api/services` - Get all services
- `GET /api/services/:id` - Get single service
- `POST /api/services` - Create service
- `PUT /api/services/:id` - Update service
- `DELETE /api/services/:id` - Delete service
- `POST /api/services/:id/before-images` - Upload before images
- `POST /api/services/:id/after-images` - Upload after images
- `PATCH /api/services/:id/complete` - Complete service
- `GET /api/services/date/today` - Get today's services
- `GET /api/services/customer/:customerId` - Get customer services

### Technicians
- `GET /api/technicians` - Get all technicians
- `GET /api/technicians/:id` - Get single technician
- `POST /api/technicians` - Create technician
- `PUT /api/technicians/:id` - Update technician
- `DELETE /api/technicians/:id` - Delete technician
- `PATCH /api/technicians/:id/status` - Update technician status
- `POST /api/technicians/:id/performance` - Add performance record
- `GET /api/technicians/:id/stats` - Get technician stats

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/recent-activities` - Get recent activities
- `GET /api/dashboard/revenue-chart` - Get revenue chart data
- `GET /api/dashboard/service-distribution` - Get service distribution
- `GET /api/dashboard/top-customers` - Get top customers
- `GET /api/dashboard/technician-performance` - Get technician performance

### Follow-ups
- `GET /api/followups` - Get all follow-ups
- `GET /api/followups/:id` - Get single follow-up
- `POST /api/followups` - Create follow-up
- `PUT /api/followups/:id` - Update follow-up
- `DELETE /api/followups/:id` - Delete follow-up
- `PATCH /api/followups/:id/sent` - Mark as sent
- `PATCH /api/followups/:id/complete` - Mark as completed
- `GET /api/followups/upcoming` - Get upcoming reminders
- `GET /api/followups/overdue` - Get overdue reminders
- `GET /api/followups/customer/:customerId` - Get customer follow-ups

### Payments
- `GET /api/payments` - Get all payments
- `GET /api/payments/:id` - Get single payment
- `POST /api/payments` - Create payment
- `PUT /api/payments/:id` - Update payment
- `DELETE /api/payments/:id` - Delete payment
- `GET /api/payments/customer/:customerId` - Get customer payments
- `GET /api/payments/stats/summary` - Get payment statistics

### AI Features
- `POST /api/ai/pest-suggestion` - Get AI pest suggestion
- `POST /api/ai/service-recommendation` - Get AI service recommendation
- `POST /api/ai/followup-prediction` - Get AI follow-up prediction
- `POST /api/ai/risk-assessment` - Get customer risk assessment

## Database Schema

### Customer
- name, email, phone, alternatePhone
- address (street, city, state, zipCode, landmark)
- pestHistory (array)
- amcContract (hasAMC, startDate, endDate, servicesIncluded, amount)
- customerType (residential, commercial, industrial)
- totalSpent, lastServiceDate, nextFollowUpDate
- complaintHistory (array)
- notes, createdAt, updatedAt

### Invoice
- invoiceNumber (auto-generated)
- customer (reference)
- service (reference)
- items (array: description, quantity, rate, amount)
- subtotal, gstPercentage, gstAmount, totalAmount
- paymentStatus (pending, partial, paid, overdue)
- paymentMethod, paidAmount, dueDate, paidDate
- notes, createdAt, updatedAt

### Service
- customer (reference), technician (reference)
- serviceType, serviceDate, scheduledTime
- status (scheduled, in_progress, completed, cancelled)
- chemicalsUsed (array)
- serviceNotes, beforeImages, afterImages
- areaTreated, severity
- customerRating, customerFeedback
- completionTime, createdAt, updatedAt

### Technician
- name, email, phone, password, employeeId
- specialization (array), experience
- assignedJobs (array), completedServices
- rating, isActive
- dailyPerformance (array)
- createdAt, updatedAt

### FollowUp
- customer (reference), service (reference)
- reminderType, reminderDate
- status (pending, sent, completed, cancelled)
- notes, sentDate, completedDate
- createdAt, updatedAt

### Payment
- invoice (reference), customer (reference)
- amount, paymentMethod, transactionId
- paymentDate, status
- notes, receiptNumber
- createdAt, updatedAt

### Admin
- name, email, password, role
- createdAt, updatedAt

## Security Features

- Password hashing with bcryptjs
- JWT token-based authentication
- Role-based access control (Admin/Technician)
- Protected API routes
- CORS enabled
- Input validation

## Deployment

### Production Setup

1. **Set environment variables**:
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://your-production-db/pest-control
JWT_SECRET=your_secure_random_secret
JWT_EXPIRE=7d
```

2. **Build for production**:
```bash
npm install --production
```

3. **Use a process manager** (PM2):
```bash
npm install -g pm2
pm2 start server.js --name pest-control
pm2 save
pm2 startup
```

4. **Use a reverse proxy** (Nginx):
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

5. **Enable HTTPS** using Let's Encrypt or similar

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check MONGODB_URI in .env file
- Verify MongoDB is accessible on the specified port

### Port Already in Use
- Change PORT in .env file
- Kill the process using the port:
```bash
# On Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Image Upload Issues
- Ensure uploads directory exists
- Check file permissions
- Verify multer configuration

### PDF Generation Issues
- Ensure PDFKit is installed
- Check write permissions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For issues, questions, or contributions, please contact the development team.

## Changelog

### Version 1.0.0
- Initial release
- Complete CRUD operations for all entities
- Authentication system
- Dashboard with statistics and charts
- AI-powered features
- PDF invoice generation
- Dark/Light mode
- Responsive design
