// API Base URL
const API_BASE = (() => {
    if (typeof window !== 'undefined' && window.location && window.location.host) {
        return `${window.location.protocol}//${window.location.host}/api`;
    }
    throw new Error('Unable to determine API base URL');
})();

// Global state
let currentUser = null;
let authToken = null;
let currentTheme = localStorage.getItem('theme') || 'light';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Check for existing token
    authToken = localStorage.getItem('token');
    currentUser = JSON.parse(localStorage.getItem('user') || 'null');
    
    // Apply theme
    applyTheme(currentTheme);
    
    // Show appropriate page
    if (authToken && currentUser) {
        showDashboard();
    } else {
        showLogin();
    }
    
    // Setup event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Register form
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    
    // Show/hide register
    document.getElementById('showRegister').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginPage').classList.add('hidden');
        document.getElementById('registerPage').classList.remove('hidden');
    });
    
    document.getElementById('showLogin').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('registerPage').classList.add('hidden');
        document.getElementById('loginPage').classList.remove('hidden');
    });
    
    // Register role change
    document.getElementById('registerRole').addEventListener('change', (e) => {
        const role = e.target.value;
        document.getElementById('employeeIdGroup').style.display = role === 'technician' ? 'block' : 'none';
        document.getElementById('phoneGroup').style.display = role === 'technician' ? 'block' : 'none';
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // Sidebar controls
    document.getElementById('sidebarOpenBtn')?.addEventListener('click', openSidebar);
    document.getElementById('sidebarToggle')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeSidebar();
    });
    document.getElementById('sidebarOverlay')?.addEventListener('click', closeSidebar);
    
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            navigateTo(page);
        });
    });
    
    // Add buttons
    document.getElementById('addCustomerBtn')?.addEventListener('click', showAddCustomerModal);
    document.getElementById('addServiceBtn')?.addEventListener('click', showAddServiceModal);
    document.getElementById('addInvoiceBtn')?.addEventListener('click', showAddInvoiceModal);
    document.getElementById('addTechnicianBtn')?.addEventListener('click', showAddTechnicianModal);
    document.getElementById('addFollowUpBtn')?.addEventListener('click', showAddFollowUpModal);
    document.getElementById('addPaymentBtn')?.addEventListener('click', showAddPaymentModal);
    
    // Search and filters
    document.getElementById('customerSearch')?.addEventListener('input', debounce(handleCustomerSearch, 300));
    document.getElementById('serviceFilter')?.addEventListener('change', handleServiceFilter);
    document.getElementById('invoiceFilter')?.addEventListener('change', handleInvoiceFilter);
    document.getElementById('followUpFilter')?.addEventListener('change', handleFollowUpFilter);
}

// Authentication functions
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const role = document.getElementById('loginRole').value;
    
    try {
        const endpoint = role === 'admin' ? '/auth/admin/login' : '/auth/technician/login';
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            currentUser = data[role] || data.admin || data.technician;
            localStorage.setItem('token', authToken);
            localStorage.setItem('user', JSON.stringify(currentUser));
            showDashboard();
        } else {
            alert(data.message || 'Login failed');
        }
    } catch (error) {
        alert('Error connecting to server');
        console.error(error);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const role = document.getElementById('registerRole').value;
    const userData = {
        name: document.getElementById('registerName').value,
        email: document.getElementById('registerEmail').value,
        password: document.getElementById('registerPassword').value
    };
    
    if (role === 'technician') {
        userData.employeeId = document.getElementById('registerEmployeeId').value;
        userData.phone = document.getElementById('registerPhone').value;
    }
    
    try {
        const endpoint = role === 'admin' ? '/auth/admin/register' : '/auth/technician/register';
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Registration successful! Please login.');
            document.getElementById('registerPage').classList.add('hidden');
            document.getElementById('loginPage').classList.remove('hidden');
            document.getElementById('registerForm').reset();
        } else {
            alert(data.message || 'Registration failed');
        }
    } catch (error) {
        alert('Error connecting to server');
        console.error(error);
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    authToken = null;
    currentUser = null;
    showLogin();
}

function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar?.classList.add('open');
    overlay?.classList.remove('hidden');
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar?.classList.remove('open');
    overlay?.classList.add('hidden');
}

// Navigation functions
function showLogin() {
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('dashboardPage').classList.add('hidden');
}

function showDashboard() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('registerPage').classList.add('hidden');
    document.getElementById('dashboardPage').classList.remove('hidden');
    document.getElementById('userName').textContent = currentUser?.name || 'Admin';
    
    // Show dashboard section
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
        section.classList.add('hidden');
    });
    document.getElementById('dashboardSection')?.classList.remove('hidden');
    document.getElementById('dashboardSection')?.classList.add('active');
    
    loadDashboardStats();
    loadRecentActivities();
}

function navigateTo(page) {
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === page) {
            link.classList.add('active');
        }
    });
    
    // Update page title
    const titles = {
        'dashboard': 'Dashboard',
        'customers': 'Customers',
        'services': 'Services',
        'invoices': 'Invoices',
        'technicians': 'Technicians',
        'followups': 'Follow-ups',
        'payments': 'Payments',
        'ai-features': 'AI Features'
    };
    document.getElementById('pageTitle').textContent = titles[page] || 'Dashboard';
    
    // Show appropriate section
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
        section.classList.add('hidden');
    });
    
    const sectionId = page === 'ai-features' ? 'ai-featuresSection' : `${page}Section`;
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        targetSection.classList.add('active');
    }
    
    // Load page data
    switch (page) {
        case 'dashboard':
            loadDashboardStats();
            loadRecentActivities();
            break;
        case 'customers':
            loadCustomers();
            break;
        case 'services':
            loadServices();
            break;
        case 'invoices':
            loadInvoices();
            break;
        case 'technicians':
            loadTechnicians();
            break;
        case 'followups':
            loadFollowUps();
            break;
        case 'payments':
            loadPayments();
            break;
    }
    
    // Close sidebar on mobile
    if (window.innerWidth <= 1024) {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebarOverlay')?.classList.add('hidden');
    }
}

// Theme functions
function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', currentTheme);
    applyTheme(currentTheme);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.innerHTML = theme === 'dark' 
            ? '<i class="fas fa-sun"></i><span>Light Mode</span>'
            : '<i class="fas fa-moon"></i><span>Dark Mode</span>';
    }
}

