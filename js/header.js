/**
 * Multi Therapy - Global Professional Dark Navy Header Component
 * Standardizes the approved Dark Navy (#06172F) Header UI across all pages:
 * - 58x58px circular logo with blue border on the left
 * - Multi Therapy brand title & tagline ("Every Individual Deserves Better Care.")
 * - Center Navigation Links (Role-Aware):
 *     * PATIENT: Patient Dashboard (links to patient-home.html)
 *     * DOCTOR: Doctor Dashboard (links to doctor-home.html) + Clinical Management
 *     * THERAPIST: Therapist Dashboard (links to doctor-home.html) + Clinical Management
 *     * ADMIN: Admin Dashboard (links to admin-dashboard.html)
 *     * GUEST: Home, Patient Home, Doctor Home, Clinical Management, Patient Login, Doctor Login, Admin Login
 * - Right Controls (When Logged In):
 *     * Notification bell with active badge count and dropdown
 *     * User Profile Dropdown:
 *         - My Profile
 *         - Account Settings
 *         - My Dashboard
 *         - Logout
 *     * Prominent Logout Button: Bright red pill button with icon and bold label
 *     * Contact Support button
 * - Universal Auth State Enforcement:
 *     * When logged in: Hide all Patient Login, Doctor Login, Admin Login, and all Sign Up buttons.
 *     * When logged out: Separate login for Patient, Doctor, and Admin, plus Sign Up options.
 * - Centralized Global Logout Controller: Clears sessions and redirects cleanly to index.html.
 * - Browser Back Protection (bfcache eviction on pageshow).
 * - Fully responsive with mobile hamburger toggle and zero overflow.
 */

