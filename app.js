// Hospital Management System - Application Logic

// ============================================
// GOOGLE SHEETS CONFIGURATION
// ============================================
// Instructions:
// 1. Create a Google Spreadsheet with sheets: Patients, Doctors, Appointments, Departments
// 2. Create a Google Apps Script and deploy as Web App
// 3. Paste the Web App URL below
// 4. Set USE_GOOGLE_SHEETS to true
const CONFIG = {
  GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwG3Y65nwZyr1RwonwdU-qzo5GolN2vcQeoXMCckHmVWrC2i8uoh9sGVplzA9eYN4DLEQ/exec', // Add your Google Apps Script Web App URL here
  SPREADSHEET_ID: '',     // Optional: Your Spreadsheet ID for reference
  USE_GOOGLE_SHEETS: true // Set to true when URLs are configured
};

// ============================================
// DATA STORAGE (In-Memory)
// ============================================
let hospitalData = {
  patients: [],
  doctors: [],
  departments: [],
  appointments: [],
  analytics: {
    patient_age_distribution: { Child: 0, Adult: 0, Elderly: 0 },
    patient_department_distribution: {},
    weekly_appointments: [
      { day: 'Mon', appointments: 0 },
      { day: 'Tue', appointments: 0 },
      { day: 'Wed', appointments: 0 },
      { day: 'Thu', appointments: 0 },
      { day: 'Fri', appointments: 0 },
      { day: 'Sat', appointments: 0 }
    ],
    monthly_revenue: []
  }
};

// ============================================
// GOOGLE SHEETS API FUNCTIONS
// ============================================

// Load data from Google Sheets
async function loadDataFromSheets() {
  if (!CONFIG.USE_GOOGLE_SHEETS || !CONFIG.GOOGLE_SCRIPT_URL) {
    console.log('Google Sheets not configured');
    return;
  }
  
  try {
    showToast('Syncing data from Google Sheets...', 'info');
    
    const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL + '?action=load', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.patients) hospitalData.patients = data.patients;
      if (data.doctors) hospitalData.doctors = data.doctors;
      if (data.appointments) hospitalData.appointments = data.appointments;
      if (data.departments) hospitalData.departments = data.departments;
      
      updateAnalytics();
      showToast('Data synced successfully!', 'success');
      
      // Refresh current view
      showView(currentView);
    } else {
      throw new Error('Failed to load data');
    }
  } catch (error) {
    console.error('Error loading from Google Sheets:', error);
    showToast('Failed to sync data from Google Sheets', 'error');
  }
}

// Save data to Google Sheets
async function saveToSheets(sheet, action, data) {
  if (!CONFIG.USE_GOOGLE_SHEETS || !CONFIG.GOOGLE_SCRIPT_URL) {
    return true; // Skip if not configured
  }
  
  try {
    const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheet, action, data })
    });
    
    if (response.ok) {
      const result = await response.json();
      return result.success;
    } else {
      throw new Error('Failed to save data');
    }
  } catch (error) {
    console.error('Error saving to Google Sheets:', error);
    showToast('Failed to sync with Google Sheets', 'error');
    return false;
  }
}

// Update analytics based on current data
function updateAnalytics() {
  // Age distribution
  hospitalData.analytics.patient_age_distribution = { Child: 0, Adult: 0, Elderly: 0 };
  hospitalData.patients.forEach(p => {
    if (p.age < 18) hospitalData.analytics.patient_age_distribution.Child++;
    else if (p.age < 60) hospitalData.analytics.patient_age_distribution.Adult++;
    else hospitalData.analytics.patient_age_distribution.Elderly++;
  });
  
  // Department distribution
  hospitalData.analytics.patient_department_distribution = {};
  hospitalData.departments.forEach(d => {
    const count = hospitalData.appointments.filter(a => {
      const doctor = hospitalData.doctors.find(doc => doc.doctor_id === a.doctor_id);
      return doctor && doctor.department === d.name;
    }).length;
    if (count > 0) {
      hospitalData.analytics.patient_department_distribution[d.name] = count;
    }
  });
}