// API helper functions
async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const config = {
        method,
        headers
    };
    
    if (body) {
        config.body = JSON.stringify(body);
    }
    
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'API call failed');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Dashboard functions
async function loadDashboardStats() {
    try {
        const stats = await apiCall('/dashboard/stats');
        
        document.getElementById('totalCustomers').textContent = stats.totalCustomers;
        document.getElementById('totalRevenue').textContent = `₹${stats.totalRevenue.toLocaleString()}`;
        document.getElementById('pendingPayments').textContent = `₹${stats.pendingPayments.toLocaleString()}`;
        document.getElementById('todayBookings').textContent = stats.todayBookings;
        document.getElementById('followUpReminders').textContent = stats.upcomingReminders;
        document.getElementById('activeTechnicians').textContent = stats.totalTechnicians;
        document.getElementById('notificationCount').textContent = stats.upcomingReminders;
        
        // Load charts
        loadRevenueChart();
        loadServiceChart();
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

async function loadRecentActivities() {
    try {
        const activities = await apiCall('/dashboard/recent-activities');
        
        // Recent customers
        const customersList = document.getElementById('recentCustomersList');
        customersList.innerHTML = activities.recentCustomers.map(customer => `
            <div class="activity-item">
                <p><strong>${customer.name}</strong></p>
                <p>${customer.email}</p>
                <p>${new Date(customer.createdAt).toLocaleDateString()}</p>
            </div>
        `).join('') || '<p>No recent customers</p>';
        
        // Recent invoices
        const invoicesList = document.getElementById('recentInvoicesList');
        invoicesList.innerHTML = activities.recentInvoices.map(invoice => `
            <div class="activity-item">
                <p><strong>${invoice.invoiceNumber}</strong></p>
                <p>${invoice.customer?.name || 'N/A'}</p>
                <p>₹${invoice.totalAmount.toLocaleString()} - ${invoice.paymentStatus}</p>
            </div>
        `).join('') || '<p>No recent invoices</p>';
        
        // Recent services
        const servicesList = document.getElementById('recentServicesList');
        servicesList.innerHTML = activities.recentServices.map(service => `
            <div class="activity-item">
                <p><strong>${service.serviceType}</strong></p>
                <p>${service.customer?.name || 'N/A'}</p>
                <p>${service.technician?.name || 'N/A'} - ${service.status}</p>
            </div>
        `).join('') || '<p>No recent services</p>';
    } catch (error) {
        console.error('Error loading recent activities:', error);
    }
}

async function loadRevenueChart() {
    try {
        const data = await apiCall('/dashboard/revenue-chart');
        const ctx = document.getElementById('revenueChart').getContext('2d');
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.months,
                datasets: [{
                    label: 'Revenue (₹)',
                    data: data.revenue,
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading revenue chart:', error);
    }
}

async function loadServiceChart() {
    try {
        const data = await apiCall('/dashboard/service-distribution');
        const ctx = document.getElementById('serviceChart').getContext('2d');
        
        const labels = Object.keys(data);
        const values = Object.values(data);
        
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels.map(l => l.replace(/_/g, ' ').toUpperCase()),
                datasets: [{
                    data: values,
                    backgroundColor: [
                        '#4f46e5',
                        '#10b981',
                        '#f59e0b',
                        '#ef4444',
                        '#8b5cf6',
                        '#14b8a6'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading service chart:', error);
    }
}

// Customer functions
async function loadCustomers() {
    try {
        const customers = await apiCall('/customers');
        renderCustomers(customers);
    } catch (error) {
        console.error('Error loading customers:', error);
    }
}

function renderCustomers(customers) {
    const tbody = document.getElementById('customersTableBody');
    tbody.innerHTML = customers.map(customer => `
        <tr>
            <td>${customer.name}</td>
            <td>${customer.email}</td>
            <td>${customer.phone}</td>
            <td>${customer.customerType}</td>
            <td>₹${customer.totalSpent?.toLocaleString() || 0}</td>
            <td>${customer.lastServiceDate ? new Date(customer.lastServiceDate).toLocaleDateString() : 'N/A'}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="viewCustomer('${customer._id}')">View</button>
                    <button class="action-btn edit" onclick="editCustomer('${customer._id}')">Edit</button>
                    <button class="action-btn delete" onclick="deleteCustomer('${customer._id}')">Delete</button>
                </div>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="7">No customers found</td></tr>';
}

async function handleCustomerSearch(e) {
    const query = e.target.value;
    if (query.length < 2) {
        loadCustomers();
        return;
    }
    
    try {
        const customers = await apiCall(`/customers/search/${encodeURIComponent(query)}`);
        renderCustomers(customers);
    } catch (error) {
        console.error('Error searching customers:', error);
    }
}

async function showAddCustomerModal() {
    const modalHtml = `
        <div class="modal">
            <div class="modal-header">
                <h3>Add New Customer</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="customerForm">
                    <div class="form-group">
                        <label>Name *</label>
                        <input type="text" name="name" required>
                    </div>
                    <div class="form-group">
                        <label>Email *</label>
                        <input type="email" name="email" required>
                    </div>
                    <div class="form-group">
                        <label>Phone *</label>
                        <input type="tel" name="phone" required>
                    </div>
                    <div class="form-group">
                        <label>Alternate Phone</label>
                        <input type="tel" name="alternatePhone">
                    </div>
                    <div class="form-group">
                        <label>Customer Type</label>
                        <select name="customerType">
                            <option value="residential">Residential</option>
                            <option value="commercial">Commercial</option>
                            <option value="industrial">Industrial</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Street Address</label>
                        <input type="text" name="address.street">
                    </div>
                    <div class="form-group">
                        <label>City</label>
                        <input type="text" name="address.city">
                    </div>
                    <div class="form-group">
                        <label>State</label>
                        <input type="text" name="address.state">
                    </div>
                    <div class="form-group">
                        <label>Zip Code</label>
                        <input type="text" name="address.zipCode">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="saveCustomer()">Save Customer</button>
            </div>
        </div>
    `;
    showModal(modalHtml);
}

async function saveCustomer() {
    const form = document.getElementById('customerForm');
    const formData = new FormData(form);
    const customerData = {};
    
    formData.forEach((value, key) => {
        if (key.includes('.')) {
            const [parent, child] = key.split('.');
            if (!customerData[parent]) customerData[parent] = {};
            customerData[parent][child] = value;
        } else {
            customerData[key] = value;
        }
    });
    
    try {
        await apiCall('/customers', 'POST', customerData);
        closeModal();
        loadCustomers();
        alert('Customer added successfully!');
    } catch (error) {
        alert('Error adding customer: ' + error.message);
    }
}

async function editCustomer(id) {
    try {
        const customer = await apiCall(`/customers/${id}`);
        
        const modalHtml = `
            <div class="modal">
                <div class="modal-header">
                    <h3>Edit Customer</h3>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="customerForm">
                        <div class="form-group">
                            <label>Name *</label>
                            <input type="text" name="name" value="${customer.name}" required>
                        </div>
                        <div class="form-group">
                            <label>Email *</label>
                            <input type="email" name="email" value="${customer.email}" required>
                        </div>
                        <div class="form-group">
                            <label>Phone *</label>
                            <input type="tel" name="phone" value="${customer.phone}" required>
                        </div>
                        <div class="form-group">
                            <label>Customer Type</label>
                            <select name="customerType">
                                <option value="residential" ${customer.customerType === 'residential' ? 'selected' : ''}>Residential</option>
                                <option value="commercial" ${customer.customerType === 'commercial' ? 'selected' : ''}>Commercial</option>
                                <option value="industrial" ${customer.customerType === 'industrial' ? 'selected' : ''}>Industrial</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Street Address</label>
                            <input type="text" name="address.street" value="${customer.address?.street || ''}">
                        </div>
                        <div class="form-group">
                            <label>City</label>
                            <input type="text" name="address.city" value="${customer.address?.city || ''}">
                        </div>
                        <div class="form-group">
                            <label>State</label>
                            <input type="text" name="address.state" value="${customer.address?.state || ''}">
                        </div>
                        <div class="form-group">
                            <label>Zip Code</label>
                            <input type="text" name="address.zipCode" value="${customer.address?.zipCode || ''}">
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="updateCustomer('${id}')">Update Customer</button>
                </div>
            </div>
        `;
        showModal(modalHtml);
    } catch (error) {
        alert('Error loading customer: ' + error.message);
    }
}

async function updateCustomer(id) {
    const form = document.getElementById('customerForm');
    const formData = new FormData(form);
    const customerData = {};
    
    formData.forEach((value, key) => {
        if (key.includes('.')) {
            const [parent, child] = key.split('.');
            if (!customerData[parent]) customerData[parent] = {};
            customerData[parent][child] = value;
        } else {
            customerData[key] = value;
        }
    });
    
    try {
        await apiCall(`/customers/${id}`, 'PUT', customerData);
        closeModal();
        loadCustomers();
        alert('Customer updated successfully!');
    } catch (error) {
        alert('Error updating customer: ' + error.message);
    }
}

async function deleteCustomer(id) {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    
    try {
        await apiCall(`/customers/${id}`, 'DELETE');
        loadCustomers();
        alert('Customer deleted successfully!');
    } catch (error) {
        alert('Error deleting customer: ' + error.message);
    }
}

async function viewCustomer(id) {
    try {
        const customer = await apiCall(`/customers/${id}`);
        
        const modalHtml = `
            <div class="modal">
                <div class="modal-header">
                    <h3>Customer Details</h3>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div>
                            <p><strong>Name:</strong> ${customer.name}</p>
                            <p><strong>Email:</strong> ${customer.email}</p>
                            <p><strong>Phone:</strong> ${customer.phone}</p>
                            <p><strong>Type:</strong> ${customer.customerType}</p>
                            <p><strong>Total Spent:</strong> ₹${customer.totalSpent?.toLocaleString() || 0}</p>
                        </div>
                        <div>
                            <p><strong>Address:</strong></p>
                            <p>${customer.address?.street || ''}</p>
                            <p>${customer.address?.city || ''}, ${customer.address?.state || ''}</p>
                            <p>${customer.address?.zipCode || ''}</p>
                            <p><strong>Last Service:</strong> ${customer.lastServiceDate ? new Date(customer.lastServiceDate).toLocaleDateString() : 'N/A'}</p>
                        </div>
                    </div>
                    <div style="margin-top: 20px;">
                        <h4>Pest History</h4>
                        ${customer.pestHistory?.length ? customer.pestHistory.map(p => `
                            <p>${p.pestType} - ${p.severity} (${new Date(p.date).toLocaleDateString()})</p>
                        `).join('') : '<p>No pest history</p>'}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Close</button>
                </div>
            </div>
        `;
        showModal(modalHtml);
    } catch (error) {
        alert('Error loading customer: ' + error.message);
    }
}

// Service functions
async function loadServices() {
    try {
        const services = await apiCall('/services');
        renderServices(services);
    } catch (error) {
        console.error('Error loading services:', error);
    }
}

function renderServices(services) {
    const tbody = document.getElementById('servicesTableBody');
    tbody.innerHTML = services.map(service => `
        <tr>
            <td>${service.customer?.name || 'N/A'}</td>
            <td>${service.serviceType.replace(/_/g, ' ').toUpperCase()}</td>
            <td>${new Date(service.serviceDate).toLocaleDateString()}</td>
            <td>${service.technician?.name || 'N/A'}</td>
            <td><span class="status-badge status-${service.status}">${service.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="viewService('${service._id}')">View</button>
                    <button class="action-btn edit" onclick="editService('${service._id}')">Edit</button>
                    ${service.status !== 'completed' ? `<button class="action-btn edit" onclick="completeService('${service._id}')">Complete</button>` : ''}
                </div>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="6">No services found</td></tr>';
}

async function handleServiceFilter(e) {
    const filter = e.target.value;
    try {
        const services = await apiCall('/services');
        const filtered = filter === 'all' ? services : services.filter(s => s.status === filter);
        renderServices(filtered);
    } catch (error) {
        console.error('Error filtering services:', error);
    }
}

async function showAddServiceModal() {
    try {
        const customers = await apiCall('/customers');
        const technicians = await apiCall('/technicians');
        
        const modalHtml = `
            <div class="modal">
                <div class="modal-header">
                    <h3>Add New Service</h3>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="serviceForm">
                        <div class="form-group">
                            <label>Customer *</label>
                            <select name="customer" required>
                                <option value="">Select Customer</option>
                                ${customers.map(c => `<option value="${c._id}">${c.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Technician *</label>
                            <select name="technician" required>
                                <option value="">Select Technician</option>
                                ${technicians.filter(t => t.isActive).map(t => `<option value="${t._id}">${t.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Service Type *</label>
                            <select name="serviceType" required>
                                <option value="general_pest_control">General Pest Control</option>
                                <option value="termite_treatment">Termite Treatment</option>
                                <option value="bed_bug_treatment">Bed Bug Treatment</option>
                                <option value="rodent_control">Rodent Control</option>
                                <option value="mosquito_control">Mosquito Control</option>
                                <option value="cockroach_control">Cockroach Control</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Service Date *</label>
                            <input type="date" name="serviceDate" required>
                        </div>
                        <div class="form-group">
                            <label>Scheduled Time</label>
                            <input type="time" name="scheduledTime">
                        </div>
                        <div class="form-group">
                            <label>Severity</label>
                            <select name="severity">
                                <option value="low">Low</option>
                                <option value="medium" selected>Medium</option>
                                <option value="high">High</option>
                                <option value="severe">Severe</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Area Treated</label>
                            <input type="text" name="areaTreated">
                        </div>
                        <div class="form-group">
                            <label>Service Notes</label>
                            <textarea name="serviceNotes" rows="3"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="saveService()">Save Service</button>
                </div>
            </div>
        `;
        showModal(modalHtml);
    } catch (error) {
        alert('Error loading data: ' + error.message);
    }
}

async function saveService() {
    const form = document.getElementById('serviceForm');
    const formData = new FormData(form);
    const serviceData = {};
    
    formData.forEach((value, key) => {
        serviceData[key] = value;
    });
    
    try {
        await apiCall('/services', 'POST', serviceData);
        closeModal();
        loadServices();
        alert('Service added successfully!');
    } catch (error) {
        alert('Error adding service: ' + error.message);
    }
}

async function completeService(id) {
    try {
        await apiCall(`/services/${id}/complete`, 'PATCH', {});
        loadServices();
        alert('Service marked as completed!');
    } catch (error) {
        alert('Error completing service: ' + error.message);
    }
}

async function viewService(id) {
    try {
        const service = await apiCall(`/services/${id}`);
        
        const modalHtml = `
            <div class="modal">
                <div class="modal-header">
                    <h3>Service Details</h3>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <p><strong>Customer:</strong> ${service.customer?.name || 'N/A'}</p>
                    <p><strong>Technician:</strong> ${service.technician?.name || 'N/A'}</p>
                    <p><strong>Service Type:</strong> ${service.serviceType.replace(/_/g, ' ').toUpperCase()}</p>
                    <p><strong>Date:</strong> ${new Date(service.serviceDate).toLocaleDateString()}</p>
                    <p><strong>Status:</strong> <span class="status-badge status-${service.status}">${service.status}</span></p>
                    <p><strong>Severity:</strong> ${service.severity}</p>
                    <p><strong>Area Treated:</strong> ${service.areaTreated || 'N/A'}</p>
                    <p><strong>Notes:</strong> ${service.serviceNotes || 'N/A'}</p>
                    ${service.chemicalsUsed?.length ? `
                        <p><strong>Chemicals Used:</strong></p>
                        ${service.chemicalsUsed.map(c => `<p>${c.name} - ${c.quantity}</p>`).join('')}
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Close</button>
                </div>
            </div>
        `;
        showModal(modalHtml);
    } catch (error) {
        alert('Error loading service: ' + error.message);
    }
}

// Invoice functions
async function loadInvoices() {
    try {
        const invoices = await apiCall('/invoices');
        renderInvoices(invoices);
    } catch (error) {
        console.error('Error loading invoices:', error);
    }
}

function renderInvoices(invoices) {
    const tbody = document.getElementById('invoicesTableBody');
    tbody.innerHTML = invoices.map(invoice => `
        <tr>
            <td>${invoice.invoiceNumber}</td>
            <td>${invoice.customer?.name || 'N/A'}</td>
            <td>₹${invoice.totalAmount.toLocaleString()}</td>
            <td>₹${invoice.gstAmount.toLocaleString()} (${invoice.gstPercentage}%)</td>
            <td><span class="status-badge status-${invoice.paymentStatus}">${invoice.paymentStatus}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="viewInvoice('${invoice._id}')">View</button>
                    <button class="action-btn view" onclick="downloadInvoicePDF('${invoice._id}')">PDF</button>
                    ${invoice.paymentStatus !== 'paid' ? `<button class="action-btn edit" onclick="updatePaymentStatus('${invoice._id}')">Payment</button>` : ''}
                </div>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="6">No invoices found</td></tr>';
}

async function handleInvoiceFilter(e) {
    const filter = e.target.value;
    try {
        const invoices = await apiCall('/invoices');
        const filtered = filter === 'all' ? invoices : invoices.filter(i => i.paymentStatus === filter);
        renderInvoices(filtered);
    } catch (error) {
        console.error('Error filtering invoices:', error);
    }
}

async function showAddInvoiceModal() {
    try {
        const customers = await apiCall('/customers');
        
        const modalHtml = `
            <div class="modal">
                <div class="modal-header">
                    <h3>Create Invoice</h3>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="invoiceForm">
                        <div class="form-group">
                            <label>Customer *</label>
                            <select name="customer" required>
                                <option value="">Select Customer</option>
                                ${customers.map(c => `<option value="${c._id}">${c.name}</option>`).join('')}
                            </select>
                        </div>
                        <div id="invoiceItems">
                            <div class="invoice-item">
                                <div class="form-group">
                                    <label>Description</label>
                                    <input type="text" name="items[0].description" required>
                                </div>
                                <div class="form-group">
                                    <label>Quantity</label>
                                    <input type="number" name="items[0].quantity" value="1" min="1" required onchange="calculateInvoiceTotal()">
                                </div>
                                <div class="form-group">
                                    <label>Rate (₹)</label>
                                    <input type="number" name="items[0].rate" min="0" required onchange="calculateInvoiceTotal()">
                                </div>
                            </div>
                        </div>
                        <button type="button" class="btn btn-secondary btn-sm" onclick="addInvoiceItem()">+ Add Item</button>
                        <div class="form-group">
                            <label>GST Percentage</label>
                            <select name="gstPercentage" onchange="calculateInvoiceTotal()">
                                <option value="0">0%</option>
                                <option value="5">5%</option>
                                <option value="12">12%</option>
                                <option value="18" selected>18%</option>
                                <option value="28">28%</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Payment Method</label>
                            <select name="paymentMethod">
                                <option value="cash">Cash</option>
                                <option value="card">Card</option>
                                <option value="upi">UPI</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="cheque">Cheque</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Due Date</label>
                            <input type="date" name="dueDate">
                        </div>
                        <div class="form-group">
                            <label>Notes</label>
                            <textarea name="notes" rows="2"></textarea>
                        </div>
                        <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px;">
                            <p><strong>Subtotal:</strong> ₹<span id="subtotal">0</span></p>
                            <p><strong>GST:</strong> ₹<span id="gstAmount">0</span></p>
                            <p><strong>Total:</strong> ₹<span id="totalAmount">0</span></p>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="saveInvoice()">Create Invoice</button>
                </div>
            </div>
        `;
        showModal(modalHtml);
    } catch (error) {
        alert('Error loading customers: ' + error.message);
    }
}

let invoiceItemCount = 1;

function addInvoiceItem() {
    invoiceItemCount++;
    const itemsContainer = document.getElementById('invoiceItems');
    const newItem = document.createElement('div');
    newItem.className = 'invoice-item';
    newItem.innerHTML = `
        <div class="form-group">
            <label>Description</label>
            <input type="text" name="items[${invoiceItemCount}].description" required>
        </div>
        <div class="form-group">
            <label>Quantity</label>
            <input type="number" name="items[${invoiceItemCount}].quantity" value="1" min="1" required onchange="calculateInvoiceTotal()">
        </div>
        <div class="form-group">
            <label>Rate (₹)</label>
            <input type="number" name="items[${invoiceItemCount}].rate" min="0" required onchange="calculateInvoiceTotal()">
        </div>
        <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove(); calculateInvoiceTotal();">Remove</button>
    `;
    itemsContainer.appendChild(newItem);
}

function calculateInvoiceTotal() {
    const form = document.getElementById('invoiceForm');
    const items = form.querySelectorAll('.invoice-item');
    let subtotal = 0;
    
    items.forEach(item => {
        const quantity = parseFloat(item.querySelector('input[name*="quantity"]').value) || 0;
        const rate = parseFloat(item.querySelector('input[name*="rate"]').value) || 0;
        subtotal += quantity * rate;
    });
    
    const gstPercentage = parseFloat(form.querySelector('[name="gstPercentage"]').value) || 0;
    const gstAmount = (subtotal * gstPercentage) / 100;
    const total = subtotal + gstAmount;
    
    document.getElementById('subtotal').textContent = subtotal.toFixed(2);
    document.getElementById('gstAmount').textContent = gstAmount.toFixed(2);
    document.getElementById('totalAmount').textContent = total.toFixed(2);
}

async function saveInvoice() {
    const form = document.getElementById('invoiceForm');
    const formData = new FormData(form);
    const invoiceData = {
        items: [],
        subtotal: 0
    };
    
    // Extract items
    const items = form.querySelectorAll('.invoice-item');
    items.forEach(item => {
        const description = item.querySelector('input[name*="description"]').value;
        const quantity = parseFloat(item.querySelector('input[name*="quantity"]').value);
        const rate = parseFloat(item.querySelector('input[name*="rate"]').value);
        const amount = quantity * rate;
        
        invoiceData.items.push({ description, quantity, rate, amount });
        invoiceData.subtotal += amount;
    });
    
    // Extract other fields
    invoiceData.customer = form.querySelector('[name="customer"]').value;
    invoiceData.gstPercentage = parseFloat(form.querySelector('[name="gstPercentage"]').value);
    invoiceData.paymentMethod = form.querySelector('[name="paymentMethod"]').value;
    invoiceData.dueDate = form.querySelector('[name="dueDate"]').value;
    invoiceData.notes = form.querySelector('[name="notes"]').value;
    
    try {
        await apiCall('/invoices', 'POST', invoiceData);
        closeModal();
        loadInvoices();
        alert('Invoice created successfully!');
    } catch (error) {
        alert('Error creating invoice: ' + error.message);
    }
}

async function viewInvoice(id) {
    try {
        const invoice = await apiCall(`/invoices/${id}`);
        
        const modalHtml = `
            <div class="modal">
                <div class="modal-header">
                    <h3>Invoice Details - ${invoice.invoiceNumber}</h3>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <p><strong>Customer:</strong> ${invoice.customer?.name || 'N/A'}</p>
                    <p><strong>Invoice Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString()}</p>
                    ${invoice.dueDate ? `<p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>` : ''}
                    <hr style="margin: 16px 0;">
                    <h4>Items</h4>
                    ${invoice.items.map(item => `
                        <p>${item.description} - Qty: ${item.quantity} x ₹${item.rate} = ₹${item.amount}</p>
                    `).join('')}
                    <hr style="margin: 16px 0;">
                    <p><strong>Subtotal:</strong> ₹${invoice.subtotal.toLocaleString()}</p>
                    <p><strong>GST (${invoice.gstPercentage}%):</strong> ₹${invoice.gstAmount.toLocaleString()}</p>
                    <p><strong>Total:</strong> ₹${invoice.totalAmount.toLocaleString()}</p>
                    <p><strong>Payment Status:</strong> <span class="status-badge status-${invoice.paymentStatus}">${invoice.paymentStatus}</span></p>
                    <p><strong>Payment Method:</strong> ${invoice.paymentMethod}</p>
                    ${invoice.paidAmount > 0 ? `<p><strong>Paid Amount:</strong> ₹${invoice.paidAmount.toLocaleString()}</p>` : ''}
                    ${invoice.notes ? `<p><strong>Notes:</strong> ${invoice.notes}</p>` : ''}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Close</button>
                    <button class="btn btn-primary" onclick="downloadInvoicePDF('${id}')">Download PDF</button>
                </div>
            </div>
        `;
        showModal(modalHtml);
    } catch (error) {
        alert('Error loading invoice: ' + error.message);
    }
}

async function downloadInvoicePDF(id) {
    try {
        const headers = {
            'Authorization': `Bearer ${authToken}`
        };
        
        const response = await fetch(`${API_BASE}/invoices/${id}/pdf`, {
            method: 'GET',
            headers: headers
        });
        
        if (!response.ok) {
            throw new Error('Failed to download PDF');
        }
        const blob = await response.blob();

        // Try to respect filename from Content-Disposition header
        const contentDisposition = response.headers.get('content-disposition') || '';
        let filename = `${id}.pdf`;
        const dispositionMatch = contentDisposition.match(/filename\*=UTF-8''(.+)|filename="(.+)"|filename=(.+)/i);
        if (dispositionMatch) {
            filename = decodeURIComponent(dispositionMatch[1] || dispositionMatch[2] || dispositionMatch[3]);
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();

        // Clean up the object URL after a short delay
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error) {
        alert('Error downloading PDF: ' + error.message);
    }
}

async function updatePaymentStatus(id) {
    try {
        const invoice = await apiCall(`/invoices/${id}`);
        
        const modalHtml = `
            <div class="modal">
                <div class="modal-header">
                    <h3>Update Payment</h3>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <p><strong>Current Status:</strong> ${invoice.paymentStatus}</p>
                    <p><strong>Total Amount:</strong> ₹${invoice.totalAmount.toLocaleString()}</p>
                    <p><strong>Paid Amount:</strong> ₹${invoice.paidAmount.toLocaleString()}</p>
                    <p><strong>Remaining:</strong> ₹${(invoice.totalAmount - invoice.paidAmount).toLocaleString()}</p>
                    <form id="paymentUpdateForm">
                        <div class="form-group">
                            <label>Payment Status</label>
                            <select name="paymentStatus" onchange="syncPaymentStatusAmount(this.value, ${invoice.totalAmount}, ${invoice.paidAmount || 0})">
                                <option value="pending">Pending</option>
                                <option value="partial">Partial</option>
                                <option value="paid">Paid</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Paid Amount (₹)</label>
                            <input type="number" name="paidAmount" value="${invoice.paidAmount}" min="0" max="${invoice.totalAmount}">
                        </div>
                        <div class="form-group">
                            <label>Payment Method</label>
                            <select name="paymentMethod">
                                <option value="cash" ${invoice.paymentMethod === 'cash' ? 'selected' : ''}>Cash</option>
                                <option value="card" ${invoice.paymentMethod === 'card' ? 'selected' : ''}>Card</option>
                                <option value="upi" ${invoice.paymentMethod === 'upi' ? 'selected' : ''}>UPI</option>
                                <option value="bank_transfer" ${invoice.paymentMethod === 'bank_transfer' ? 'selected' : ''}>Bank Transfer</option>
                                <option value="cheque" ${invoice.paymentMethod === 'cheque' ? 'selected' : ''}>Cheque</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="submitPaymentUpdate('${id}')">Update</button>
                </div>
            </div>
        `;
        showModal(modalHtml);
    } catch (error) {
        alert('Error loading invoice: ' + error.message);
    }
}

async function submitPaymentUpdate(id) {
    const form = document.getElementById('paymentUpdateForm');
    const formData = new FormData(form);
    const paymentData = {};
    
    formData.forEach((value, key) => {
        paymentData[key] = key === 'paidAmount' ? parseFloat(value) : value;
    });
    
    try {
        await apiCall(`/invoices/${id}/payment`, 'PATCH', paymentData);
        closeModal();
        loadInvoices();
        loadPayments();
        loadDashboardStats();
        alert('Payment updated successfully!');
    } catch (error) {
        alert('Error updating payment: ' + error.message);
    }
}

// Technician functions
async function loadTechnicians() {
    try {
        const technicians = await apiCall('/technicians');
        renderTechnicians(technicians);
    } catch (error) {
        console.error('Error loading technicians:', error);
    }
}

function renderTechnicians(technicians) {
    const tbody = document.getElementById('techniciansTableBody');
    tbody.innerHTML = technicians.map(tech => `
        <tr>
            <td>${tech.name}</td>
            <td>${tech.email}</td>
            <td>${tech.employeeId}</td>
            <td>${tech.phone}</td>
            <td>${tech.completedServices}</td>
            <td>${tech.rating ? tech.rating.toFixed(1) + '/5' : 'N/A'}</td>
            <td><span class="status-badge status-${tech.isActive ? 'completed' : 'cancelled'}">${tech.isActive ? 'Active' : 'Inactive'}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="viewTechnician('${tech._id}')">View</button>
                    <button class="action-btn edit" onclick="editTechnician('${tech._id}')">Edit</button>
                    <button class="action-btn delete" onclick="toggleTechnicianStatus('${tech._id}', ${!tech.isActive})">${tech.isActive ? 'Deactivate' : 'Activate'}</button>
                </div>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="8">No technicians found</td></tr>';
}

async function showAddTechnicianModal() {
    const modalHtml = `
        <div class="modal">
            <div class="modal-header">
                <h3>Add New Technician</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="technicianForm">
                    <div class="form-group">
                        <label>Name *</label>
                        <input type="text" name="name" required>
                    </div>
                    <div class="form-group">
                        <label>Email *</label>
                        <input type="email" name="email" required>
                    </div>
                    <div class="form-group">
                        <label>Phone *</label>
                        <input type="tel" name="phone" required>
                    </div>
                    <div class="form-group">
                        <label>Employee ID *</label>
                        <input type="text" name="employeeId" required>
                    </div>
                    <div class="form-group">
                        <label>Password *</label>
                        <input type="password" name="password" required minlength="6">
                    </div>
                    <div class="form-group">
                        <label>Specialization (comma separated)</label>
                        <input type="text" name="specialization" placeholder="e.g., termite, rodent, general">
                    </div>
                    <div class="form-group">
                        <label>Experience (years)</label>
                        <input type="number" name="experience" value="0" min="0">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="saveTechnician()">Save Technician</button>
            </div>
        </div>
    `;
    showModal(modalHtml);
}

async function saveTechnician() {
    const form = document.getElementById('technicianForm');
    const formData = new FormData(form);
    const techData = {};
    
    formData.forEach((value, key) => {
        if (key === 'specialization') {
            techData[key] = value.split(',').map(s => s.trim()).filter(s => s);
        } else if (key === 'experience') {
            techData[key] = parseInt(value) || 0;
        } else {
            techData[key] = value;
        }
    });
    
    try {
        await apiCall('/technicians', 'POST', techData);
        closeModal();
        loadTechnicians();
        alert('Technician added successfully!');
    } catch (error) {
        alert('Error adding technician: ' + error.message);
    }
}

async function toggleTechnicianStatus(id, isActive) {
    try {
        await apiCall(`/technicians/${id}/status`, 'PATCH', { isActive });
        loadTechnicians();
        alert(`Technician ${isActive ? 'activated' : 'deactivated'} successfully!`);
    } catch (error) {
        alert('Error updating technician: ' + error.message);
    }
}

async function viewTechnician(id) {
    try {
        const tech = await apiCall(`/technicians/${id}`);
        
        const modalHtml = `
            <div class="modal">
                <div class="modal-header">
                    <h3>Technician Details</h3>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <p><strong>Name:</strong> ${tech.name}</p>
                    <p><strong>Email:</strong> ${tech.email}</p>
                    <p><strong>Phone:</strong> ${tech.phone}</p>
                    <p><strong>Employee ID:</strong> ${tech.employeeId}</p>
                    <p><strong>Status:</strong> ${tech.isActive ? 'Active' : 'Inactive'}</p>
                    <p><strong>Completed Services:</strong> ${tech.completedServices}</p>
                    <p><strong>Rating:</strong> ${tech.rating ? tech.rating.toFixed(1) + '/5' : 'N/A'}</p>
                    <p><strong>Experience:</strong> ${tech.experience} years</p>
                    <p><strong>Specialization:</strong> ${tech.specialization?.join(', ') || 'N/A'}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Close</button>
                </div>
            </div>
        `;
        showModal(modalHtml);
    } catch (error) {
        alert('Error loading technician: ' + error.message);
    }
}

// Follow-up functions
async function loadFollowUps() {
    try {
        const followUps = await apiCall('/followups');
        renderFollowUps(followUps);
    } catch (error) {
        console.error('Error loading follow-ups:', error);
    }
}

function renderFollowUps(followUps) {
    const tbody = document.getElementById('followupsTableBody');
    tbody.innerHTML = followUps.map(followUp => `
        <tr>
            <td>${followUp.customer?.name || 'N/A'}</td>
            <td>${followUp.reminderType.replace(/_/g, ' ').toUpperCase()}</td>
            <td>${new Date(followUp.reminderDate).toLocaleDateString()}</td>
            <td><span class="status-badge status-${followUp.status}">${followUp.status}</span></td>
            <td>
                <div class="action-buttons">
                    ${followUp.status === 'pending' ? `
                        <button class="action-btn edit" onclick="markFollowUpSent('${followUp._id}')">Mark Sent</button>
                        <button class="action-btn edit" onclick="markFollowUpCompleted('${followUp._id}')">Complete</button>
                    ` : ''}
                    <button class="action-btn delete" onclick="deleteFollowUp('${followUp._id}')">Delete</button>
                </div>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="5">No follow-ups found</td></tr>';
}

async function handleFollowUpFilter(e) {
    const filter = e.target.value;
    try {
        const followUps = await apiCall('/followups');
        const filtered = filter === 'all' ? followUps : followUps.filter(f => f.status === filter);
        renderFollowUps(filtered);
    } catch (error) {
        console.error('Error filtering follow-ups:', error);
    }
}

async function showAddFollowUpModal() {
    try {
        const customers = await apiCall('/customers');
        
        const modalHtml = `
            <div class="modal">
                <div class="modal-header">
                    <h3>Add Follow-up Reminder</h3>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="followUpForm">
                        <div class="form-group">
                            <label>Customer *</label>
                            <select name="customer" required>
                                <option value="">Select Customer</option>
                                ${customers.map(c => `<option value="${c._id}">${c.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Reminder Type *</label>
                            <select name="reminderType" required>
                                <option value="service_reminder">Service Reminder</option>
                                <option value="amc_expiry">AMC Expiry</option>
                                <option value="payment_reminder">Payment Reminder</option>
                                <option value="follow_up">Follow-up</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Reminder Date *</label>
                            <input type="date" name="reminderDate" required>
                        </div>
                        <div class="form-group">
                            <label>Notes</label>
                            <textarea name="notes" rows="3"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="saveFollowUp()">Save Reminder</button>
                </div>
            </div>
        `;
        showModal(modalHtml);
    } catch (error) {
        alert('Error loading customers: ' + error.message);
    }
}

async function saveFollowUp() {
    const form = document.getElementById('followUpForm');
    const formData = new FormData(form);
    const followUpData = {};
    
    formData.forEach((value, key) => {
        followUpData[key] = value;
    });
    
    try {
        await apiCall('/followups', 'POST', followUpData);
        closeModal();
        loadFollowUps();
        alert('Follow-up reminder added successfully!');
    } catch (error) {
        alert('Error adding follow-up: ' + error.message);
    }
}

async function markFollowUpSent(id) {
    try {
        await apiCall(`/followups/${id}/sent`, 'PATCH');
        loadFollowUps();
        alert('Follow-up marked as sent!');
    } catch (error) {
        alert('Error updating follow-up: ' + error.message);
    }
}

async function markFollowUpCompleted(id) {
    try {
        await apiCall(`/followups/${id}/complete`, 'PATCH');
        loadFollowUps();
        alert('Follow-up marked as completed!');
    } catch (error) {
        alert('Error updating follow-up: ' + error.message);
    }
}

async function deleteFollowUp(id) {
    if (!confirm('Are you sure you want to delete this follow-up?')) return;
    
    try {
        await apiCall(`/followups/${id}`, 'DELETE');
        loadFollowUps();
        alert('Follow-up deleted successfully!');
    } catch (error) {
        alert('Error deleting follow-up: ' + error.message);
    }
}

// Payment functions
async function loadPayments() {
    try {
        const payments = await apiCall('/payments');
        renderPayments(payments);
        loadPaymentStats();
    } catch (error) {
        console.error('Error loading payments:', error);
    }
}

async function loadPaymentStats() {
    try {
        const stats = await apiCall('/payments/stats/summary');
        document.getElementById('totalCollected').textContent = `₹${stats.totalCollected.toLocaleString()}`;
        document.getElementById('todayCollected').textContent = `₹${stats.todayCollected.toLocaleString()}`;
        document.getElementById('monthCollected').textContent = `₹${stats.monthCollected.toLocaleString()}`;
    } catch (error) {
        console.error('Error loading payment stats:', error);
    }
}

function renderPayments(payments) {
    const tbody = document.getElementById('paymentsTableBody');
    tbody.innerHTML = payments.map(payment => `
        <tr>
            <td>${new Date(payment.paymentDate).toLocaleDateString()}</td>
            <td>${payment.customer?.name || 'N/A'}</td>
            <td>${payment.invoice?.invoiceNumber || 'N/A'}</td>
            <td>₹${payment.amount.toLocaleString()}</td>
            <td>${payment.paymentMethod.replace(/_/g, ' ').toUpperCase()}</td>
            <td><span class="status-badge status-${payment.status}">${payment.status}</span></td>
        </tr>
    `).join('') || '<tr><td colspan="6">No payments found</td></tr>';
}

async function showAddPaymentModal() {
    try {
        const customers = await apiCall('/customers');
        const invoices = await apiCall('/invoices');
        const pendingInvoices = invoices.filter(i => i.paymentStatus !== 'paid');
        
        // Store invoices globally for filtering
        window.paymentInvoices = pendingInvoices;
        
        const modalHtml = `
            <div class="modal">
                <div class="modal-header">
                    <h3>Record Payment</h3>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="paymentForm">
                        <div class="form-group">
                            <label>Customer *</label>
                            <select name="customer" required onchange="filterInvoicesByCustomer(this.value)">
                                <option value="">Select Customer</option>
                                ${customers.map(c => `<option value="${c._id}">${c.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Invoice *</label>
                            <select name="invoice" id="invoiceSelect" required onchange="populatePaymentDetails(this.value)">
                                <option value="">Select Invoice</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Amount (₹) *</label>
                            <input type="number" name="amount" min="0" required>
                        </div>
                        <div class="form-group">
                            <label>Payment Method *</label>
                            <select name="paymentMethod" required>
                                <option value="cash">Cash</option>
                                <option value="card">Card</option>
                                <option value="upi">UPI</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="cheque">Cheque</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Transaction ID</label>
                            <input type="text" name="transactionId">
                        </div>
                        <div class="form-group">
                            <label>Notes</label>
                            <textarea name="notes" rows="2"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="savePayment()">Record Payment</button>
                </div>
            </div>
        `;
        showModal(modalHtml);
        filterInvoicesByCustomer('');
    } catch (error) {
        alert('Error loading data: ' + error.message);
    }
}

function filterInvoicesByCustomer(customerId) {
    const invoiceSelect = document.getElementById('invoiceSelect');
    if (!invoiceSelect) {
        console.error('filterInvoicesByCustomer: invoiceSelect element not found');
        return;
    }

    invoiceSelect.innerHTML = '<option value="">Select Invoice</option>';

    if (!window.paymentInvoices) {
        console.warn('filterInvoicesByCustomer: no cached payment invoices available');
        return;
    }

    const filteredInvoices = customerId
        ? window.paymentInvoices.filter(i => String(i.customer?._id || i.customer) === String(customerId))
        : window.paymentInvoices;

    if (!filteredInvoices.length) {
        console.warn(`No pending invoices found for customer ${customerId}`);
        invoiceSelect.innerHTML = '<option value="">No pending invoices found</option>';
        return;
    }

    filteredInvoices.forEach(i => {
        const option = document.createElement('option');
        option.value = i._id;
        option.dataset.customer = String(i.customer?._id || i.customer);
        option.textContent = `${i.invoiceNumber} - ₹${i.totalAmount.toLocaleString()} - ${i.paymentStatus || 'pending'}`;
        invoiceSelect.appendChild(option);
    });
}

function populatePaymentDetails(invoiceId) {
    const amountInput = document.querySelector('input[name="amount"]');
    const methodSelect = document.querySelector('select[name="paymentMethod"]');
    if (!invoiceId) {
        if (amountInput) amountInput.value = '';
        return;
    }

    if (!window.paymentInvoices) {
        console.error('populatePaymentDetails: no payment invoices available');
        return;
    }

    const selectedInvoice = window.paymentInvoices.find(i => String(i._id) === String(invoiceId));
    if (!selectedInvoice) {
        console.error('populatePaymentDetails: selected invoice not found', invoiceId, window.paymentInvoices);
        return;
    }

    const remainingAmount = Number(selectedInvoice.totalAmount || 0) - Number(selectedInvoice.paidAmount || 0);
    if (amountInput) {
        amountInput.value = remainingAmount > 0 ? remainingAmount : Number(selectedInvoice.totalAmount || 0);
    }
    if (methodSelect && selectedInvoice.paymentMethod) {
        methodSelect.value = selectedInvoice.paymentMethod;
    }
}

function syncPaymentStatusAmount(status, totalAmount, currentPaid) {
    const amountInput = document.querySelector('input[name="paidAmount"]');
    if (!amountInput) return;

    const currentValue = Number(amountInput.value || 0);
    if (status === 'paid' && currentValue <= currentPaid) {
        amountInput.value = Number(totalAmount || 0);
    }
}

async function savePayment() {
    const form = document.getElementById('paymentForm');
    const formData = new FormData(form);
    const paymentData = {};
    
    formData.forEach((value, key) => {
        if (key === 'amount') {
            paymentData[key] = parseFloat(value);
        } else if (key === 'customer' || key === 'invoice') {
            // Ensure ObjectId fields are sent as strings
            paymentData[key] = value;
        } else {
            paymentData[key] = value;
        }
    });
    
    // Validate required fields
    if (!paymentData.customer || !paymentData.invoice || !paymentData.amount || !paymentData.paymentMethod) {
        alert('Please fill in all required fields');
        return;
    }
    
    try {
        await apiCall('/payments', 'POST', paymentData);
        closeModal();
        loadPayments();
        loadInvoices();
        loadDashboardStats();
        alert('Payment recorded successfully!');
    } catch (error) {
        alert('Error recording payment: ' + error.message);
    }
}

// AI Feature functions
function showAIPestModal() {
    const modalHtml = `
        <div class="modal">
            <div class="modal-header">
                <h3>AI Pest Suggestion</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="aiPestForm">
                    <div class="form-group">
                        <label>Select Customer</label>
                        <select name="customerId" id="aiPestCustomer" required>
                            <option value="">Loading customers...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Symptoms</label>
                        <textarea name="symptoms" rows="3" placeholder="Describe the symptoms or signs of pest activity"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Location</label>
                        <input type="text" name="location" placeholder="e.g., kitchen, bedroom, garden">
                    </div>
                </form>
                <div id="aiPestResult" style="margin-top: 20px;"></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="getAIPestSuggestion()">Get Suggestion</button>
            </div>
        </div>
    `;
    showModal(modalHtml);
    loadCustomersForAI('aiPestCustomer');
}

async function getAIPestSuggestion() {
    const form = document.getElementById('aiPestForm');
    const formData = new FormData(form);
    const data = {};
    
    formData.forEach((value, key) => {
        data[key] = value;
    });
    
    try {
        const result = await apiCall('/ai/pest-suggestion', 'POST', data);
        document.getElementById('aiPestResult').innerHTML = `
            <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px;">
                <h4>Suggested Pests:</h4>
                <p>${result.suggestions.map(s => s.replace(/_/g, ' ').toUpperCase()).join(', ')}</p>
                <p><strong>Confidence:</strong> ${(result.confidence * 100).toFixed(0)}%</p>
                <p><strong>Reasoning:</strong> ${result.reasoning}</p>
            </div>
        `;
    } catch (error) {
        alert('Error getting AI suggestion: ' + error.message);
    }
}

function showAIServiceModal() {
    const modalHtml = `
        <div class="modal">
            <div class="modal-header">
                <h3>AI Service Recommendation</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="aiServiceForm">
                    <div class="form-group">
                        <label>Select Customer</label>
                        <select name="customerId" id="aiServiceCustomer" required>
                            <option value="">Loading customers...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Pest Type</label>
                        <select name="pestType" required>
                            <option value="general_pest_control">General Pest</option>
                            <option value="termite">Termites</option>
                            <option value="bed_bug">Bed Bugs</option>
                            <option value="rodent">Rodents</option>
                            <option value="mosquito">Mosquitoes</option>
                            <option value="cockroach">Cockroaches</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Severity</label>
                        <select name="severity" required>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="severe">Severe</option>
                        </select>
                    </div>
                </form>
                <div id="aiServiceResult" style="margin-top: 20px;"></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="getAIServiceRecommendation()">Get Recommendation</button>
            </div>
        </div>
    `;
    showModal(modalHtml);
    loadCustomersForAI('aiServiceCustomer');
}

async function getAIServiceRecommendation() {
    const form = document.getElementById('aiServiceForm');
    const formData = new FormData(form);
    const data = {};
    
    formData.forEach((value, key) => {
        data[key] = value;
    });
    
    try {
        const result = await apiCall('/ai/service-recommendation', 'POST', data);
        const rec = result.recommendation;
        document.getElementById('aiServiceResult').innerHTML = `
            <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px;">
                <h4>Recommended Service:</h4>
                <p><strong>Type:</strong> ${rec.serviceType.replace(/_/g, ' ').toUpperCase()}</p>
                <p><strong>Frequency:</strong> ${rec.frequency.replace(/_/g, ' ').toUpperCase()}</p>
                <p><strong>Estimated Duration:</strong> ${rec.estimatedDuration}</p>
                <p><strong>Chemicals:</strong> ${rec.chemicals.join(', ') || 'N/A'}</p>
                <p><strong>Follow-up in:</strong> ${rec.followUpDays} days</p>
                <p><strong>Confidence:</strong> ${(result.confidence * 100).toFixed(0)}%</p>
            </div>
        `;
    } catch (error) {
        alert('Error getting AI recommendation: ' + error.message);
    }
}

function showAIFollowUpModal() {
    const modalHtml = `
        <div class="modal">
            <div class="modal-header">
                <h3>AI Follow-up Prediction</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="aiFollowUpForm">
                    <div class="form-group">
                        <label>Select Customer</label>
                        <select name="customerId" id="aiFollowUpCustomer" required>
                            <option value="">Loading customers...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Service Type</label>
                        <select name="serviceType" required>
                            <option value="general_pest_control">General Pest Control</option>
                            <option value="termite_treatment">Termite Treatment</option>
                            <option value="bed_bug_treatment">Bed Bug Treatment</option>
                            <option value="rodent_control">Rodent Control</option>
                            <option value="mosquito_control">Mosquito Control</option>
                            <option value="cockroach_control">Cockroach Control</option>
                        </select>
                    </div>
                </form>
                <div id="aiFollowUpResult" style="margin-top: 20px;"></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="getAIFollowUpPrediction()">Predict Follow-up</button>
            </div>
        </div>
    `;
    showModal(modalHtml);
    loadCustomersForAI('aiFollowUpCustomer');
}

async function getAIFollowUpPrediction() {
    const form = document.getElementById('aiFollowUpForm');
    const formData = new FormData(form);
    const data = {};
    
    formData.forEach((value, key) => {
        data[key] = value;
    });
    
    try {
        const result = await apiCall('/ai/followup-prediction', 'POST', data);
        document.getElementById('aiFollowUpResult').innerHTML = `
            <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px;">
                <h4>Predicted Follow-up:</h4>
                <p><strong>Date:</strong> ${new Date(result.predictedFollowUpDate).toLocaleDateString()}</p>
                <p><strong>Recommended Days:</strong> ${result.recommendedFollowUpDays} days</p>
                <p><strong>Loyalty Score:</strong> ${result.loyaltyScore.toUpperCase()}</p>
                <p><strong>Confidence:</strong> ${(result.confidence * 100).toFixed(0)}%</p>
                <p><strong>Factors:</strong> ${result.factors.join(', ')}</p>
            </div>
        `;
    } catch (error) {
        alert('Error getting AI prediction: ' + error.message);
    }
}

function showAIRiskModal() {
    const modalHtml = `
        <div class="modal">
            <div class="modal-header">
                <h3>Customer Risk Assessment</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="aiRiskForm">
                    <div class="form-group">
                        <label>Select Customer</label>
                        <select name="customerId" id="aiRiskCustomer" required>
                            <option value="">Loading customers...</option>
                        </select>
                    </div>
                </form>
                <div id="aiRiskResult" style="margin-top: 20px;"></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="getAIRiskAssessment()">Assess Risk</button>
            </div>
        </div>
    `;
    showModal(modalHtml);
    loadCustomersForAI('aiRiskCustomer');
}

async function getAIRiskAssessment() {
    const form = document.getElementById('aiRiskForm');
    const customerId = form.querySelector('[name="customerId"]').value;
    
    try {
        const result = await apiCall('/ai/risk-assessment', 'POST', { customerId });
        document.getElementById('aiRiskResult').innerHTML = `
            <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px;">
                <h4>Risk Assessment:</h4>
                <p><strong>Risk Level:</strong> <span class="status-badge status-${result.riskLevel === 'high' ? 'cancelled' : result.riskLevel === 'medium' ? 'in_progress' : 'completed'}">${result.riskLevel.toUpperCase()}</span></p>
                <p><strong>Risk Score:</strong> ${result.riskScore}/100</p>
                <p><strong>Risk Factors:</strong></p>
                <ul>${result.riskFactors.map(f => `<li>${f}</li>`).join('')}</ul>
                <p><strong>Recommendations:</strong></p>
                <ul>${result.recommendations.map(r => `<li>${r}</li>`).join('')}</ul>
            </div>
        `;
    } catch (error) {
        alert('Error getting risk assessment: ' + error.message);
    }
}

async function loadCustomersForAI(selectId) {
    try {
        const customers = await apiCall('/customers');
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">Select Customer</option>' + 
            customers.map(c => `<option value="${c._id}">${c.name}</option>`).join('');
    } catch (error) {
        console.error('Error loading customers:', error);
    }
}

// Modal functions
function showModal(html) {
    const container = document.getElementById('modalContainer');
    container.innerHTML = html;
    container.classList.remove('hidden');
}

function closeModal() {
    const container = document.getElementById('modalContainer');
    container.classList.add('hidden');
    container.innerHTML = '';
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