(function () {
  'use strict';

  // 1. Instant auth class synchronization on html element to prevent UI flicker
  try {
    const earlyStorage = (typeof window !== 'undefined' && window.localStorage) ? window.localStorage : null;
    const earlySession = (typeof window !== 'undefined' && window.sessionStorage) ? window.sessionStorage : null;
    let earlyUser = null;
    if (earlyStorage) {
      const raw = earlyStorage.getItem('currentUser') || (earlySession ? earlySession.getItem('currentUser') : null);
      if (raw && raw !== 'null' && raw !== 'undefined') {
        try { earlyUser = JSON.parse(raw); } catch (_) {}
      }
    }
    const earlyAdminRole = (earlyStorage ? (earlyStorage.getItem('adminRole') || '') : '').toLowerCase();
    const earlyIsAdminSession = earlySession ? (earlySession.getItem('admin_logged_in') === 'true') : false;
    const earlyAdminToken = earlyStorage ? (earlyStorage.getItem('adminToken') || '') : '';
    const earlyIsAdmin = earlyAdminRole === 'admin' || earlyAdminRole === 'superadmin' || earlyIsAdminSession || !!earlyAdminToken || (earlyUser && (earlyUser.role === 'admin' || earlyUser.role === 'superadmin' || earlyUser.is_admin === true));

    const earlyRawRole = (earlyUser && earlyUser.role ? String(earlyUser.role).toLowerCase() : '');
    const earlyIsTherapist = !earlyIsAdmin && earlyUser && (earlyRawRole === 'therapist' || earlyRawRole === 'physiotherapist');
    const earlyIsDoctor = !earlyIsAdmin && !earlyIsTherapist && earlyUser && (earlyRawRole === 'doctor' || earlyRawRole === 'practitioner');
    const earlyIsPatient = !earlyIsAdmin && !earlyIsDoctor && !earlyIsTherapist && !!earlyUser;
    const earlyIsLoggedIn = !!(earlyUser || earlyIsAdmin);

    if (typeof document !== 'undefined' && document.documentElement) {
      const root = document.documentElement;
      if (earlyIsLoggedIn) {
        root.classList.add('is-logged-in');
        root.classList.remove('is-logged-out');
        root.classList.remove('is-role-doctor', 'is-role-patient', 'is-role-therapist', 'is-role-admin');

        if (earlyIsAdmin) {
          root.classList.add('is-role-admin');
        } else if (earlyIsTherapist) {
          root.classList.add('is-role-therapist');
        } else if (earlyIsDoctor) {
          root.classList.add('is-role-doctor');
        } else {
          root.classList.add('is-role-patient');
        }
      } else {
        root.classList.add('is-logged-out');
        root.classList.remove('is-logged-in', 'is-role-admin', 'is-role-doctor', 'is-role-therapist', 'is-role-patient');
      }
    }
  } catch (_) {}

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
    if (filename === 'therapist-dashboard.html') return 'therapist-dashboard';
    if (filename === 'doctors.html') return 'doctors';
    if (filename === 'patients.html') return 'patients';
    if (filename === 'therapists.html') return 'therapists';
    if (filename === 'appointments.html' || filename === 'patient-appointments.html' || filename === 'doctor-appointments.html') return 'appointments';
    if (filename === 'therapy-sessions.html') return 'therapy-sessions';
    if (filename === 'exercises.html') return 'exercises';
    if (filename === 'caregivers.html') return 'caregivers';
    if (filename === 'patient-login.html' || filename === 'login.html' || filename === 'patient-forgot.html') return 'patient-login';
    if (filename === 'doctor-login.html' || filename === 'doctor-forgot.html') return 'doctor-login';
    if (filename === 'admin-login.html') return 'admin-login';
    if (filename === 'doctor-profile.html') return 'doctor-profile';
    if (filename === 'patient-profile.html') return 'patient-profile';
    if (filename === 'signup.html' || filename === 'doctor-signup.html') return 'signup';
    if (filename === 'admin-dashboard.html' || filename.startsWith('admin-')) return 'admin';
    return '';
  }

  /**
   * Retrieves and normalizes the current authenticated user session and role.
   * Distinctly resolves the 4 primary user roles:
   * 1. patient
   * 2. doctor
   * 3. therapist
   * 4. admin
   */
  function getAuthUser() {
    let user = null;
    const storage = (typeof window !== 'undefined' && window.localStorage) ? window.localStorage : (typeof localStorage !== 'undefined' ? localStorage : null);
    const sStorage = (typeof window !== 'undefined' && window.sessionStorage) ? window.sessionStorage : (typeof sessionStorage !== 'undefined' ? sessionStorage : null);

    try {
      const raw = storage ? (storage.getItem('currentUser') || (sStorage ? sStorage.getItem('currentUser') : null)) : null;
      if (raw && raw !== 'null' && raw !== 'undefined') user = JSON.parse(raw);
    } catch (e) {
      user = null;
    }

    const adminRole = (storage ? (storage.getItem('adminRole') || '') : '').toLowerCase();
    const adminToken = storage ? (storage.getItem('adminToken') || '') : '';
    const isAdminSession = sStorage ? (sStorage.getItem('admin_logged_in') === 'true') : false;

    let isLoggedIn = false;
    let normalizedRole = 'guest';

    if (user && (user.user_id || user.username || user.email || user.role)) {
      isLoggedIn = true;
      const rawRole = (user.role || '').toLowerCase();
      if (rawRole === 'therapist' || rawRole === 'physiotherapist') {
        normalizedRole = 'therapist';
      } else if (rawRole === 'doctor' || rawRole === 'practitioner') {
        normalizedRole = 'doctor';
      } else if (rawRole === 'admin' || rawRole === 'superadmin' || user.is_admin === true) {
        normalizedRole = 'admin';
      } else {
        normalizedRole = 'patient';
      }
    } else if (adminRole === 'superadmin' || adminRole === 'admin' || isAdminSession || adminToken) {
      isLoggedIn = true;
      normalizedRole = 'admin';
      user = {
        name: 'Administrator',
        username: 'admin',
        role: 'admin'
      };
    }

    let displayName = 'User';
    let displayRole = 'Member';
    let profileUrl = 'patient-profile.html';
    let settingsUrl = 'patient-profile.html#changePasswordForm';
    let dashboardUrl = 'patient-home.html';
    let dashboardName = 'Patient Dashboard';
    let dashboardHint = 'Patient Dashboard';

    if (isLoggedIn && user) {
      if (normalizedRole === 'doctor') {
        displayName = user.doctor_name || (user.name ? (user.name.startsWith('Dr.') ? user.name : 'Dr. ' + user.name) : (user.username ? ('Dr. ' + user.username) : 'Doctor'));
        displayRole = user.doctor_specialization || user.specialization || 'Doctor';
        profileUrl = 'doctor-profile.html';
        settingsUrl = 'doctor-profile.html#changePasswordForm';
        dashboardUrl = 'doctor-home.html';
        dashboardName = 'Doctor Dashboard';
        dashboardHint = 'Doctor Dashboard';
      } else if (normalizedRole === 'therapist') {
        displayName = user.therapist_name || user.name || (user.username ? user.username : 'Therapist');
        displayRole = user.therapist_specialization || user.specialization || 'Therapist';
        profileUrl = 'doctor-profile.html';
        settingsUrl = 'doctor-profile.html#changePasswordForm';
        dashboardUrl = 'therapist-dashboard.html';
        dashboardName = 'Therapist Dashboard';
        dashboardHint = 'Therapist Dashboard';
      } else if (normalizedRole === 'admin') {
        displayName = (user.name && !user.name.toLowerCase().startsWith('dr.')) ? user.name : (user.username || 'admin');
        displayRole = 'Admin';
        profileUrl = 'admin-dashboard.html';
        settingsUrl = 'admin-dashboard.html#settings';
        dashboardUrl = 'admin-dashboard.html';
        dashboardName = 'Admin Dashboard';
        dashboardHint = 'Admin Dashboard';
      } else {
        displayName = user.patient_name || user.first_name || user.name || user.username || 'Patient';
        displayRole = 'Patient';
        profileUrl = 'patient-profile.html';
        settingsUrl = 'patient-profile.html#changePasswordForm';
        dashboardUrl = 'patient-home.html';
        dashboardName = 'Patient Dashboard';
        dashboardHint = 'Patient Dashboard';
      }
    }

    const cleanName = displayName.replace(/^Dr\.?\s*/i, '').trim();
    const initial = (cleanName.charAt(0) || displayName.charAt(0) || 'U').toUpperCase();

    const rawPhoto = user && (user.profile_photo || user.photo || user.profile_photo_url || (storage ? storage.getItem('mt_doc_photo_' + (user.username || 'doctor')) : null));
    const hasPhoto = !!(rawPhoto && typeof rawPhoto === 'string' && rawPhoto.trim() !== '' &&
      !rawPhoto.includes('doctor-avatar.svg') && !rawPhoto.includes('patient-avatar.svg') &&
      !rawPhoto.includes('undefined') && !rawPhoto.includes('null'));

    return {
      isLoggedIn,
      role: normalizedRole,
      user,
      displayName,
      displayRole,
      profileUrl,
      settingsUrl,
      dashboardUrl,
      dashboardName,
      dashboardHint,
      initial,
      hasPhoto,
      photoSrc: hasPhoto ? rawPhoto : null
    };
  }

  /**
   * Generates canonical HTML for the Dark Navy header.
   */
  function getHeaderHTML(base, activeKey, auth) {
    if (!auth) auth = getAuthUser();

    const isHome = activeKey === 'home';
    const isPatientHome = activeKey === 'patient-home';
    const isDoctorHome = activeKey === 'doctor-home';
    const isTherapistDash = activeKey === 'therapist-dashboard';
    const isAdminDash = activeKey === 'admin';
    const isClinical = ['doctors', 'patients', 'therapists', 'appointments', 'therapy-sessions', 'exercises', 'caregivers'].includes(activeKey);
    const isPatientLogin = activeKey === 'patient-login';
    const isDoctorLogin = activeKey === 'doctor-login';
    const isAdminLogin = activeKey === 'admin-login';
    const isSignup = activeKey === 'signup';

    const isDoc = activeKey === 'doctors';
    const isPt = activeKey === 'patients';
    const isTp = activeKey === 'therapists';
    const isApt = activeKey === 'appointments';
    const isTs = activeKey === 'therapy-sessions';
    const isEx = activeKey === 'exercises';

    // Target links for profile dropdown
    const profileHref = `${base}${auth.profileUrl}`;
    const settingsHref = `${base}${auth.settingsUrl}`;
    const dashboardHref = `${base}${auth.dashboardUrl}`;

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

      <!-- Center Navigation Links (Role-Aware) -->
      <nav class="shared-nav-center mt-nav-center" aria-label="Main Navigation">
        <ul class="shared-nav-list mt-nav-list" id="navMenu">
          ${!auth.isLoggedIn && !isPatientHome ? `
            <!-- GUEST / LOGGED-OUT NAVIGATION (on public pages) -->
            ${isHome ? `
              <!-- HOME PAGE CLEAN TOP NAVIGATION (SEHATOPD INSPIRED) -->
              <li><a href="${base}index.html" class="shared-nav-link mt-nav-link active" id="navHome">Home</a></li>
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
                  <a href="${base}patient-appointments.html" class="nav-dropdown-link ${isApt ? 'active' : ''}" id="dropAppointments">
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
              <li><a href="${base}index.html#contact" class="shared-nav-link mt-nav-link" id="navHomeContact">Contact</a></li>
              <!-- Mobile Login Buttons (Visible inside mobile drawer on small screens) -->
              <li class="home-mobile-login-wrap" style="display: none;">
                <a href="${base}admin-login.html" class="home-login-btn home-btn-admin" title="Admin Portal Login">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                  <span>Admin Login</span>
                </a>
                <a href="https://cp-vercel-frontend.vercel.app/login.html" class="home-login-btn home-btn-patient" title="Patient Portal Login">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  <span>Patient Login</span>
                </a>
                <a href="https://cp-vercel-frontend.vercel.app/doctor-login.html" class="home-login-btn home-btn-doctor" title="Doctor Portal Login">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                  <span>Doctor Login</span>
                </a>
              </li>
            ` : `
              <!-- NON-HOMEPAGE GUEST NAVIGATION -->
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
                  <a href="${base}patient-appointments.html" class="nav-dropdown-link ${isApt ? 'active' : ''}" id="dropAppointments">
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

              <li><a href="${base}patient-login.html" class="shared-nav-link mt-nav-link ${isPatientLogin ? 'active' : ''}" id="navPatientLogin">Patient Login</a></li>
              <li><a href="${base}doctor-login.html" class="shared-nav-link mt-nav-link ${isDoctorLogin ? 'active' : ''}" id="navDoctorLogin">Doctor Login</a></li>
              <li><a href="${base}admin-login.html" class="shared-nav-link mt-nav-link ${isAdminLogin ? 'active' : ''}" id="navAdminLogin">Admin Login</a></li>
            `}
          ` : ''}

          ${!auth.isLoggedIn && isPatientHome ? `
            <!-- GUEST ON PATIENT HOME: Show ONLY Patient Home (No Login Links) -->
            <li><a href="${base}patient-home.html" class="shared-nav-link mt-nav-link active" id="navPatientHome" title="Patient Home">Patient Dashboard</a></li>
          ` : ''}

          ${auth.isLoggedIn && auth.role === 'doctor' ? `
            <!-- DOCTOR NAVIGATION: Show Doctor Dashboard and Clinical Management -->
            <li><a href="${base}doctor-home.html" class="shared-nav-link mt-nav-link ${isDoctorHome ? 'active' : ''}" id="navDoctorHome" title="Doctor Home">Doctor Dashboard</a></li>

            <!-- Clinical Management Dropdown -->
            <li class="nav-item-dropdown ${isClinical ? 'active' : ''}">
              <a href="javascript:void(0)" class="nav-dropdown-toggle shared-nav-link mt-nav-link ${isClinical ? 'active' : ''}" aria-haspopup="true" aria-expanded="false" id="navClinicalDropdown">
                <span>Clinical Management</span>
                <svg class="dropdown-arrow-icon" viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M2.5 4.5L6 8L9.5 4.5"></path>
                </svg>
              </a>
              <div class="nav-dropdown-menu" aria-label="Clinical Management Submenu">
                <a href="${base}patients.html" class="nav-dropdown-link ${isPt ? 'active' : ''}" id="dropPatients">
                  <span class="nav-dropdown-icon">👥</span>
                  <span class="nav-dropdown-text">Patients</span>
                </a>
                <a href="${base}doctor-appointments.html" class="nav-dropdown-link ${isApt ? 'active' : ''}" id="dropAppointments">
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
          ` : ''}

          ${auth.isLoggedIn && auth.role === 'therapist' ? `
            <!-- THERAPIST NAVIGATION: Show Therapist Dashboard and Clinical Management -->
            <li><a href="${base}therapist-dashboard.html" class="shared-nav-link mt-nav-link ${isTherapistDash ? 'active' : ''}" id="navTherapistHome" title="Therapist Dashboard">Therapist Dashboard</a></li>

            <!-- Clinical Management Dropdown -->
            <li class="nav-item-dropdown ${isClinical ? 'active' : ''}">
              <a href="javascript:void(0)" class="nav-dropdown-toggle shared-nav-link mt-nav-link ${isClinical ? 'active' : ''}" aria-haspopup="true" aria-expanded="false" id="navClinicalDropdown">
                <span>Clinical Management</span>
                <svg class="dropdown-arrow-icon" viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M2.5 4.5L6 8L9.5 4.5"></path>
                </svg>
              </a>
              <div class="nav-dropdown-menu" aria-label="Clinical Management Submenu">
                <a href="${base}therapy-sessions.html" class="nav-dropdown-link ${isTs ? 'active' : ''}" id="dropTherapySessions">
                  <span class="nav-dropdown-icon">💪</span>
                  <span class="nav-dropdown-text">Therapy Sessions</span>
                </a>
                <a href="${base}patients.html" class="nav-dropdown-link ${isPt ? 'active' : ''}" id="dropPatients">
                  <span class="nav-dropdown-icon">👥</span>
                  <span class="nav-dropdown-text">Patients</span>
                </a>
                <a href="${base}doctor-appointments.html" class="nav-dropdown-link ${isApt ? 'active' : ''}" id="dropAppointments">
                  <span class="nav-dropdown-icon">📅</span>
                  <span class="nav-dropdown-text">Appointments</span>
                </a>
                <a href="${base}exercises.html" class="nav-dropdown-link ${isEx ? 'active' : ''}" id="dropExercises">
                  <span class="nav-dropdown-icon">🏃</span>
                  <span class="nav-dropdown-text">Exercises</span>
                </a>
              </div>
            </li>
          ` : ''}

          ${auth.isLoggedIn && auth.role === 'admin' ? `
            <!-- ADMIN NAVIGATION: Show ONLY Admin Dashboard -->
            <li><a href="${base}admin-dashboard.html" class="shared-nav-link mt-nav-link ${isAdminDash ? 'active' : ''}" id="navAdminDash" title="Admin Dashboard">Admin Dashboard</a></li>
          ` : ''}

          ${auth.isLoggedIn && auth.role === 'patient' ? `
            <!-- PATIENT NAVIGATION: Show ONLY Patient Dashboard -->
            <li><a href="${base}patient-home.html" class="shared-nav-link mt-nav-link ${isPatientHome ? 'active' : ''}" id="navPatientHome" title="Patient Home">Patient Dashboard</a></li>
          ` : ''}
        </ul>
      </nav>

      <!-- Right-Side Controls (Role-Aware) -->
      <div class="shared-nav-right mt-nav-right">

        ${auth.isLoggedIn ? `
          <!-- 1. Notification Icon with Badge Count & Dropdown -->
          <div class="shared-notif-wrap" id="headerNotifWrap" style="position: relative; display: inline-flex;">
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
                  <div style="font-size: 11px; color: #64748b;">Clinical OTP & message delivery ready.</div>
                </div>
              </div>
              <div class="shared-notif-item">
                <span style="font-size: 16px;">🗓️</span>
                <div>
                  <div style="font-weight: 700; font-size: 12.5px; color: #0f172a;">Clinical Schedule Synced</div>
                  <div style="font-size: 11px; color: #64748b;">Appointments and sessions online.</div>
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

          <!-- 2. User Profile Dropdown Pill -->
          <div id="userProfileWrap" class="shared-profile-wrap ${auth.hasPhoto ? 'has-photo' : ''}" style="position: relative; display: inline-flex;">
            <button type="button" class="shared-user-pill mt-user" id="userProfileBtn" aria-expanded="false" aria-haspopup="true" aria-controls="userProfileDropdown" title="User Profile Menu">
              <img id="navAvatarImg" class="shared-avatar-img mt-user-photo ${auth.hasPhoto ? '' : 'd-none'}" src="${auth.photoSrc || ''}" alt="" ${auth.hasPhoto ? '' : 'hidden style="display: none !important;"'}>
              <div id="navAvatar" class="shared-avatar-fallback mt-user-default" ${auth.hasPhoto ? 'style="display: none !important;"' : ''}>${auth.initial}</div>
              <div class="shared-user-text mt-user-text">
                <div class="shared-user-name mt-user-name" id="navUsername">${auth.displayName}</div>
                <div class="shared-user-role mt-user-role" id="navRole">${auth.displayRole}</div>
              </div>
              <svg class="shared-profile-caret mt-arrow" viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M2.5 4.5L6 8L9.5 4.5"></path>
              </svg>
            </button>

            <!-- User Profile Dropdown Menu -->
            <div class="shared-profile-dropdown" id="userProfileDropdown" role="menu" aria-label="User Account Menu">
              <div class="profile-dropdown-header">
                <div class="profile-dropdown-user-info">
                  <div class="profile-dropdown-avatar">${auth.initial}</div>
                  <div class="profile-dropdown-user-details">
                    <div class="profile-dropdown-name">${auth.displayName}</div>
                    <div class="profile-dropdown-role-badge">${auth.displayRole}</div>
                  </div>
                </div>
              </div>
              <div class="profile-dropdown-divider"></div>
              <div class="profile-dropdown-items">
                <!-- 1. My Profile -->
                <a href="${profileHref}" class="profile-dropdown-item" id="dropItemProfile" role="menuitem">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <span>My Profile</span>
                </a>

                <!-- 2. Account Settings -->
                <a href="${settingsHref}" class="profile-dropdown-item" id="dropItemSettings" role="menuitem">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                  <span>Account Settings</span>
                </a>

                <!-- 3. My Dashboard -->
                <a href="${dashboardHref}" class="profile-dropdown-item" id="dropItemDashboard" role="menuitem">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <rect x="3" y="3" width="7" height="9"></rect>
                    <rect x="14" y="3" width="7" height="5"></rect>
                    <rect x="14" y="12" width="7" height="9"></rect>
                    <rect x="3" y="16" width="7" height="5"></rect>
                  </svg>
                  <span>My Dashboard</span>
                  <span class="profile-dropdown-badge">${auth.dashboardHint}</span>
                </a>
              </div>
              <div class="profile-dropdown-divider"></div>
              <div class="profile-dropdown-footer">
                <!-- 4. Logout from Dropdown -->
                <button type="button" class="profile-dropdown-item profile-dropdown-logout" id="dropdownLogoutBtn" role="menuitem">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 3. Prominent Logout Button -->
          <button type="button" id="logoutBtn" class="shared-logout-btn mt-logout-btn" title="Sign Out of Multi Therapy">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Logout</span>
          </button>
        ` : ''}

        ${!auth.isLoggedIn && isHome ? `
          <!-- Three Login Buttons (Right Side) - Inspired by SehatOPD government header (Home Page ONLY) -->
          <div class="home-login-buttons-group" id="homeLoginButtonsGroup">
            <a href="admin-login.html" class="home-login-btn home-btn-admin" id="btnHomeAdminLogin" title="Admin Portal Login">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              <span>Admin Login</span>
            </a>
            <a href="https://cp-vercel-frontend.vercel.app/login.html" class="home-login-btn home-btn-patient" id="btnHomePatientLogin" title="Patient Portal Login">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <span>Patient Login</span>
            </a>
            <a href="https://cp-vercel-frontend.vercel.app/doctor-login.html" class="home-login-btn home-btn-doctor" id="btnHomeDoctorLogin" title="Doctor Portal Login">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
              <span>Doctor Login</span>
            </a>
          </div>
        ` : `
          <!-- Public Actions (Non-Home Pages) -->
          <div id="publicNavActions" class="shared-public-actions">
            <!-- Contact Button (Always visible) -->
            <a href="${base}index.html#contact" class="shared-btn-contact doc-btn-contact" id="btnHeaderContact" title="Contact Multi Therapy Support">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              <span>Contact</span>
            </a>

            ${!auth.isLoggedIn ? `
              <!-- Sign Up Button (Guest Only on Other Pages) -->
              <a href="${base}signup.html" class="shared-btn-signup doc-btn-signup ${isSignup ? 'active' : ''}" id="btnHeaderSignup" title="Sign Up">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span>Sign Up</span>
              </a>
            ` : ''}
          </div>
        `}

        <!-- Mobile Hamburger Toggle -->
        <button type="button" class="shared-nav-toggle doc-nav-toggle" id="navToggle" aria-label="Toggle Navigation Menu">
          ☰
        </button>

      </div>
    </div>
    `;
  }

  /**
   * Automatically ensure healthcare-theme.css is linked in document head
   */
  function injectHealthcareTheme() {
    if (typeof document === 'undefined') return;
    if (!document.querySelector('link[href*="healthcare-theme.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = getBasePath() + 'css/healthcare-theme.css';
      (document.head || document.documentElement).appendChild(link);
    }
  }

  /**
   * Automatically ensure sidebar.js is loaded
   */
  function injectSidebarScript() {
    if (typeof document === 'undefined') return;
    if (!document.querySelector('script[src*="sidebar.js"]') && typeof window.renderMultiTherapySidebar !== 'function') {
      const script = document.createElement('script');
      script.src = getBasePath() + 'js/sidebar.js';
      script.defer = true;
      (document.body || document.documentElement).appendChild(script);
    }
  }

  /**
   * Injects resilient CSS rules to enforce visibility for each authentication state & role.
   */
  function injectAuthStyles() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('mtAuthVisibilityStyles')) return;
    const style = document.createElement('style');
    style.id = 'mtAuthVisibilityStyles';
    style.textContent = `
      /* When authenticated: hide all signup and login buttons across all pages */
      body.is-logged-in .shared-btn-signup,
      body.is-logged-in #btnHeaderSignup,
      body.is-logged-in .doc-btn-signup,
      body.is-logged-in .btn-header-signup,
      body.is-logged-in #navPatientLogin,
      body.is-logged-in #navDoctorLogin,
      body.is-logged-in #navAdminLogin,
      body.is-logged-in #btnPatientLogin,
      body.is-logged-in #btnDoctorLogin,
      body.is-logged-in #btnHeaderLogin,
      body.is-logged-in .shared-btn-login,
      body.is-logged-in .mt-login-btn,
      body.is-logged-in .mt-signup-btn,
      body.is-logged-in #homeLoginButtonsGroup,
      body.is-logged-in .home-login-btn,
      body.is-logged-in .mt-auth-guest-only,
      html.is-logged-in .shared-btn-signup,
      html.is-logged-in #btnHeaderSignup,
      html.is-logged-in .doc-btn-signup,
      html.is-logged-in .btn-header-signup,
      html.is-logged-in #navPatientLogin,
      html.is-logged-in #navDoctorLogin,
      html.is-logged-in #navAdminLogin,
      html.is-logged-in #btnPatientLogin,
      html.is-logged-in #btnDoctorLogin,
      html.is-logged-in #btnHeaderLogin,
      html.is-logged-in .shared-btn-login,
      html.is-logged-in .mt-login-btn,
      html.is-logged-in .mt-signup-btn,
      html.is-logged-in #homeLoginButtonsGroup,
      html.is-logged-in .home-login-btn,
      html.is-logged-in .mt-auth-guest-only {
        display: none !important;
      }

      /* Role: DOCTOR (Hide Home, Patient Home, Admin Dashboard) */
      body.is-role-doctor #navHome,
      body.is-role-doctor #navPatientHome,
      body.is-role-doctor #navAdminDash,
      body.is-role-doctor #navTherapistHome,
      html.is-role-doctor #navHome,
      html.is-role-doctor #navPatientHome,
      html.is-role-doctor #navAdminDash,
      html.is-role-doctor #navTherapistHome {
        display: none !important;
      }

      /* Role: THERAPIST (Hide Home, Patient Home, Admin Dashboard, Doctor Home) */
      body.is-role-therapist #navHome,
      body.is-role-therapist #navPatientHome,
      body.is-role-therapist #navAdminDash,
      body.is-role-therapist #navDoctorHome,
      html.is-role-therapist #navHome,
      html.is-role-therapist #navPatientHome,
      html.is-role-therapist #navAdminDash,
      html.is-role-therapist #navDoctorHome {
        display: none !important;
      }

      /* Role: ADMIN (Hide Home, Doctor Home, Patient Home, Therapist Home, Clinical Management) */
      body.is-role-admin #navHome,
      body.is-role-admin #navDoctorHome,
      body.is-role-admin #navTherapistHome,
      body.is-role-admin #navPatientHome,
      body.is-role-admin #navClinicalDropdown,
      body.is-role-admin .nav-item-dropdown,
      html.is-role-admin #navHome,
      html.is-role-admin #navDoctorHome,
      html.is-role-admin #navTherapistHome,
      html.is-role-admin #navPatientHome,
      html.is-role-admin #navClinicalDropdown,
      html.is-role-admin .nav-item-dropdown {
        display: none !important;
      }

      /* Role: PATIENT (Hide Home, Doctor Home, Therapist Home, Admin Dashboard, Clinical Management) */
      body.is-role-patient #navHome,
      body.is-role-patient #navDoctorHome,
      body.is-role-patient #navTherapistHome,
      body.is-role-patient #navAdminDash,
      body.is-role-patient #navClinicalDropdown,
      body.is-role-patient .nav-item-dropdown,
      html.is-role-patient #navHome,
      html.is-role-patient #navDoctorHome,
      html.is-role-patient #navTherapistHome,
      html.is-role-patient #navAdminDash,
      html.is-role-patient #navClinicalDropdown,
      html.is-role-patient .nav-item-dropdown {
        display: none !important;
      }

      /* When user is logged out: hide profile pill, dropdown, notifications, and logout */
      body.is-logged-out #userProfileWrap,
      body.is-logged-out .shared-profile-wrap,
      body.is-logged-out #logoutBtn,
      body.is-logged-out .shared-logout-btn,
      body.is-logged-out .mt-logout-btn,
      body.is-logged-out #headerNotifWrap,
      body.is-logged-out .shared-notif-wrap,
      body.is-logged-out #btnHeaderNotifications,
      body.is-logged-out .mt-auth-logged-in-only,
      html.is-logged-out #userProfileWrap,
      html.is-logged-out .shared-profile-wrap,
      html.is-logged-out #logoutBtn,
      html.is-logged-out .shared-logout-btn,
      html.is-logged-out .mt-logout-btn,
      html.is-logged-out #headerNotifWrap,
      html.is-logged-out .shared-notif-wrap,
      html.is-logged-out #btnHeaderNotifications,
      html.is-logged-out .mt-auth-logged-in-only {
        display: none !important;
      }

      /* When user is logged in: ensure profile pill, notifications, and logout button are visible */
      body.is-logged-in #userProfileWrap,
      body.is-logged-in #logoutBtn,
      body.is-logged-in .shared-logout-btn,
      body.is-logged-in .mt-logout-btn,
      body.is-logged-in #headerNotifWrap,
      body.is-logged-in #btnHeaderNotifications,
      html.is-logged-in #userProfileWrap,
      html.is-logged-in #logoutBtn,
      html.is-logged-in .shared-logout-btn,
      html.is-logged-in .mt-logout-btn,
      html.is-logged-in #headerNotifWrap,
      html.is-logged-in #btnHeaderNotifications {
        display: inline-flex !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  /**
   * Performs a comprehensive DOM pass to suppress or adapt login/signup buttons and links.
   */
  function suppressLoginSignupAcrossDOM(auth) {
    if (typeof document === 'undefined' || !document.body) return;

    const root = document.documentElement;
    const body = document.body;

    if (auth.isLoggedIn) {
      body.classList.add('is-logged-in');
      body.classList.remove('is-logged-out');
      body.classList.remove('is-role-doctor', 'is-role-therapist', 'is-role-patient', 'is-role-admin');
      body.classList.add('is-role-' + auth.role);

      if (root) {
        root.classList.add('is-logged-in');
        root.classList.remove('is-logged-out');
        root.classList.remove('is-role-doctor', 'is-role-therapist', 'is-role-patient', 'is-role-admin');
        root.classList.add('is-role-' + auth.role);
      }
    } else {
      body.classList.add('is-logged-out');
      body.classList.remove('is-logged-in');
      body.classList.remove('is-role-doctor', 'is-role-therapist', 'is-role-patient', 'is-role-admin');

      if (root) {
        root.classList.add('is-logged-out');
        root.classList.remove('is-logged-in');
        root.classList.remove('is-role-doctor', 'is-role-therapist', 'is-role-patient', 'is-role-admin');
      }
    }

    const filename = window.location.pathname.split('/').pop().split('?')[0].split('#')[0] || 'index.html';
    const isAuthFormPage = ['patient-login.html', 'login.html', 'doctor-login.html', 'admin-login.html', 'signup.html', 'doctor-signup.html'].includes(filename);
    const isPatientHomePage = filename === 'patient-home.html';

    // On patient-home.html: unconditionally remove Patient Login, Doctor Login, Admin Login from visible navigation
    if (isPatientHomePage) {
      if (document.body) document.body.classList.add('page-patient-home');
      if (document.documentElement) document.documentElement.classList.add('page-patient-home');
      document.querySelectorAll('#navPatientLogin, #navDoctorLogin, #navAdminLogin, #btnHeaderLogin, #btnPatientLogin, #btnDoctorLogin, a[href*="login.html"], a[href*="patient-login.html"], a[href*="doctor-login.html"], a[href*="admin-login.html"]').forEach(el => {
        const parentLi = el.closest('li');
        if (parentLi) {
          parentLi.style.setProperty('display', 'none', 'important');
          if (typeof parentLi.remove === 'function') parentLi.remove();
        } else {
          el.style.setProperty('display', 'none', 'important');
          if (typeof el.remove === 'function') el.remove();
        }
      });
    }

    if (auth.isLoggedIn) {
      // 1. Hide all Sign Up elements
      document.querySelectorAll('#btnHeaderSignup, .shared-btn-signup, .doc-btn-signup, .btn-header-signup, .mt-signup-btn').forEach(el => {
        el.style.setProperty('display', 'none', 'important');
        const parentLi = el.closest('li');
        if (parentLi) parentLi.style.setProperty('display', 'none', 'important');
      });

      // 2. Hide all Login elements
      document.querySelectorAll('#navPatientLogin, #navDoctorLogin, #navAdminLogin, #btnHeaderLogin, #btnPatientLogin, #btnDoctorLogin, .shared-btn-login, .mt-login-btn, #homeLoginButtonsGroup, .home-login-btn').forEach(el => {
        el.style.setProperty('display', 'none', 'important');
        const parentLi = el.closest('li');
        if (parentLi) parentLi.style.setProperty('display', 'none', 'important');
      });

      // 3. Remove/hide links to auth pages across non-auth forms
      if (!isAuthFormPage) {
        document.querySelectorAll('a').forEach(el => {
          if (el.closest('#userProfileWrap') || el.id === 'logoutBtn' || el.classList.contains('shared-logout-btn') || el.classList.contains('profile-dropdown-item')) return;
          const href = (el.getAttribute('href') || '').toLowerCase();
          const text = (el.textContent || '').trim().toLowerCase();

          const isAuthHref = href.endsWith('login.html') || href.endsWith('patient-login.html') || href.endsWith('doctor-login.html') ||
                             href.endsWith('admin-login.html') || href.endsWith('signup.html') || href.endsWith('doctor-signup.html');
          const isAuthText = text === 'patient login' || text === 'doctor login' || text === 'admin login' || text === 'sign up' || text === 'patient sign up' || text === 'doctor sign up';

          if (isAuthHref || isAuthText) {
            el.style.setProperty('display', 'none', 'important');
            const parentLi = el.closest('li');
            if (parentLi) parentLi.style.setProperty('display', 'none', 'important');
          }
        });
      }

      // 4. Role-specific Navigation Purification:
      if (auth.role === 'admin') {
        // Admin: Show ONLY Admin Dashboard. Hide Home, Doctor Home, Patient Home, Therapist Home, Clinical Management
        document.querySelectorAll('#navHome, #navDoctorHome, #navTherapistHome, #navPatientHome, #navClinicalDropdown, .nav-item-dropdown').forEach(el => {
          el.style.setProperty('display', 'none', 'important');
          const parentLi = el.closest('li');
          if (parentLi) parentLi.style.setProperty('display', 'none', 'important');
        });
        const adminDash = document.getElementById('navAdminDash');
        if (adminDash) {
          adminDash.style.removeProperty('display');
          const p = adminDash.closest('li');
          if (p) p.style.removeProperty('display');
        }
      } else if (auth.role === 'doctor') {
        // Doctor: Show ONLY Doctor Dashboard and Clinical Management. Hide Home, Patient Home, Therapist Home, Admin Dashboard
        document.querySelectorAll('#navHome, #navPatientHome, #navTherapistHome, #navAdminDash').forEach(el => {
          el.style.setProperty('display', 'none', 'important');
          const parentLi = el.closest('li');
          if (parentLi) parentLi.style.setProperty('display', 'none', 'important');
        });
        const docHome = document.getElementById('navDoctorHome');
        if (docHome) {
          docHome.style.removeProperty('display');
          const p = docHome.closest('li');
          if (p) p.style.removeProperty('display');
        }
        const clinDrop = document.getElementById('navClinicalDropdown') || document.querySelector('.nav-item-dropdown');
        if (clinDrop) {
          clinDrop.style.removeProperty('display');
          const p = clinDrop.closest('li');
          if (p) p.style.removeProperty('display');
        }
      } else if (auth.role === 'therapist') {
        // Therapist: Show ONLY Therapist Dashboard and Clinical Management. Hide Home, Patient Home, Doctor Home, Admin Dashboard
        document.querySelectorAll('#navHome, #navPatientHome, #navDoctorHome, #navAdminDash').forEach(el => {
          el.style.setProperty('display', 'none', 'important');
          const parentLi = el.closest('li');
          if (parentLi) parentLi.style.setProperty('display', 'none', 'important');
        });
        const thHome = document.getElementById('navTherapistHome');
        if (thHome) {
          thHome.style.removeProperty('display');
          const p = thHome.closest('li');
          if (p) p.style.removeProperty('display');
        }
        const clinDrop = document.getElementById('navClinicalDropdown') || document.querySelector('.nav-item-dropdown');
        if (clinDrop) {
          clinDrop.style.removeProperty('display');
          const p = clinDrop.closest('li');
          if (p) p.style.removeProperty('display');
        }
      } else if (auth.role === 'patient') {
        // Patient: Show ONLY Patient Dashboard. Hide Home, Doctor Home, Therapist Home, Admin Dashboard, Clinical Management
        document.querySelectorAll('#navHome, #navDoctorHome, #navTherapistHome, #navAdminDash, #navClinicalDropdown, .nav-item-dropdown').forEach(el => {
          el.style.setProperty('display', 'none', 'important');
          const parentLi = el.closest('li');
          if (parentLi) parentLi.style.setProperty('display', 'none', 'important');
        });
        const ptHome = document.getElementById('navPatientHome');
        if (ptHome) {
          ptHome.style.removeProperty('display');
          const p = ptHome.closest('li');
          if (p) p.style.removeProperty('display');
        }
      }

      // Ensure profile pill, notifications, and logout are displayed
      document.querySelectorAll('#userProfileWrap, .shared-profile-wrap, #logoutBtn, .shared-logout-btn, #headerNotifWrap, #btnHeaderNotifications').forEach(el => {
        el.style.removeProperty('display');
        el.style.setProperty('display', 'inline-flex', 'important');
      });

      // Synchronize landing page cards if on index.html
      adaptLandingPage(auth);

    } else {
      // Guest mode: ensure login & signup buttons are visible
      document.querySelectorAll('#userProfileWrap, .shared-profile-wrap, #logoutBtn, .shared-logout-btn, #headerNotifWrap, #btnHeaderNotifications').forEach(el => {
        el.style.setProperty('display', 'none', 'important');
      });

      document.querySelectorAll('#navPatientLogin, #navDoctorLogin, #navAdminLogin, #btnHeaderSignup, #navHome, #navPatientHome, #navDoctorHome, #navClinicalDropdown, .nav-item-dropdown').forEach(el => {
        el.style.removeProperty('display');
        const parentLi = el.closest('li');
        if (parentLi) parentLi.style.removeProperty('display');
      });

      if (filename === 'index.html' || filename === '') {
        document.querySelectorAll('#homeLoginButtonsGroup, .home-login-btn').forEach(el => {
          el.style.removeProperty('display');
        });
      }

      // Synchronize landing page cards for guests
      adaptLandingPage(auth);
    }
  }

  /**
   * Adapts the landing page Quick Access cards and CTA buttons based on authentication state.
   */
  function adaptLandingPage(auth) {
    const filename = window.location.pathname.split('/').pop().split('?')[0].split('#')[0] || 'index.html';
    if (filename !== '' && filename !== 'index.html') return;

    const btnPatientLogin = document.getElementById('btnPatientLogin');
    const btnDoctorLogin = document.getElementById('btnDoctorLogin');
    const btnPatientHome = document.getElementById('btnPatientHome');
    const btnDoctorHome = document.getElementById('btnDoctorHome');

    if (auth.isLoggedIn) {
      if (btnPatientLogin) btnPatientLogin.style.setProperty('display', 'none', 'important');
      if (btnDoctorLogin) btnDoctorLogin.style.setProperty('display', 'none', 'important');

      if (auth.role === 'patient') {
        if (btnPatientHome) {
          const span = btnPatientHome.querySelector('span:first-child');
          if (span) span.textContent = 'Go to Patient Dashboard';
          btnPatientHome.style.flex = '1 1 100%';
        }
        if (btnDoctorHome) {
          const span = btnDoctorHome.querySelector('span:first-child');
          if (span) span.textContent = 'Doctor Portal (Doctor Only)';
        }
      } else if (auth.role === 'doctor') {
        if (btnDoctorHome) {
          const span = btnDoctorHome.querySelector('span:first-child');
          if (span) span.textContent = 'Go to Doctor Dashboard';
          btnDoctorHome.style.flex = '1 1 100%';
        }
        if (btnPatientHome) {
          const span = btnPatientHome.querySelector('span:first-child');
          if (span) span.textContent = 'Patient Portal (Patient Only)';
        }
      } else if (auth.role === 'therapist') {
        if (btnDoctorHome) {
          const span = btnDoctorHome.querySelector('span:first-child');
          if (span) span.textContent = 'Go to Therapist Dashboard';
          btnDoctorHome.style.flex = '1 1 100%';
        }
        if (btnPatientHome) {
          const span = btnPatientHome.querySelector('span:first-child');
          if (span) span.textContent = 'Patient Portal (Patient Only)';
        }
      } else if (auth.role === 'admin') {
        if (btnPatientHome) {
          btnPatientHome.href = './patients.html';
          const span = btnPatientHome.querySelector('span:first-child');
          if (span) span.textContent = 'Manage Patients';
        }
        if (btnDoctorHome) {
          btnDoctorHome.href = './doctors.html';
          const span = btnDoctorHome.querySelector('span:first-child');
          if (span) span.textContent = 'Manage Doctors';
        }
      }
    } else {
      if (btnPatientLogin) {
        btnPatientLogin.style.removeProperty('display');
        btnPatientLogin.href = './patient-login.html';
        const span = btnPatientLogin.querySelector('span');
        if (span) span.textContent = 'Patient Login';
      }
      if (btnDoctorLogin) {
        btnDoctorLogin.style.removeProperty('display');
        btnDoctorLogin.href = './doctor-login.html';
        const span = btnDoctorLogin.querySelector('span');
        if (span) span.textContent = 'Doctor Login';
      }
      if (btnPatientHome) {
        btnPatientHome.href = './patient-home.html';
        const span = btnPatientHome.querySelector('span:first-child');
        if (span) span.textContent = 'Patient Home';
        btnPatientHome.style.flex = '1';
      }
      if (btnDoctorHome) {
        btnDoctorHome.href = './doctor-home.html';
        const span = btnDoctorHome.querySelector('span:first-child');
        if (span) span.textContent = 'Doctor Dashboard';
        btnDoctorHome.style.flex = '1';
      }
    }
  }

  /**
   * Centralized global logout action.
   */
  function handleGlobalLogout(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();

    try {
      const storage = (typeof window !== 'undefined' && window.localStorage) ? window.localStorage : (typeof localStorage !== 'undefined' ? localStorage : null);
      const sStorage = (typeof window !== 'undefined' && window.sessionStorage) ? window.sessionStorage : (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
      if (storage) {
        storage.removeItem('currentUser');
        storage.removeItem('adminRole');
        storage.removeItem('adminToken');
        storage.removeItem('token');
      }
      if (sStorage) {
        sStorage.removeItem('currentUser');
        sStorage.removeItem('admin_logged_in');
        sStorage.removeItem('doctorLoginOtp');
        sStorage.removeItem('captcha');
        sStorage.removeItem('doctorCaptcha');
      }
    } catch (err) {
      console.warn('Logout storage cleanup error:', err);
    }

    try {
      if (typeof apiRequest === 'function') {
        apiRequest('/api/logout', { method: 'POST' }).catch(() => {});
      } else if (typeof fetch === 'function') {
        fetch('/api/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
      }
    } catch (err) {}

    try {
      window.dispatchEvent(new CustomEvent('userLoggedOut'));
    } catch (err) {}

    const base = getBasePath();
    window.location.replace(`${base}index.html`);
  }

  /**
   * Attach event listeners to navigation buttons, logout, and notification dropdown.
   */
  function attachHeaderEvents(header) {
    if (!header) return;

    // Mobile Hamburger Navigation Toggle
    const navToggle = header.querySelector('#navToggle');
    const navMenu = header.querySelector('#navMenu');
    if (navToggle && navMenu) {
      navToggle.onclick = function (e) {
        e.stopPropagation();
        navMenu.classList.toggle('open');
      };

      document.addEventListener('click', function (e) {
        if (!navMenu.contains(e.target) && e.target !== navToggle) {
          navMenu.classList.remove('open');
        }
      });
    }

    // Notification Dropdown Toggle
    const notifBtn = header.querySelector('#btnHeaderNotifications');
    const notifDropdown = header.querySelector('#headerNotifDropdown');
    if (notifBtn && notifDropdown) {
      notifBtn.onclick = function (e) {
        e.stopPropagation();
        notifDropdown.classList.toggle('show');
      };

      document.addEventListener('click', function (e) {
        if (!notifDropdown.contains(e.target) && e.target !== notifBtn) {
          notifDropdown.classList.remove('show');
        }
      });
    }

    // User Profile Dropdown Toggle
    const userProfileBtn = header.querySelector('#userProfileBtn');
    const userProfileWrap = header.querySelector('#userProfileWrap');
    const userProfileDropdown = header.querySelector('#userProfileDropdown');
    if (userProfileBtn && userProfileDropdown) {
      userProfileBtn.onclick = function (e) {
        e.stopPropagation();
        const isOpen = userProfileDropdown.classList.toggle('show');
        userProfileBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        if (userProfileWrap) userProfileWrap.classList.toggle('open', isOpen);
      };

      document.addEventListener('click', function (e) {
        if (userProfileWrap && !userProfileWrap.contains(e.target)) {
          userProfileDropdown.classList.remove('show');
          userProfileBtn.setAttribute('aria-expanded', 'false');
          userProfileWrap.classList.remove('open');
        }
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && userProfileDropdown.classList.contains('show')) {
          userProfileDropdown.classList.remove('show');
          userProfileBtn.setAttribute('aria-expanded', 'false');
          if (userProfileWrap) userProfileWrap.classList.remove('open');
          userProfileBtn.focus();
        }
      });
    }

    // Global Logout Button Handlers (prominent header button + dropdown logout item)
    const logoutBtns = document.querySelectorAll('#logoutBtn, .mt-logout-btn, .shared-logout-btn, #btnLogout, #dropdownLogoutBtn, .profile-dropdown-logout');
    logoutBtns.forEach(btn => {
      btn.onclick = handleGlobalLogout;
    });
  }

  /**
   * Primary initializer for Multi Therapy Dark Navy Header.
   */
  function initHeader() {
    const base = getBasePath();
    const activeKey = getActiveKey();
    const auth = getAuthUser();

    // 1. Inject auth styling & theme
    injectHealthcareTheme();
    injectAuthStyles();
    injectSidebarScript();

    if (activeKey === 'home' && typeof document !== 'undefined' && document.body) {
      document.body.classList.add('page-home');
    }

    // 2. Identify primary header or create if none exists
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
      header.innerHTML = getHeaderHTML(base, activeKey, auth);

      // Re-insert live DB badge if this was admin dashboard or admin session
      if (hadDbBadge || (auth.isLoggedIn && auth.role === 'admin' && activeKey === 'admin')) {
        const notifWrap = header.querySelector('.shared-notif-wrap') || header.querySelector('.shared-nav-right');
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

      // Attach event listeners
      attachHeaderEvents(header);

      // Synchronize DOM elements (hide login/signup buttons if authenticated)
      suppressLoginSignupAcrossDOM(auth);

      // Trigger user profile updates if api.js is loaded
      try {
        if (typeof window.renderNavbarUser === 'function' && auth.user) {
          window.renderNavbarUser(auth.user);
        }
      } catch (e) {
        console.warn('Navbar user update:', e);
      }
    }
  }

  // Cross-tab, runtime session, and bfcache Back navigation protection listener
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', function (e) {
      if (e.key === 'currentUser' || e.key === 'adminRole' || e.key === 'adminToken') {
        initHeader();
      }
    });

    window.addEventListener('userLoggedIn', function () {
      initHeader();
    });

    window.addEventListener('userLoggedOut', function () {
      initHeader();
    });

    // Guard against bfcache Back button exposure of protected pages after logout
    window.addEventListener('pageshow', function (event) {
      const isBackNav = event.persisted || (window.performance && window.performance.navigation && window.performance.navigation.type === 2);
      const auth = getAuthUser();
      const filename = window.location.pathname.split('/').pop().split('?')[0].split('#')[0] || 'index.html';
      const isProtected = ['patient-home.html', 'doctor-home.html', 'therapist-dashboard.html', 'admin-dashboard.html', 'doctor-profile.html', 'patient-profile.html'].includes(filename);

      if (isProtected && !auth.isLoggedIn) {
        window.location.replace(getBasePath() + 'index.html');
        return;
      }

      if (filename === 'patient-home.html' && auth.role === 'admin') {
        window.location.replace(getBasePath() + 'admin-dashboard.html');
        return;
      }

      if (filename === 'patient-home.html' && (auth.role === 'doctor' || auth.role === 'therapist')) {
        window.location.replace(getBasePath() + 'doctor-home.html');
        return;
      }

      if (filename === 'doctor-home.html' && auth.role === 'patient') {
        window.location.replace(getBasePath() + 'patient-home.html');
        return;
      }

      if (filename === 'doctor-home.html' && auth.role === 'admin') {
        window.location.replace(getBasePath() + 'admin-dashboard.html');
        return;
      }

      if (filename.startsWith('admin-') && filename !== 'admin-login.html' && auth.role !== 'admin') {
        window.location.replace(getBasePath() + 'admin-login.html');
        return;
      }

      initHeader();
    });
  }

  // Public Exports
  window.renderMultiTherapyHeader = initHeader;
  window.getMultiTherapyHeaderHTML = getHeaderHTML;
  window.getAuthUser = getAuthUser;
  window.getCurrentUser = getAuthUser;
  window.handleGlobalLogout = handleGlobalLogout;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeader);
  } else {
    initHeader();
  }
})();
