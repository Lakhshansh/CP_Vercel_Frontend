/**
 * Multi Therapy - Global Role-Based Healthcare Sidebar Component
 * Supports:
 * 1. Admin Sidebar (12 items)
 * 2. Doctor Sidebar (8 items)
 * 3. Patient Sidebar (9 items)
 * Features:
 * - Dark navy background (#082B59)
 * - White icons and text
 * - Blue active navigation highlight (#0D6EFD)
 * - Desktop: 260px fixed width sidebar
 * - Tablet/Mobile: Collapsible offcanvas drawer with backdrop overlay
 * - Consistent spacing and smooth transitions
 */

(function () {
  'use strict';

  function getBasePath() {
    if (typeof window === 'undefined') return './';
    const path = window.location.pathname.replace(/\\/g, '/');
    const segments = path.split('/').filter(Boolean);
    if (segments.length > 1) {
      return '../'.repeat(segments.length - 1);
    }
    return './';
  }

  function getAuthRole() {
    let role = 'guest';
    const storage = (typeof window !== 'undefined' && window.localStorage) ? window.localStorage : null;
    const sStorage = (typeof window !== 'undefined' && window.sessionStorage) ? window.sessionStorage : null;
    try {
      const raw = storage ? (storage.getItem('currentUser') || (sStorage ? sStorage.getItem('currentUser') : null)) : null;
      if (raw) {
        const u = JSON.parse(raw);
        const r = (u.role || '').toLowerCase();
        if (r === 'doctor' || r === 'physiotherapist') role = 'doctor';
        else if (r === 'therapist') role = 'therapist';
        else if (r === 'admin' || r === 'superadmin') role = 'admin';
        else role = 'patient';
      }
    } catch (e) {}

    const adminRole = (storage ? (storage.getItem('adminRole') || '') : '').toLowerCase();
    const isAdmin = sStorage && (sStorage.getItem('admin_logged_in') === 'true');
    if (adminRole === 'superadmin' || adminRole === 'admin' || isAdmin) {
      role = 'admin';
    }
    return role;
  }

  function getActiveFilename() {
    if (typeof window === 'undefined') return '';
    return window.location.pathname.split('/').pop().split('?')[0].split('#')[0] || 'index.html';
  }

  function getAdminSidebarHTML(base, activeFile) {
    const items = [
      { id: 'sb-admin-dash', label: 'Dashboard', icon: '📊', href: `${base}admin-dashboard.html`, match: ['admin-dashboard.html'] },
      { id: 'sb-admin-doc', label: 'Manage Doctors', icon: '🩺', href: `${base}doctors.html`, match: ['doctors.html'] },
      { id: 'sb-admin-pt', label: 'Manage Patients', icon: '👥', href: `${base}patients.html`, match: ['patients.html'] },
      { id: 'sb-admin-tp', label: 'Manage Therapists', icon: '🧑‍⚕️', href: `${base}therapists.html`, match: ['therapists.html'] },
      { id: 'sb-admin-apt', label: 'Appointments', icon: '📅', href: `${base}appointments.html`, match: ['appointments.html'] },
      { id: 'sb-admin-ts', label: 'Therapy Sessions', icon: '⏱️', href: `${base}therapy-sessions.html`, match: ['therapy-sessions.html'] },
      { id: 'sb-admin-pr', label: 'Progress Reports', icon: '📈', href: `${base}exercises.html`, match: ['exercises.html'] },
      { id: 'sb-admin-sub', label: 'Subscriptions', icon: '💎', href: `${base}admin-subscriptions.html`, match: ['admin-subscriptions.html', 'admin-plans.html', 'admin-payments.html'] },
      { id: 'sb-admin-hosp', label: 'Hospitals / Clinics', icon: '🏥', href: `${base}hospital-subscriptions.html`, match: ['hospital-subscriptions.html', 'hospital-pricing.html'] },
      { id: 'sb-admin-rev', label: 'Reports & Analytics', icon: '📉', href: `${base}admin-revenue-analytics.html`, match: ['admin-revenue-analytics.html'] },
      { id: 'sb-admin-set', label: 'System Settings', icon: '⚙️', href: `${base}admin-dashboard.html#adminSettingsSection`, match: [] }
    ];

    return `
      <div class="mt-sidebar-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${base}images/multi_therapy_logo_100x100.png" alt="Logo" width="34" height="34" style="border-radius: 50%; background: #fff; padding: 2px;">
          <div>
            <div style="font-weight: 800; font-size: 14px; color: #fff;">Multi Therapy</div>
            <span class="mt-sidebar-role-badge">ADMIN PANEL</span>
          </div>
        </div>
        <button type="button" class="mt-sidebar-close-btn d-lg-none" id="mtSidebarCloseBtn" style="background:none; border:none; color:#fff; font-size:20px; cursor:pointer;" aria-label="Close Sidebar">&times;</button>
      </div>

      <div class="mt-sidebar-nav">
        <div class="mt-sidebar-section-title">Administration</div>
        ${items.map(it => {
          const isActive = it.match.includes(activeFile) || (it.match.length === 0 && window.location.hash.includes(it.id));
          return `
            <a href="${it.href}" id="${it.id}" class="mt-sidebar-link ${isActive ? 'active' : ''}">
              <span class="icon">${it.icon}</span>
              <span>${it.label}</span>
            </a>
          `;
        }).join('')}
      </div>

      <div class="mt-sidebar-footer">
        <button type="button" class="mt-sidebar-logout-btn" onclick="if(window.handleGlobalLogout) window.handleGlobalLogout(); else window.location.href='${base}index.html';">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span>Logout</span>
        </button>
      </div>
    `;
  }

  function getDoctorSidebarHTML(base, activeFile) {
    const items = [
      { id: 'sb-doc-dash', label: 'Dashboard', icon: '🩺', href: `${base}doctor-home.html`, match: ['doctor-home.html'] },
      { id: 'sb-doc-pt', label: 'My Patients', icon: '👥', href: `${base}patients.html`, match: ['patients.html'] },
      { id: 'sb-doc-apt', label: 'Appointments', icon: '📅', href: `${base}doctor-appointments.html`, match: ['doctor-appointments.html', 'appointments.html'] },
      { id: 'sb-doc-tm', label: 'Therapy Management', icon: '⏱️', href: `${base}therapy-sessions.html`, match: ['therapy-sessions.html'] },
      { id: 'sb-doc-pr', label: 'Progress Reports', icon: '📈', href: `${base}exercises.html`, match: ['exercises.html'] },
      { id: 'sb-doc-prof', label: 'My Profile', icon: '👤', href: `${base}doctor-profile.html`, match: ['doctor-profile.html'] },
      { id: 'sb-doc-notif', label: 'Notifications', icon: '🔔', href: `${base}doctor-home.html#appointmentRequestsPanel`, match: [] }
    ];

    return `
      <div class="mt-sidebar-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${base}images/multi_therapy_logo_100x100.png" alt="Logo" width="34" height="34" style="border-radius: 50%; background: #fff; padding: 2px;">
          <div>
            <div style="font-weight: 800; font-size: 14px; color: #fff;">Multi Therapy</div>
            <span class="mt-sidebar-role-badge">DOCTOR PORTAL</span>
          </div>
        </div>
        <button type="button" class="mt-sidebar-close-btn d-lg-none" id="mtSidebarCloseBtn" style="background:none; border:none; color:#fff; font-size:20px; cursor:pointer;" aria-label="Close Sidebar">&times;</button>
      </div>

      <div class="mt-sidebar-nav">
        <div class="mt-sidebar-section-title">Clinical Practice</div>
        ${items.map(it => {
          const isActive = it.match.includes(activeFile);
          return `
            <a href="${it.href}" id="${it.id}" class="mt-sidebar-link ${isActive ? 'active' : ''}">
              <span class="icon">${it.icon}</span>
              <span>${it.label}</span>
            </a>
          `;
        }).join('')}
      </div>

      <div class="mt-sidebar-footer">
        <button type="button" class="mt-sidebar-logout-btn" onclick="if(window.handleGlobalLogout) window.handleGlobalLogout(); else window.location.href='${base}index.html';">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span>Logout</span>
        </button>
      </div>
    `;
  }

  function getPatientSidebarHTML(base, activeFile) {
    const items = [
      { id: 'sb-pt-dash', label: 'Dashboard', icon: '🏠', href: `${base}patient-home.html`, match: ['patient-home.html'] },
      { id: 'sb-pt-sdoc', label: 'Search Doctor', icon: '🩺', href: `${base}doctors.html`, match: ['doctors.html', 'directory.html'] },
      { id: 'sb-pt-stp', label: 'Search Therapist', icon: '🧑‍⚕️', href: `${base}therapists.html`, match: ['therapists.html'] },
      { id: 'sb-pt-book', label: 'Book Appointment', icon: '➕', href: `${base}patient-appointments.html#bookAppointmentCard`, match: [] },
      { id: 'sb-pt-myapt', label: 'My Appointments', icon: '📅', href: `${base}patient-appointments.html#myAppointmentsCard`, match: ['patient-appointments.html'] },
      { id: 'sb-pt-ts', label: 'My Therapy Sessions', icon: '⏱️', href: `${base}therapy-sessions.html`, match: ['therapy-sessions.html'] },
      { id: 'sb-pt-pr', label: 'My Progress Reports', icon: '📈', href: `${base}exercises.html`, match: ['exercises.html'] },
      { id: 'sb-pt-prof', label: 'My Profile', icon: '👤', href: `${base}patient-profile.html`, match: ['patient-profile.html'] }
    ];

    return `
      <div class="mt-sidebar-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${base}images/multi_therapy_logo_100x100.png" alt="Logo" width="34" height="34" style="border-radius: 50%; background: #fff; padding: 2px;">
          <div>
            <div style="font-weight: 800; font-size: 14px; color: #fff;">Multi Therapy</div>
            <span class="mt-sidebar-role-badge">PATIENT PORTAL</span>
          </div>
        </div>
        <button type="button" class="mt-sidebar-close-btn d-lg-none" id="mtSidebarCloseBtn" style="background:none; border:none; color:#fff; font-size:20px; cursor:pointer;" aria-label="Close Sidebar">&times;</button>
      </div>

      <div class="mt-sidebar-nav">
        <div class="mt-sidebar-section-title">Patient Care</div>
        ${items.map(it => {
          const isActive = it.match.includes(activeFile);
          return `
            <a href="${it.href}" id="${it.id}" class="mt-sidebar-link ${isActive ? 'active' : ''}">
              <span class="icon">${it.icon}</span>
              <span>${it.label}</span>
            </a>
          `;
        }).join('')}
      </div>

      <div class="mt-sidebar-footer">
        <button type="button" class="mt-sidebar-logout-btn" onclick="if(window.handleGlobalLogout) window.handleGlobalLogout(); else window.location.href='${base}index.html';">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span>Logout</span>
        </button>
      </div>
    `;
  }

  function renderSidebar() {
    if (typeof document === 'undefined') return;
    const role = getAuthRole();
    const activeFile = getActiveFilename();
    const base = getBasePath();

    // Check if this page should have an active role sidebar
    const isAdminPage = activeFile.startsWith('admin-');
    const isDoctorPage = ['doctor-home.html', 'doctor-profile.html', 'doctor-appointments.html'].includes(activeFile) || (role === 'doctor' && ['patients.html', 'therapy-sessions.html'].includes(activeFile));
    const isPatientPage = ['patient-home.html', 'patient-profile.html', 'patient-appointments.html', 'exercises.html'].includes(activeFile) || (role === 'patient' && ['therapy-sessions.html', 'doctors.html', 'therapists.html'].includes(activeFile));

    let sidebarTargetRole = null;
    if (isAdminPage || role === 'admin') sidebarTargetRole = 'admin';
    else if (isDoctorPage || (role === 'doctor' && !['index.html', 'login.html', 'patient-login.html', 'signup.html'].includes(activeFile))) sidebarTargetRole = 'doctor';
    else if (isPatientPage || (role === 'patient' && !['index.html', 'login.html', 'doctor-login.html', 'signup.html'].includes(activeFile))) sidebarTargetRole = 'patient';

    if (!sidebarTargetRole) return;

    let sidebar = document.getElementById('mtSidebar');
    if (!sidebar) {
      sidebar = document.createElement('aside');
      sidebar.id = 'mtSidebar';
      sidebar.className = 'mt-sidebar';

      // Insert into .mt-app-wrapper if available, else look for main/body
      const appWrapper = document.querySelector('.mt-app-wrapper');
      if (appWrapper) {
        appWrapper.insertBefore(sidebar, appWrapper.firstChild);
      } else {
        const main = document.querySelector('main') || document.body;
        // If main exists and body is not wrapper, wrap main or insert
        if (main && main.parentElement && main !== document.body) {
          const wrapper = document.createElement('div');
          wrapper.className = 'mt-app-wrapper';
          main.parentElement.insertBefore(wrapper, main);
          wrapper.appendChild(sidebar);
          wrapper.appendChild(main);
          main.classList.add('mt-main-content');
        }
      }
    }

    if (sidebar) {
      if (sidebarTargetRole === 'admin') {
        sidebar.innerHTML = getAdminSidebarHTML(base, activeFile);
      } else if (sidebarTargetRole === 'doctor') {
        sidebar.innerHTML = getDoctorSidebarHTML(base, activeFile);
      } else if (sidebarTargetRole === 'patient') {
        sidebar.innerHTML = getPatientSidebarHTML(base, activeFile);
      }

      // Add close button listener
      const closeBtn = sidebar.querySelector('#mtSidebarCloseBtn');
      if (closeBtn) {
        closeBtn.onclick = function () {
          sidebar.classList.remove('open');
          const overlay = document.getElementById('mtSidebarOverlay');
          if (overlay) overlay.classList.remove('active');
        };
      }
    }
  }

  // Auto initialize on DOM ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', renderSidebar);
    } else {
      renderSidebar();
    }
  }

  if (typeof window !== 'undefined') {
    window.renderMultiTherapySidebar = renderSidebar;
  }
})();