// ============================================
// TOAST NOTIFICATION SYSTEM
// ============================================
function showToast(message, type = 'info') {
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icons = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };
  
  toast.innerHTML = `
    <i class="fas ${icons[type] || icons.info}"></i>
    <span>${message}</span>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideInUp 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============================================
// DARK MODE FUNCTIONALITY
// ============================================
let darkMode = false;

function initDarkMode() {
  const darkModeToggle = document.getElementById('darkModeToggle');
  const darkModeIcon = document.getElementById('darkModeIcon');
  
  if (darkModeToggle) {
    darkModeToggle.addEventListener('click', () => {
      darkMode = !darkMode;
      
      if (darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        darkModeIcon.classList.remove('fa-moon');
        darkModeIcon.classList.add('fa-sun');
      } else {
        document.documentElement.removeAttribute('data-theme');
        darkModeIcon.classList.remove('fa-sun');
        darkModeIcon.classList.add('fa-moon');
      }
    });
  }
}

// Chart instances
let chartInstances = {};

// Current view state
let currentView = 'dashboard';
let currentPage = { patients: 1, appointments: 1 };
const itemsPerPage = 10;

// ============================================
// INITIALIZE APPLICATION
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
  initializeNavigation();
  initDarkMode();
  updateDateTime();
  setInterval(updateDateTime, 60000);
  
  // Load data from Google Sheets if configured
  if (CONFIG.USE_GOOGLE_SHEETS) {
    await loadDataFromSheets();
  }
  
  updateStorageStatus();
  showView('dashboard');
});

// Update storage status indicator
function updateStorageStatus() {
  const statusEl = document.getElementById('storageStatus');
  if (statusEl) {
    if (CONFIG.USE_GOOGLE_SHEETS) {
      statusEl.textContent = 'Google Sheets Connected';
    } else {
      statusEl.textContent = 'Local Storage Only';
    }
  }
  
  // Update settings view status
  const sheetsStatus = document.getElementById('sheetsConnectionStatus');
  const sheetsStatusText = document.getElementById('sheetsStatusText');
  
  if (sheetsStatus && sheetsStatusText) {
    if (CONFIG.USE_GOOGLE_SHEETS && CONFIG.GOOGLE_SCRIPT_URL) {
      sheetsStatus.className = 'status-badge status-success';
      sheetsStatusText.textContent = 'Connected';
    } else {
      sheetsStatus.className = 'status-badge status-warning';
      sheetsStatusText.textContent = 'Not Configured';
    }
  }
}

// Test Google Sheets connection
async function testGoogleSheetsConnection() {
  const urlInput = document.getElementById('googleScriptUrl');
  const url = urlInput ? urlInput.value.trim() : '';
  
  if (!url) {
    showToast('Please enter Google Apps Script URL', 'warning');
    return;
  }
  
  try {
    showToast('Testing connection...', 'info');
    
    CONFIG.GOOGLE_SCRIPT_URL = url;
    CONFIG.USE_GOOGLE_SHEETS = true;
    
    await loadDataFromSheets();
    updateStorageStatus();
    showToast('Connection successful!', 'success');
  } catch (error) {
    CONFIG.USE_GOOGLE_SHEETS = false;
    showToast('Connection failed. Check URL and try again.', 'error');
  }
}

// Sync data from Google Sheets
async function syncFromSheets() {
  if (!CONFIG.USE_GOOGLE_SHEETS) {
    showToast('Google Sheets not configured', 'warning');
    return;
  }
  
  await loadDataFromSheets();
}

// Update Date Time
function updateDateTime() {
  const now = new Date();
  const options = { day: '2-digit', month: 'short', year: 'numeric' };
  const dateStr = now.toLocaleDateString('en-US', options);
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('currentDateTime').textContent = `${dateStr} ${timeStr}`;
}

// Navigation
function initializeNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      const view = this.getAttribute('data-view');
      
      navItems.forEach(nav => nav.classList.remove('active'));
      this.classList.add('active');
      
      showView(view);
    });
  });
}

function showView(viewName) {
  currentView = viewName;
  
  // Update page title
  const titles = {
    dashboard: 'Dashboard',
    patients: 'Patients',
    appointments: 'Appointments',
    doctors: 'Doctors',
    departments: 'Departments',
    schedule: 'Schedule',
    settings: 'Settings'
  };
  document.getElementById('pageTitle').textContent = titles[viewName] || 'Dashboard';
  
  // Hide all views
  document.querySelectorAll('.view-content').forEach(view => {
    view.classList.remove('active');
  });
  
  // Show selected view
  const viewElement = document.getElementById(`${viewName}View`);
  if (viewElement) {
    viewElement.classList.add('active');
  }
  
  // Load view-specific content
  switch(viewName) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'patients':
      loadPatients();
      break;
    case 'appointments':
      loadAppointments();
      break;
    case 'doctors':
      loadDoctors();
      break;
    case 'departments':
      loadDepartments();
      break;
    case 'schedule':
      loadSchedule();
      break;
  }
}

// Dashboard Functions
function loadDashboard() {
  // Update statistics
  document.getElementById('totalPatients').textContent = hospitalData.patients.length;
  
  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = hospitalData.appointments.filter(a => a.date === today).length;
  document.getElementById('todayAppointments').textContent = todayAppointments;
  
  const activeDoctors = hospitalData.doctors.filter(d => d.available).length;
  document.getElementById('activeDoctors').textContent = activeDoctors;
  
  document.getElementById('totalDepartments').textContent = hospitalData.departments.length;
  
  // Update analytics
  updateAnalytics();
  
  // Load charts
  loadCharts();
  
  // Load recent appointments
  loadRecentAppointments();
}

function loadCharts() {
  // Patient Age Distribution Chart
  const ageCtx = document.getElementById('ageChart');
  if (ageCtx) {
    if (chartInstances.ageChart) chartInstances.ageChart.destroy();
    chartInstances.ageChart = new Chart(ageCtx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(hospitalData.analytics.patient_age_distribution),
        datasets: [{
          data: Object.values(hospitalData.analytics.patient_age_distribution),
          backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { padding: 20, font: { size: 12 } } },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }
  
  // Department Distribution Chart
  const deptCtx = document.getElementById('departmentChart');
  if (deptCtx) {
    if (chartInstances.deptChart) chartInstances.deptChart.destroy();
    chartInstances.deptChart = new Chart(deptCtx, {
      type: 'pie',
      data: {
        labels: Object.keys(hospitalData.analytics.patient_department_distribution),
        datasets: [{
          data: Object.values(hospitalData.analytics.patient_department_distribution),
          backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { padding: 20, font: { size: 12 } } },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }
  
  // Weekly Appointments Chart
  const weeklyCtx = document.getElementById('weeklyChart');
  if (weeklyCtx) {
    if (chartInstances.weeklyChart) chartInstances.weeklyChart.destroy();
    chartInstances.weeklyChart = new Chart(weeklyCtx, {
      type: 'bar',
      data: {
        labels: hospitalData.analytics.weekly_appointments.map(w => w.day),
        datasets: [{
          label: 'Appointments',
          data: hospitalData.analytics.weekly_appointments.map(w => w.appointments),
          backgroundColor: '#2563EB',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, grid: { display: true } },
          x: { grid: { display: false } }
        }
      }
    });
  }
  
  // Monthly Revenue Chart
  const revenueCtx = document.getElementById('revenueChart');
  if (revenueCtx) {
    if (chartInstances.revenueChart) chartInstances.revenueChart.destroy();
    chartInstances.revenueChart = new Chart(revenueCtx, {
      type: 'line',
      data: {
        labels: hospitalData.analytics.monthly_revenue.map(m => m.month),
        datasets: [
          {
            label: 'Income',
            data: hospitalData.analytics.monthly_revenue.map(m => m.income),
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4
          },
          {
            label: 'Expense',
            data: hospitalData.analytics.monthly_revenue.map(m => m.expense),
            borderColor: '#EF4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: true,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' }
        },
        scales: {
          y: { beginAtZero: true, grid: { display: true } },
          x: { grid: { display: false } }
        }
      }
    });
  }
}

function loadRecentAppointments() {
  const tbody = document.getElementById('recentAppointmentsTable');
  if (!tbody) return;
  
  if (hospitalData.appointments.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <i class="fas fa-calendar-times"></i>
            <h3>No Appointments Yet</h3>
            <p>Schedule your first appointment to get started</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  const recent = hospitalData.appointments.slice(0, 5);
  tbody.innerHTML = recent.map(appt => {
    const patient = hospitalData.patients.find(p => p.patient_id === appt.patient_id);
    const doctor = hospitalData.doctors.find(d => d.doctor_id === appt.doctor_id);
    return `
      <tr>
        <td>${patient ? patient.first_name + ' ' + patient.last_name : 'N/A'}</td>
        <td>${doctor ? doctor.name : 'N/A'}</td>
        <td>${appt.treatment}</td>
        <td>${appt.date}</td>
        <td>${appt.time}</td>
        <td><span class="status-badge status-${appt.status.toLowerCase()}">${appt.status}</span></td>
      </tr>
    `;
  }).join('');
}

// Patients Functions
function loadPatients() {
  const searchInput = document.getElementById('patientSearch');
  const statusFilter = document.getElementById('patientStatusFilter');
  
  if (searchInput && !searchInput.hasAttribute('data-listener')) {
    searchInput.addEventListener('input', () => renderPatients());
    searchInput.setAttribute('data-listener', 'true');
  }
  
  if (statusFilter && !statusFilter.hasAttribute('data-listener')) {
    statusFilter.addEventListener('change', () => renderPatients());
    statusFilter.setAttribute('data-listener', 'true');
  }
  
  renderPatients();
}

function renderPatients(page = 1) {
  currentPage.patients = page;
  const tbody = document.getElementById('patientsTable');
  if (!tbody) return;
  
  if (hospitalData.patients.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">
            <i class="fas fa-user-injured"></i>
            <h3>No Patients Yet</h3>
            <p>Click "+ Add Patient" button above to register your first patient</p>
          </div>
        </td>
      </tr>
    `;
    document.getElementById('patientsPagination').innerHTML = '';
    return;
  }
  
  let filtered = [...hospitalData.patients];
  
  // Apply search filter
  const searchTerm = document.getElementById('patientSearch')?.value.toLowerCase() || '';
  if (searchTerm) {
    filtered = filtered.filter(p => 
      p.first_name.toLowerCase().includes(searchTerm) ||
      p.last_name.toLowerCase().includes(searchTerm) ||
      p.patient_id.toString().includes(searchTerm)
    );
  }
  
  // Apply status filter
  const statusFilter = document.getElementById('patientStatusFilter')?.value || 'all';
  if (statusFilter !== 'all') {
    filtered = filtered.filter(p => p.status === statusFilter);
  }
  
  // Pagination
  const start = (page - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const paginatedData = filtered.slice(start, end);
  
  tbody.innerHTML = paginatedData.map(patient => `
    <tr onclick="showPatientDetail(${patient.patient_id})">
      <td>${patient.patient_id}</td>
      <td>${patient.first_name} ${patient.last_name}</td>
      <td>${patient.age}</td>
      <td>${patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other'}</td>
      <td>${patient.phone}</td>
      <td>${patient.blood_group}</td>
      <td><span class="status-badge status-${patient.status.toLowerCase().replace(' ', '-')}">${patient.status}</span></td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); showPatientDetail(${patient.patient_id})">View</button>
        </div>
      </td>
    </tr>
  `).join('');
  
  renderPagination('patients', filtered.length);
}

