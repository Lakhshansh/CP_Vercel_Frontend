/**
 * Multi Therapy - Global Professional Dark Navy Header Component
 * Standardizes the approved Dark Navy (#06152B) Header UI across all pages:
 * - 60x60px circular logo with blue border
 * - Brand "Multi Therapy" in bold white & tagline in cyan
 * - Symmetrically centered navigation links with bright blue active highlight
 * - Modern Clinical Management dropdown (white background, blue border, dark slate text)
 * - Dynamic Right-Side Controls:
 *     - When Logged Out: Login button -> Contact -> Sign Up
 *     - When Logged In:  Notification bell -> User Profile pill -> Logout button -> Contact -> Sign Up
 * - Fully responsive with mobile hamburger toggle and zero overflow.
 */

(function () {
  'use strict';

  // 1. Immediately apply auth class to html element to prevent any visual flicker
  function syncHtmlAuthClass(isLoggedIn) {
    if (!document.documentElement) return;
    if (isLoggedIn) {
      document.documentElement.classList.add('is-logged-in');
      document.documentElement.classList.remove('is-logged-out');
    } else {
      document.documentElement.classList.add('is-logged-out');
      document.documentElement.classList.remove('is-logged-in');
    }
  }

  function getCurrentUser() {
    try {
      const raw = localStorage.getItem('currentUser');
      if (!raw || raw === 'null' || raw === 'undefined') return null;
      const user = JSON.parse(raw);
      if (user && typeof user === 'object') {
        if (user.username || user.name || user.doctor_name || user.patient_name || user.user_id || user.email) {
          return user;
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // Early sync on script load
  try {
    syncHtmlAuthClass(!!getCurrentUser());
  } catch (_) {}

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

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

    // Dynamic authentication state
    const currentUser = getCurrentUser();
    const isLoggedIn = !!currentUser;

    let displayName = 'User';
    let displayRole = 'Admin';
    let profileUrl = `${base}doctor-profile.html`;
    let initial = 'U';

    if (currentUser) {
      displayName = currentUser.doctor_name || currentUser.name || currentUser.patient_name || currentUser.username || 'User';
      const rawRole = (currentUser.role || currentUser.doctor_specialization || currentUser.specialization || 'Member').toString();
      displayRole = rawRole.charAt(0).toUpperCase() + rawRole.slice(1);
      const cleanName = displayName.replace(/^Dr\.?\s*/i, '').trim();
      initial = (cleanName.charAt(0) || displayName.charAt(0) || 'U').toUpperCase();

      const rLower = rawRole.toLowerCase();
      if (rLower.includes('doctor')) {
        profileUrl = `${base}doctor-profile.html`;
      } else if (rLower.includes('admin')) {
        profileUrl = `${base}admin-dashboard.html`;
      } else {
        profileUrl = `${base}patient-profile.html`;
      }
    }

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

      <!-- Right-Side Controls: Notification -> Profile -> Logout (when logged in) / Login (when logged out) -> Contact -> Sign Up -->
      <div class="shared-nav-right mt-nav-right">

        <!-- 1. Notification Icon with Badge Count & Dropdown (Visible when logged in) -->
        <div class="shared-notif-wrap" style="position: relative; display: ${isLoggedIn ? 'block' : 'none'};">
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

        <!-- 2. Admin / User Profile Pill (Visible when logged in) -->
        <div id="userProfileWrap" class="shared-profile-wrap" style="position: relative; display: ${isLoggedIn ? 'inline-flex' : 'none'};">
          <a href="${profileUrl}" class="shared-user-pill mt-user" id="userProfileBtn" title="View Profile">
            <img id="navAvatarImg" class="shared-avatar-img mt-user-photo d-none" alt="" style="display: none !important;" hidden>
            <div id="navAvatar" class="shared-avatar-fallback mt-user-default">${initial}</div>
            <div class="shared-user-text mt-user-text">
              <div class="shared-user-name mt-user-name" id="navUsername">${escapeHtml(displayName)}</div>
              <div class="shared-user-role mt-user-role" id="navRole">${escapeHtml(displayRole)}</div>
            </div>
            <span class="shared-profile-caret mt-arrow">⌄</span>
          </a>
        </div>

        <!-- 3. Logout Button (Visible when logged in) -->
        <button type="button" id="logoutBtn" class="shared-logout-btn mt-logout-btn" title="Sign Out" style="display: ${isLoggedIn ? 'inline-flex' : 'none'};">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span>Logout</span>
        </button>

        <!-- 3b. Login Button (Visible when NOT logged in) -->
        <a href="${base}login.html" id="btnHeaderLogin" class="shared-btn-login mt-btn-login ${isPatientLogin || isDoctorLogin ? 'active' : ''}" title="Login to Multi Therapy" style="display: ${isLoggedIn ? 'none' : 'inline-flex'};">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
            <polyline points="10 17 15 12 10 7"></polyline>
            <line x1="15" y1="12" x2="3" y2="12"></line>
          </svg>
          <span>Login</span>
        </a>

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

  /**
   * Universal Logout Handler
   * Clears session, resets auth state, and redirects to Home Page.
   */
  async function handleGlobalLogout(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();

    // 1. Non-blocking backend notification
    try {
      if (typeof window.apiRequest === 'function') {
        try {
          await window.apiRequest('/api/logout', { method: 'POST' });
        } catch (_) {}
      }
    } catch (_) {}

    // 2. Clear credentials from localStorage and sessionStorage
    try {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminRole');
      sessionStorage.clear();
    } catch (err) {
      console.warn('Logout storage clear error:', err);
    }

    // 3. Immediately switch UI state to logged-out
    syncHtmlAuthClass(false);
    updateHeaderAuthState(null);

    // 4. Dispatch logout event for other open components
    try {
      window.dispatchEvent(new CustomEvent('userLoggedOut'));
    } catch (_) {}

    // 5. Navigate to Home Page
    const base = getBasePath();
    window.location.href = base + 'index.html';
  }

  /**
   * Dynamic Auth State Updater
   * Toggles Login vs Logout, user profile pill, and notification bell
   */
  function updateHeaderAuthState(user) {
    if (typeof user === 'undefined') {
      user = getCurrentUser();
    }
    const isLoggedIn = !!user;
    syncHtmlAuthClass(isLoggedIn);

    const loginBtn = document.getElementById('btnHeaderLogin');
    const logoutBtn = document.getElementById('logoutBtn');
    const userProfileWrap = document.getElementById('userProfileWrap');
    const notifWrap = document.querySelector('.shared-notif-wrap');

    if (isLoggedIn) {
      if (loginBtn) loginBtn.style.setProperty('display', 'none', 'important');
      if (logoutBtn) logoutBtn.style.setProperty('display', 'inline-flex', 'important');
      if (userProfileWrap) userProfileWrap.style.setProperty('display', 'inline-flex', 'important');
      if (notifWrap) notifWrap.style.setProperty('display', 'block', 'important');

      const base = getBasePath();
      const displayName = user.doctor_name || user.name || user.patient_name || user.username || 'User';
      const rawRole = (user.role || user.doctor_specialization || user.specialization || 'Member').toString();
      const cleanRole = rawRole.charAt(0).toUpperCase() + rawRole.slice(1);

      const navUsername = document.getElementById('navUsername');
      const navRole = document.getElementById('navRole');
      const navAvatar = document.getElementById('navAvatar');
      const userProfileBtn = document.getElementById('userProfileBtn');

      if (navUsername) navUsername.textContent = displayName;
      if (navRole) navRole.textContent = cleanRole;
      if (navAvatar) {
        const cleanName = displayName.replace(/^Dr\.?\s*/i, '').trim();
        navAvatar.textContent = (cleanName.charAt(0) || displayName.charAt(0) || 'U').toUpperCase();
      }
      if (userProfileBtn) {
        const rLower = rawRole.toLowerCase();
        if (rLower.includes('doctor')) {
          userProfileBtn.href = `${base}doctor-profile.html`;
        } else if (rLower.includes('admin')) {
          userProfileBtn.href = `${base}admin-dashboard.html`;
        } else {
          userProfileBtn.href = `${base}patient-profile.html`;
        }
      }
    } else {
      if (loginBtn) loginBtn.style.setProperty('display', 'inline-flex', 'important');
      if (logoutBtn) logoutBtn.style.setProperty('display', 'none', 'important');
      if (userProfileWrap) userProfileWrap.style.setProperty('display', 'none', 'important');
      if (notifWrap) notifWrap.style.setProperty('display', 'none', 'important');
    }
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

      // Wire up logout button
      const logoutBtn = header.querySelector('#logoutBtn');
      if (logoutBtn) {
        logoutBtn.removeEventListener('click', handleGlobalLogout);
        logoutBtn.addEventListener('click', handleGlobalLogout);
      }

      // Wire up notification toggle dropdown
      const notifBtn = header.querySelector('#btnHeaderNotifications');
      const notifDropdown = header.querySelector('#headerNotifDropdown');
      if (notifBtn && notifDropdown) {
        notifBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          const isOpen = notifDropdown.classList.contains('show');
          document.querySelectorAll('.shared-notif-dropdown.show').forEach(d => d.classList.remove('show'));
          if (!isOpen) notifDropdown.classList.add('show');
        });
        document.addEventListener('click', function() {
          notifDropdown.classList.remove('show');
        });
      }

      // Wire up mobile hamburger toggle
      const navToggle = header.querySelector('#navToggle');
      const navMenu = header.querySelector('#navMenu');
      if (navToggle && navMenu) {
        navToggle.addEventListener('click', function(e) {
          e.stopPropagation();
          navMenu.classList.toggle('open');
        });
        document.addEventListener('click', function(e) {
          if (!header.contains(e.target)) {
            navMenu.classList.remove('open');
          }
        });
      }

      // Sync auth state
      const currentUser = getCurrentUser();
      syncHtmlAuthClass(!!currentUser);
      updateHeaderAuthState(currentUser);

      // Re-trigger global auth/avatar photo renderer if loaded
      try {
        if (typeof window.renderNavbarUser === 'function') {
          window.renderNavbarUser(currentUser);
        } else if (typeof window.updateNavbarUserProfile === 'function') {
          window.updateNavbarUserProfile();
        }
      } catch (e) {
        console.warn('Header user profile update:', e);
      }
    }
  }

  // Cross-tab and runtime synchronization
  window.addEventListener('storage', function (e) {
    if (e.key === 'currentUser' || e.key === null) {
      updateHeaderAuthState();
    }
  });
  window.addEventListener('userLoggedIn', function () {
    updateHeaderAuthState();
  });
  window.addEventListener('userLoggedOut', function () {
    updateHeaderAuthState();
  });

  // Export public initializers and controllers
  window.renderMultiTherapyHeader = initHeader;
  window.getMultiTherapyHeaderHTML = getHeaderHTML;
  window.updateHeaderAuthState = updateHeaderAuthState;
  window.handleGlobalLogout = handleGlobalLogout;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeader);
  } else {
    initHeader();
  }
})();
