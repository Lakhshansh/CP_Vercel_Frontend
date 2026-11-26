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
    const cleanFile = activeFile.replace(/\.html$/, '');
    const items = [
      { id: 'sb-admin-dash', label: 'Overview & Analytics', icon: '📊', href: `${base}admin-dashboard.html`, match: ['admin-dashboard.html', 'admin-dashboard'] },
      { id: 'sb-admin-doc', label: 'Manage Doctors', icon: '🩺', href: `${base}doctors.html`, match: ['doctors.html', 'doctors'] },
      { id: 'sb-admin-pt', label: 'Manage Patients', icon: '👥', href: `${base}patients.html`, match: ['patients.html', 'patients'] },
      { id: 'sb-admin-tp', label: 'Manage Therapists', icon: '🧑‍⚕️', href: `${base}therapists.html`, match: ['therapists.html', 'therapists'] },
      { id: 'sb-admin-hosp', label: 'Manage Hospitals & Clinics', icon: '🏥', href: `${base}hospital-subscriptions.html`, match: ['hospital-subscriptions.html', 'hospital-subscriptions', 'hospital-pricing.html', 'hospital-pricing'] },
      { id: 'sb-admin-apt', label: 'Appointments', icon: '📅', href: `${base}appointments.html`, match: ['appointments.html', 'appointments'] },
      { id: 'sb-admin-ts', label: 'Therapy Sessions', icon: '⏱️', href: `${base}therapy-sessions.html`, match: ['therapy-sessions.html', 'therapy-sessions'] },
      { id: 'sb-admin-pr', label: 'Progress Reports', icon: '📈', href: `${base}progress-reports.html`, match: ['progress-reports.html', 'progress-reports', 'exercises.html', 'exercises'] },
      { id: 'sb-admin-sub', label: 'Subscription Management', icon: '💎', href: `${base}admin-subscriptions.html`, match: ['admin-subscriptions.html', 'admin-subscriptions'] },
      { id: 'sb-admin-plan', label: 'Membership Plans', icon: '📋', href: `${base}admin-plans.html`, match: ['admin-plans.html', 'admin-plans'] },
      { id: 'sb-admin-pay', label: 'Payment Transactions', icon: '💳', href: `${base}admin-payments.html`, match: ['admin-payments.html', 'admin-payments'] },
      { id: 'sb-admin-coup', label: 'Promotional Coupons', icon: '🏷️', href: `${base}admin-coupons.html`, match: ['admin-coupons.html', 'admin-coupons'] },
      { id: 'sb-admin-rev', label: 'Revenue Analytics', icon: '📉', href: `${base}admin-revenue-analytics.html`, match: ['admin-revenue-analytics.html', 'admin-revenue-analytics'] },
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
          const isActive = it.match.includes(activeFile) || it.match.includes(cleanFile) || (it.match.length === 0 && window.location.hash.includes(it.id));
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
    const cleanFile = activeFile.replace(/\.html$/, '');
    const items = [
      { id: 'sb-doc-dash', label: 'Doctor Dashboard', icon: '🩺', href: `${base}doctor-home.html`, match: ['doctor-home.html', 'doctor-home'] },
      { id: 'sb-doc-prof', label: 'My Profile', icon: '👤', href: `${base}doctor-profile.html`, match: ['doctor-profile.html', 'doctor-profile'] },
      { id: 'sb-doc-pt', label: 'Manage Patients', icon: '👥', href: `${base}patients.html`, match: ['patients.html', 'patients'] },
      { id: 'sb-doc-aspt', label: 'Assigned Patients', icon: '📋', href: `${base}patients.html#assignedPatientsSection`, match: [] },
      { id: 'sb-doc-apt', label: 'Appointments', icon: '📅', href: `${base}doctor-appointments.html`, match: ['doctor-appointments.html', 'doctor-appointments', 'appointments.html', 'appointments'] },
      { id: 'sb-doc-req', label: 'Appointment Requests', icon: '📨', href: `${base}doctor-home.html#appointmentRequestsPanel`, match: [] },
      { id: 'sb-doc-tm', label: 'Therapy Sessions', icon: '⏱️', href: `${base}therapy-sessions.html`, match: ['therapy-sessions.html', 'therapy-sessions'] },
      { id: 'sb-doc-pr', label: 'Progress Reports', icon: '📈', href: `${base}progress-reports.html`, match: ['progress-reports.html', 'progress-reports'] },
      { id: 'sb-doc-ex', label: 'Exercise Management', icon: '🏃', href: `${base}exercises.html`, match: ['exercises.html', 'exercises'] },
      { id: 'sb-doc-notif', label: 'Notifications', icon: '🔔', href: `${base}doctor-home.html#doctorNotifPanel`, match: [] },
      { id: 'sb-doc-sub', label: 'My Subscription', icon: '💎', href: `${base}subscription-pricing.html`, match: ['subscription-pricing.html', 'subscription-pricing'] },
      { id: 'sb-doc-set', label: 'Settings', icon: '⚙️', href: `${base}doctor-profile.html#doctorSettingsSection`, match: [] }
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
          const isActive = it.match.includes(activeFile) || it.match.includes(cleanFile);
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
    const cleanFile = activeFile.replace(/\.html$/, '');
    const items = [
      { id: 'sb-pt-dash', label: 'Patient Dashboard', icon: '🏠', href: `${base}patient-home.html`, match: ['patient-home.html', 'patient-home'] },
      { id: 'sb-pt-prof', label: 'My Profile', icon: '👤', href: `${base}patient-profile.html`, match: ['patient-profile.html', 'patient-profile'] },
      { id: 'sb-pt-sdoc', label: 'Search Doctors', icon: '🩺', href: `${base}doctors.html`, match: ['doctors.html', 'doctors'] },
      { id: 'sb-pt-dir', label: 'Doctor Directory', icon: '📖', href: `${base}directory.html`, match: ['directory.html', 'directory'] },
      { id: 'sb-pt-stp', label: 'Search Therapists', icon: '🧑‍⚕️', href: `${base}therapists.html`, match: ['therapists.html', 'therapists'] },
      { id: 'sb-pt-book', label: 'Book Appointment', icon: '➕', href: `${base}patient-appointments.html#bookAppointmentCard`, match: [] },
      { id: 'sb-pt-myapt', label: 'My Appointments', icon: '📅', href: `${base}patient-appointments.html`, match: ['patient-appointments.html', 'patient-appointments', 'appointments.html', 'appointments'] },
      { id: 'sb-pt-ts', label: 'My Therapy Sessions', icon: '⏱️', href: `${base}therapy-sessions.html`, match: ['therapy-sessions.html', 'therapy-sessions'] },
      { id: 'sb-pt-ex', label: 'My Exercises', icon: '🏃', href: `${base}exercises.html`, match: ['exercises.html', 'exercises'] },
      { id: 'sb-pt-pr', label: 'My Progress Reports', icon: '📈', href: `${base}progress-reports.html`, match: ['progress-reports.html', 'progress-reports'] },
      { id: 'sb-pt-cg', label: 'My Caregiver', icon: '🤝', href: `${base}patient-profile.html#caregiverSection`, match: [] },
      { id: 'sb-pt-notif', label: 'Notifications', icon: '🔔', href: `${base}patient-home.html#notificationsPanel`, match: [] },
      { id: 'sb-pt-sub', label: 'My Subscription', icon: '💎', href: `${base}subscription-pricing.html`, match: ['subscription-pricing.html', 'subscription-pricing'] },
      { id: 'sb-pt-set', label: 'Settings', icon: '⚙️', href: `${base}patient-profile.html#settingsSection`, match: [] }
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
          const isActive = it.match.includes(activeFile) || it.match.includes(cleanFile);
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

    // NEVER render sidebar on login, signup, forgot password, or public landing pages
    const isLoginPage = [
      'admin-login.html',
      'login.html',
      'patient-login.html',
      'doctor-login.html',
      'signup.html',
      'doctor-signup.html',
      'forgot.html',
      'patient-forgot.html',
      'doctor-forgot.html',
      'index.html',
      ''
    ].includes(activeFile);

    if (isLoginPage || activeFile === 'admin-login.html' || activeFile.includes('login')) {
      const existing = document.getElementById('mtSidebar');
      if (existing) {
        existing.style.setProperty('display', 'none', 'important');
        if (typeof existing.remove === 'function') existing.remove();
      }
      return;
    }

    // Check if this page should have an active role sidebar
    // Admin sidebar appears ONLY after successful Admin authentication, never to unauthenticated users or on admin-login
    const cleanActive = activeFile.replace(/\.html$/, '');
    let sidebarTargetRole = null;
    if (role === 'admin' && activeFile !== 'admin-login.html' && cleanActive !== 'admin-login') {
      sidebarTargetRole = 'admin';
    } else if (role === 'doctor') {
      const isDoctorPage = ['doctor-home', 'doctor-profile', 'doctor-appointments', 'patients', 'therapy-sessions', 'exercises', 'progress-reports'].includes(cleanActive);
      if (isDoctorPage) sidebarTargetRole = 'doctor';
    } else if (role === 'patient') {
      const isPatientPage = ['patient-home', 'patient-profile', 'patient-appointments', 'exercises', 'therapy-sessions', 'doctors', 'therapists', 'progress-reports'].includes(cleanActive);
      if (isPatientPage) sidebarTargetRole = 'patient';
    }

    if (!sidebarTargetRole) {
      const existing = document.getElementById('mtSidebar');
      if (existing) {
        existing.style.setProperty('display', 'none', 'important');
        if (typeof existing.remove === 'function') existing.remove();
      }
      return;
    }

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