function showPatientDetail(patientId) {
  const patient = hospitalData.patients.find(p => p.patient_id === patientId);
  if (!patient) return;
  
  const modal = document.getElementById('patientDetailModal');
  const content = document.getElementById('patientDetailContent');
  
  content.innerHTML = `
    <div class="patient-detail-grid">
      <div class="patient-avatar">
        <i class="fas fa-user"></i>
      </div>
      <div class="patient-details">
        <div class="detail-item">
          <span class="label">Patient ID</span>
          <span class="value">${patient.patient_id}</span>
        </div>
        <div class="detail-item">
          <span class="label">Full Name</span>
          <span class="value">${patient.first_name} ${patient.last_name}</span>
        </div>
        <div class="detail-item">
          <span class="label">Age</span>
          <span class="value">${patient.age} years</span>
        </div>
        <div class="detail-item">
          <span class="label">Gender</span>
          <span class="value">${patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other'}</span>
        </div>
        <div class="detail-item">
          <span class="label">Blood Group</span>
          <span class="value">${patient.blood_group}</span>
        </div>
        <div class="detail-item">
          <span class="label">Phone</span>
          <span class="value">${patient.phone}</span>
        </div>
        <div class="detail-item" style="grid-column: span 2;">
          <span class="label">Address</span>
          <span class="value">${patient.address}</span>
        </div>
        <div class="detail-item">
          <span class="label">Status</span>
          <span class="value"><span class="status-badge status-${patient.status.toLowerCase().replace(' ', '-')}">${patient.status}</span></span>
        </div>
      </div>
    </div>
  `;
  
  modal.classList.add('active');
}

