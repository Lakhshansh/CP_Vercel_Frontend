/**
 * Multi Therapy - Global Professional Dark Navy Header Component
 * Standardizes the approved Dark Navy (#06152B) Header UI across all pages:
 * - 60x60px circular logo with blue border
 * - Brand "Multi Therapy" in bold white & tagline in cyan
 * - Symmetrically centered navigation links with bright blue active highlight
 * - Modern Clinical Management dropdown (white background, blue border, dark slate text)
 * - Right controls: Notification bell (badge 3) -> Profile pill -> Logout -> Contact -> Sign Up
 * - Fully responsive with mobile hamburger toggle and zero overflow.
 */

(function () {
  'use strict';

  function getBasePath() {
    if (typeof window === 'undefined') return './';
    const path = window.location.pathname.replace(/\\/g, '/');
    const segments = path.split('/').filter(Boolean);
    if (segments.length > 1) {
      const depth = segments.length - 1;
      return '../'.repeat(depth);
    }
    return './';
  }

  function getActiveKey() {
    if (typeof window === 'undefined') return 'home';
    const filename = window.location.pathname.split('/').pop().split('?')[0].split('#')[0] || 'index.html';
    
    if (filename === '' || filename === 'index.html') return 'home';
    if (filename === 'patient-home.html') return 'patient-home';
    if (filename === 'doctor-home.html') return 'doctor-home';
    if (filename === 'doctors.html' || filename === 'doctor-profile.html') return 'doctors';
    if (filename === 'patients.html' || filename === 'patient-profile.html') return 'patients';
    if (filename === 'therapists.html') return 'therapists';
    if (filename === 'appointments.html' || filename === 'patient-appointments.html' || filename === 'doctor-appointments.html') return 'appointments';
    if (filename === 'therapy-sessions.html') return 'therapy-sessions';
    if (filename === 'exercises.html') return 'exercises';
    if (filename === 'caregivers.html') return 'caregivers';
    if (filename === 'login.html' || filename === 'patient-forgot.html') return 'patient-login';
    if (filename === 'doctor-login.html' || filename === 'doctor-forgot.html') return 'doctor-login';
    if (filename === 'signup.html' || filename === 'doctor-signup.html') return 'signup';
    if (filename.startsWith('admin-')) return 'admin';
    return '';
  }

  function getHeaderHTML(base, activeKey) {
    const isHome = activeKey === 'home';
    const isPatientHome = activeKey === 'patient-home';
    const isDoctorHome = activeKey === 'doctor-home';
    const isClinical = ['doctors', 'patients', 'therapists', 'appointments', 'therapy-sessions', 'exercises', 'caregivers'].includes(activeKey);
    const isPatientLogin = activeKey === 'patient-login';
    const isDoctorLogin = activeKey === 'doctor-login';
    const isSignup = activeKey === 'signup';

    const isDoc = activeKey === 'doctors';
    const isPt = activeKey === 'patients';
    const isTp = activeKey === 'therapists';
    const isApt = activeKey === 'appointments';
    const isTs = activeKey === 'therapy-sessions';
    const isEx = activeKey === 'exercises';

    return `
    <div class="shared-header-inner mt-navbar-inner">

      <!-- Multi Therapy Brand Identity -->
      <a href="${base}index.html" class="shared-brand mt-brand" title="Multi Therapy Home">
        <img src="${base}images/multi_therapy_logo_100x100.png" alt="Multi Therapy Logo" class="shared-logo mt-logo" width="58" height="58">
        <div class="shared-brand-text">
          <span class="shared-brand-title mt-brand-title">Multi Therapy</span>
          <span class="shared-brand-subtitle mt-brand-subtitle">Every Individual Deserves Better Care.</span>
        </div>
      </a>

      <!-- Center Navigation Links -->
      <nav class="shared-nav-center mt-nav-center" aria-label="Main Navigation">
        <ul class="shared-nav-list mt-nav-list" id="navMenu">
          <li><a href="${base}index.html" class="shared-nav-link mt-nav-link ${isHome ? 'active' : ''}" id="navHome">Home</a></li>
          <li><a href="${base}patient-home.html" class="shared-nav-link mt-nav-link ${isPatientHome ? 'active' : ''}" id="navPatientHome">Patient Home</a></li>
          <li><a href="${base}doctor-home.html" class="shared-nav-link mt-nav-link ${isDoctorHome ? 'active' : ''}" id="navDoctorHome">Doctor Home</a></li>

          <!-- Clinical Management Dropdown -->
          <li class="nav-item-dropdown ${isClinical ? 'active' : ''}">
            <a href="javascript:void(0)" class="nav-dropdown-toggle shared-nav-link mt-nav-link ${isClinical ? 'active' : ''}" aria-haspopup="true" aria-expanded="false" id="navClinicalDropdown">
              <span>Clinical Management</span>
              <svg class="dropdown-arrow-icon" viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M2.5 4.5L6 8L9.5 4.5"></path>
              </svg>
            </a>
            <div class="nav-dropdown-menu" aria-label="Clinical Management Submenu">
              <a href="${base}doctors.html" class="nav-dropdown-link ${isDoc ? 'active' : ''}" id="dropDoctors">
                <span class="nav-dropdown-icon">👨‍⚕️</span>
                <span class="nav-dropdown-text">Doctors</span>
              </a>
              <a href="${base}patients.html" class="nav-dropdown-link ${isPt ? 'active' : ''}" id="dropPatients">
                <span class="nav-dropdown-icon">👥</span>
                <span class="nav-dropdown-text">Patients</span>
              </a>
              <a href="${base}therapists.html" class="nav-dropdown-link ${isTp ? 'active' : ''}" id="dropTherapists">
                <span class="nav-dropdown-icon">👨‍⚕️</span>
                <span class="nav-dropdown-text">Therapists</span>
              </a>
              <a href="${base}appointments.html" class="nav-dropdown-link ${isApt ? 'active' : ''}" id="dropAppointments">
                <span class="nav-dropdown-icon">📅</span>
                <span class="nav-dropdown-text">Appointments</span>
              </a>
              <a href="${base}therapy-sessions.html" class="nav-dropdown-link ${isTs ? 'active' : ''}" id="dropTherapySessions">
                <span class="nav-dropdown-icon">💪</span>
                <span class="nav-dropdown-text">Therapy Sessions</span>
              </a>
              <a href="${base}exercises.html" class="nav-dropdown-link ${isEx ? 'active' : ''}" id="dropExercises">
                <span class="nav-dropdown-icon">🏃</span>
                <span class="nav-dropdown-text">Exercises</span>
              </a>
            </div>
          </li>

          <li><a href="${base}login.html" class="shared-nav-link mt-nav-link ${isPatientLogin ? 'active' : ''}" id="navPatientLogin">Patient Login</a></li>
          <li><a href="${base}doctor-login.html" class="shared-nav-link mt-nav-link ${isDoctorLogin ? 'active' : ''}" id="navDoctorLogin">Doctor Login</a></li>
        </ul>
      </nav>

      <!-- Right-Side Controls: Notification -> Profile -> Logout -> Contact -> Sign Up -->
      <div class="shared-nav-right mt-nav-right">

        <!-- 1. Notification Icon with Badge Count & Dropdown -->
        <div class="shared-notif-wrap" style="position: relative;">
          <button type="button" class="shared-notif-btn doc-notif-btn" id="btnHeaderNotifications" aria-label="Clinical Notifications" title="Clinical Notifications">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span class="shared-notif-badge doc-notif-badge" id="headerNotifBadge" aria-hidden="true">3</span>
          </button>

          <!-- Notification Dropdown -->
          <div class="shared-notif-dropdown doc-notif-dropdown" id="headerNotifDropdown" role="menu">
            <div class="shared-notif-header">
              <strong>Clinical Notifications</strong>
              <span class="badge bg-primary" style="font-size: 11px;">Active</span>
            </div>
            <div class="shared-notif-item">
              <span style="font-size: 16px;">⚡</span>
              <div>
                <div style="font-weight: 700; font-size: 12.5px; color: #0f172a;">Resend Email Active</div>
                <div style="font-size: 11px; color: #64748b;">Doctor OTP delivery active.</div>
              </div>
            </div>
            <div class="shared-notif-item">
              <span style="font-size: 16px;">🗓️</span>
              <div>
                <div style="font-weight: 700; font-size: 12.5px; color: #0f172a;">Clinical Schedule Synced</div>
                <div style="font-size: 11px; color: #64748b;">Patient appointments online.</div>
              </div>
            </div>
            <div class="shared-notif-item">
              <span style="font-size: 16px;">✅</span>
              <div>
                <div style="font-weight: 700; font-size: 12.5px; color: #0f172a;">TiDB Database Online</div>
                <div style="font-size: 11px; color: #64748b;">Multi Therapy cloud connected.</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Admin / User Profile Pill -->
        <div id="userProfileWrap" class="shared-profile-wrap" style="position: relative; display: inline-flex;">
          <a href="${base}doctor-profile.html" class="shared-user-pill mt-user" id="userProfileBtn" title="View Profile">
            <img id="navAvatarImg" class="shared-avatar-img mt-user-photo d-none" alt="" style="display: none !important;" hidden>
            <div id="navAvatar" class="shared-avatar-fallback mt-user-default">👤</div>
            <div class="shared-user-text mt-user-text">
              <div class="shared-user-name mt-user-name" id="navUsername">User</div>
              <div class="shared-user-role mt-user-role" id="navRole">Admin</div>
            </div>
            <span class="shared-profile-caret mt-arrow">⌄</span>
          </a>
        </div>

        <!-- 3. Logout Button -->
        <button type="button" id="logoutBtn" class="shared-logout-btn mt-logout-btn" title="Sign Out">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span>Logout</span>
        </button>

        <!-- 4 & 5. Public Actions: Contact & Sign Up -->
        <div id="publicNavActions" class="shared-public-actions">
          <!-- Contact Button -->
          <a href="${base}index.html#contact" class="shared-btn-contact doc-btn-contact" id="btnHeaderContact" title="Contact Multi Therapy Support">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            <span>Contact</span>
          </a>

          <!-- Sign Up Button -->
          <a href="${base}signup.html" class="shared-btn-signup doc-btn-signup ${isSignup ? 'active' : ''}" id="btnHeaderSignup" title="Sign Up">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span>Sign Up</span>
          </a>
        </div>

        <!-- Mobile Hamburger Toggle -->
        <button type="button" class="shared-nav-toggle doc-nav-toggle" id="navToggle" aria-label="Toggle Navigation Menu">
          ☰
        </button>

      </div>
    </div>
    `;
  }

  function initHeader() {
    const base = getBasePath();
    const activeKey = getActiveKey();

    // 1. Identify primary header or create if none exists
    let header = document.querySelector('header');
    if (!header) {
      header = document.createElement('header');
      if (document.body) {
        document.body.insertBefore(header, document.body.firstChild);
      }
    }

    if (header) {
      header.className = 'shared-header mt-navbar';
      header.setAttribute('role', 'banner');

      // Preserve existing live DB status if present on admin pages
      const existingDbBadge = document.getElementById('liveDbBadge');
      const hadDbBadge = !!existingDbBadge;

      // Update inner HTML
      header.innerHTML = getHeaderHTML(base, activeKey);

      // Re-insert live DB badge if this was admin dashboard
      if (hadDbBadge) {
        const notifWrap = header.querySelector('.shared-notif-wrap');
        if (notifWrap) {
          const dbWrap = document.createElement('div');
          dbWrap.id = 'liveDbBadge';
          dbWrap.className = 'badge-live-db';
          dbWrap.title = 'Real-time Database Connection Status';
          dbWrap.style.cssText = 'display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 9999px; background: rgba(5, 150, 105, 0.15); border: 1px solid rgba(5, 150, 105, 0.35); color: #34d399; font-size: 11.5px; font-weight: 700; margin-right: 6px;';
          dbWrap.innerHTML = '<span class="pulse-dot" style="width: 7px; height: 7px; border-radius: 50%; background: #10b981; display: inline-block;"></span><span id="liveDbStatusText">Live TiDB Cloud</span>';
          notifWrap.parentElement.insertBefore(dbWrap, notifWrap);
        }
      }

      // Re-trigger auth & notification controllers if loaded
      try {
        if (typeof window.updateNavbarUserProfile === 'function') {
          window.updateNavbarUserProfile();
        }
      } catch (e) {
        console.warn('Header user profile update:', e);
      }
    }
  }

  // Export public initializer
  window.renderMultiTherapyHeader = initHeader;
  window.getMultiTherapyHeaderHTML = getHeaderHTML;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeader);
  } else {
    initHeader();
  }
})();