// Appointments Functions
function loadAppointments() {
  const searchInput = document.getElementById('appointmentSearch');
  const statusFilter = document.getElementById('appointmentStatusFilter');
  const doctorFilter = document.getElementById('appointmentDoctorFilter');
  
  if (searchInput && !searchInput.hasAttribute('data-listener')) {
    searchInput.addEventListener('input', () => renderAppointments());
    searchInput.setAttribute('data-listener', 'true');
  }
  
  if (statusFilter && !statusFilter.hasAttribute('data-listener')) {
    statusFilter.addEventListener('change', () => renderAppointments());
    statusFilter.setAttribute('data-listener', 'true');
  }
  
  if (doctorFilter && !doctorFilter.hasAttribute('data-listener')) {
    doctorFilter.addEventListener('change', () => renderAppointments());
    doctorFilter.setAttribute('data-listener', 'true');
  }
  
  // Populate doctor filter
  if (doctorFilter && !doctorFilter.hasAttribute('data-populated')) {
    doctorFilter.innerHTML = '<option value="all">All Doctors</option>' +
      hospitalData.doctors.map(d => `<option value="${d.doctor_id}">${d.name}</option>`).join('');
    doctorFilter.setAttribute('data-populated', 'true');
  }
  
  renderAppointments();
}

function renderAppointments(page = 1) {
  currentPage.appointments = page;
  const tbody = document.getElementById('appointmentsTable');
  if (!tbody) return;
  
  if (hospitalData.appointments.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">
            <i class="fas fa-calendar-plus"></i>
            <h3>No Appointments Scheduled</h3>
            <p>Click "+ New Appointment" to schedule your first appointment</p>
          </div>
        </td>
      </tr>
    `;
    document.getElementById('appointmentsPagination').innerHTML = '';
    return;
  }
  
  let filtered = [...hospitalData.appointments];
  
  // Apply filters
  const searchTerm = document.getElementById('appointmentSearch')?.value.toLowerCase() || '';
  if (searchTerm) {
    filtered = filtered.filter(a => {
      const patient = hospitalData.patients.find(p => p.patient_id === a.patient_id);
      const doctor = hospitalData.doctors.find(d => d.doctor_id === a.doctor_id);
      return patient && (patient.first_name.toLowerCase().includes(searchTerm) ||
                        patient.last_name.toLowerCase().includes(searchTerm)) ||
             doctor && doctor.name.toLowerCase().includes(searchTerm) ||
             a.treatment.toLowerCase().includes(searchTerm);
    });
  }
  
  const statusFilter = document.getElementById('appointmentStatusFilter')?.value || 'all';
  if (statusFilter !== 'all') {
    filtered = filtered.filter(a => a.status === statusFilter);
  }
  
  const doctorFilter = document.getElementById('appointmentDoctorFilter')?.value || 'all';
  if (doctorFilter !== 'all') {
    filtered = filtered.filter(a => a.doctor_id.toString() === doctorFilter);
  }
  
  // Pagination
  const start = (page - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const paginatedData = filtered.slice(start, end);
  
  tbody.innerHTML = paginatedData.map(appt => {
    const patient = hospitalData.patients.find(p => p.patient_id === appt.patient_id);
    const doctor = hospitalData.doctors.find(d => d.doctor_id === appt.doctor_id);
    return `
      <tr>
        <td>${appt.appt_id}</td>
        <td>${patient ? patient.first_name + ' ' + patient.last_name : 'N/A'}</td>
        <td>${doctor ? doctor.name : 'N/A'}</td>
        <td>${appt.date}</td>
        <td>${appt.time}</td>
        <td>${appt.treatment}</td>
        <td><span class="status-badge status-${appt.status.toLowerCase()}">${appt.status}</span></td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-sm btn-secondary">View</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
  
  renderPagination('appointments', filtered.length);
}

// Doctors Functions
function loadDoctors() {
  const grid = document.getElementById('doctorsGrid');
  if (!grid) return;
  
  if (hospitalData.doctors.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <i class="fas fa-user-md"></i>
        <h3>No Doctors Registered</h3>
        <p>Add doctors to manage appointments and schedules</p>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = hospitalData.doctors.map(doctor => {
    const todayAppts = hospitalData.appointments.filter(a => 
      a.doctor_id === doctor.doctor_id && a.date === '2025-10-26'
    ).length;
    
    return `
      <div class="doctor-card">
        <div class="doctor-header">
          <div class="doctor-avatar">
            <i class="fas fa-user-md"></i>
          </div>
          <div class="doctor-info">
            <h3>${doctor.name}</h3>
            <p>${doctor.department}</p>
          </div>
        </div>
        <div class="doctor-details">
          <div class="detail-row">
            <span>Specialization:</span>
            <span>${doctor.specialist}</span>
          </div>
          <div class="detail-row">
            <span>Phone:</span>
            <span>${doctor.phone}</span>
          </div>
          <div class="detail-row">
            <span>Today's Appointments:</span>
            <span>${todayAppts}</span>
          </div>
          <div class="detail-row">
            <span>Availability:</span>
            <span class="status-badge status-${doctor.available ? 'available' : 'unavailable'}">
              <span class="status-dot"></span>
              ${doctor.available ? 'Available' : 'Unavailable'}
            </span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Departments Functions
function loadDepartments() {
  const grid = document.getElementById('departmentsGrid');
  if (!grid) return;
  
  if (hospitalData.departments.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <i class="fas fa-building"></i>
        <h3>No Departments</h3>
        <p>Add departments to organize your hospital services</p>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = hospitalData.departments.map(dept => `
    <div class="department-card">
      <div class="department-icon">
        <i class="fas ${dept.icon}"></i>
      </div>
      <h3>${dept.name}</h3>
      <p>${dept.description}</p>
      <div class="department-stats">
        <div class="stat-item">
          <div class="value">${dept.total_doctors}</div>
          <div class="label">Doctors</div>
        </div>
        <div class="stat-item">
          <div class="value">${Math.floor(Math.random() * 50 + 20)}</div>
          <div class="label">Patients</div>
        </div>
      </div>
    </div>
  `).join('');
}

// Schedule Functions
function loadSchedule() {
  const container = document.getElementById('scheduleContainer');
  if (!container) return;
  
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const times = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
  
  let html = '<table class="schedule-table"><thead><tr><th>Time</th>';
  days.forEach(day => html += `<th>${day}</th>`);
  html += '</tr></thead><tbody>';
  
  times.forEach(time => {
    html += `<tr><td class="time-slot">${time}</td>`;
    days.forEach(() => {
      const hasAppt = Math.random() > 0.6;
      if (hasAppt) {
        const randomDoctor = hospitalData.doctors[Math.floor(Math.random() * hospitalData.doctors.length)];
        html += `<td><div class="schedule-item">${randomDoctor.name.split(' ')[1]}</div></td>`;
      } else {
        html += '<td></td>';
      }
    });
    html += '</tr>';
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
}

function changeWeek(direction) {
  // Mock function for week navigation
  console.log('Changing week by', direction);
}

// Pagination
function renderPagination(type, totalItems) {
  const paginationContainer = document.getElementById(`${type}Pagination`);
  if (!paginationContainer) return;
  
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const currentPageNum = currentPage[type] || 1;
  
  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }
  
  let html = '';
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="page-btn ${i === currentPageNum ? 'active' : ''}" onclick="render${type.charAt(0).toUpperCase() + type.slice(1)}(${i})">${i}</button>`;
  }
  
  paginationContainer.innerHTML = html;
}

// Modal Functions
function openAddPatientModal() {
  document.getElementById('addPatientModal').classList.add('active');
}

function openAddAppointmentModal() {
  // Check if patients and doctors exist
  if (hospitalData.patients.length === 0) {
    showToast('Please add patients first before scheduling appointments', 'warning');
    return;
  }
  
  if (hospitalData.doctors.length === 0) {
    showToast('Please add doctors first before scheduling appointments', 'warning');
    return;
  }
  
  // Populate patient select
  const patientSelect = document.getElementById('appointmentPatientSelect');
  patientSelect.innerHTML = '<option value="">Select Patient</option>' +
    hospitalData.patients.map(p => `<option value="${p.patient_id}">${p.first_name} ${p.last_name}</option>`).join('');
  
  // Populate doctor select
  const doctorSelect = document.getElementById('appointmentDoctorSelect');
  doctorSelect.innerHTML = '<option value="">Select Doctor</option>' +
    hospitalData.doctors.map(d => `<option value="${d.doctor_id}">${d.name}</option>`).join('');
  
  document.getElementById('addAppointmentModal').classList.add('active');
}

function openAddDoctorModal() {
  alert('Add Doctor functionality - Coming Soon!');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

// Form Handlers
async function handleAddPatient(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const submitBtn = event.target.querySelector('button[type="submit"]');
  
  // Show loading state
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="loading-spinner"></span> Adding...';
  
  const newPatient = {
    patient_id: hospitalData.patients.length > 0 ? Math.max(...hospitalData.patients.map(p => p.patient_id)) + 1 : 1,
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name'),
    gender: formData.get('gender'),
    age: parseInt(formData.get('age')),
    phone: formData.get('phone'),
    address: formData.get('address'),
    blood_group: formData.get('blood_group'),
    status: 'New Patient'
  };
  
  // Add to local data
  hospitalData.patients.push(newPatient);
  
  // Sync to Google Sheets
  if (CONFIG.USE_GOOGLE_SHEETS) {
    await saveToSheets('Patients', 'add', newPatient);
  }
  
  // Reset form and close modal
  submitBtn.disabled = false;
  submitBtn.innerHTML = 'Add Patient';
  closeModal('addPatientModal');
  event.target.reset();
  
  // Update view
  updateAnalytics();
  renderPatients();
  showToast('Patient added successfully!', 'success');
}

async function handleAddAppointment(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const submitBtn = event.target.querySelector('button[type="submit"]');
  
  // Validate patient and doctor selection
  if (!formData.get('patient_id') || !formData.get('doctor_id')) {
    showToast('Please select both patient and doctor', 'warning');
    return;
  }
  
  // Show loading state
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="loading-spinner"></span> Scheduling...';
  
  const newAppointment = {
    appt_id: hospitalData.appointments.length > 0 ? Math.max(...hospitalData.appointments.map(a => a.appt_id)) + 1 : 1,
    patient_id: parseInt(formData.get('patient_id')),
    doctor_id: parseInt(formData.get('doctor_id')),
    date: formData.get('date'),
    time: formData.get('time'),
    treatment: formData.get('treatment'),
    status: 'Pending',
    notes: formData.get('notes') || ''
  };
  
  // Add to local data
  hospitalData.appointments.push(newAppointment);
  
  // Sync to Google Sheets
  if (CONFIG.USE_GOOGLE_SHEETS) {
    await saveToSheets('Appointments', 'add', newAppointment);
  }
  
  // Reset form and close modal
  submitBtn.disabled = false;
  submitBtn.innerHTML = 'Schedule Appointment';
  closeModal('addAppointmentModal');
  event.target.reset();
  
  // Update view
  updateAnalytics();
  renderAppointments();
  showToast('Appointment scheduled successfully!', 'success');
}

// Table Sorting
function sortTable(type, column) {
  // Simple sorting implementation
  const data = hospitalData[type];
  const isAscending = data._sortColumn === column && data._sortOrder === 'asc';
  
  data.sort((a, b) => {
    if (a[column] < b[column]) return isAscending ? 1 : -1;
    if (a[column] > b[column]) return isAscending ? -1 : 1;
    return 0;
  });
  
  data._sortColumn = column;
  data._sortOrder = isAscending ? 'desc' : 'asc';
  
  if (type === 'patients') renderPatients();
  if (type === 'appointments') renderAppointments();
}

// Global search (header)
const globalSearch = document.getElementById('globalSearch');
if (globalSearch) {
  globalSearch.addEventListener('input', function() {
    const term = this.value.toLowerCase();
    if (!term) return;
    
    // Simple global search - navigate to relevant view
    const foundPatient = hospitalData.patients.find(p => 
      p.first_name.toLowerCase().includes(term) || p.last_name.toLowerCase().includes(term)
    );
    
    if (foundPatient && currentView !== 'patients') {
      showView('patients');
      document.getElementById('patientSearch').value = term;
      renderPatients();
    }
  });
}

// Close modals on backdrop click
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('active');
  }
});
