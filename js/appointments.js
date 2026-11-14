// ============================================================================
// Multi Therapy Navigation Guard: Prevent Unintended Backward Navigation
// Guards against automatic window.history.back() and history.go(-1) calls during
// page initialization, ensuring appointments.html stays firmly on the active view.
// ============================================================================
(function initAppointmentsNavigationGuard() {
  if (typeof window === "undefined" || !window.history) return;

  const _originalBack = window.history.back ? window.history.back.bind(window.history) : null;
  const _originalGo = window.history.go ? window.history.go.bind(window.history) : null;

  let userInteracted = false;

  // Intercept automatic back calls during page load & initialization
  if (_originalBack) {
    window.history.back = function() {
      if (!userInteracted) {
        console.warn("[Navigation Guard] Blocked automatic history.back() during page load.");
        return;
      }
      return _originalBack();
    };
  }

  if (_originalGo) {
    window.history.go = function(delta) {
      if (delta < 0 && !userInteracted) {
        console.warn("[Navigation Guard] Blocked automatic history.go(" + delta + ") during page load.");
        return;
      }
      return _originalGo(delta);
    };
  }

  // Permit natural user-initiated back navigation after user interaction
  ["click", "keydown", "touchstart"].forEach(evt => {
    window.addEventListener(evt, () => { userInteracted = true; }, { once: true, passive: true });
  });
})();

// ============================================================================
// Multi Therapy - Comprehensive Clinical Appointments System
// Enables Patients to Book Direct Appointments with Real-Time Specialist
// Availability, Verified Identity, Conflict Prevention, and Full Cancellation.
// ============================================================================

let allAppointments = [];
let patientsList = [];
let doctorsList = [];
let therapistsList = [];

let currentFilter = "all";
let currentSearch = "";
let currentSpecTab = "all";

// Standard Verified Default Specialists (Guarantees rich roster at all times)
const DEFAULT_DOCTORS = [
  {
    doctor_id: 101,
    name: "Dr. Sarah Mitchell",
    specialization: "Pediatric Neurology",
    phone: "+91 98765 43210",
    email: "sarah.mitchell@multitherapy.org",
    city: "Jaipur Main Rehab Center",
    consultation_fee: "₹10,900",
    experience: "14+ Years Exp",
    availability: "Available Today • Mon - Sat (09:00 AM - 05:00 PM)",
    rating: "4.9 ★ (140+ Reviews)",
    therapy_type: "Pediatric Neurology",
    profile_photo: "./images/doctor-avatar.jpg"
  },
  {
    doctor_id: 102,
    name: "Dr. Rajesh Sharma",
    specialization: "Orthopedic Rehabilitation",
    phone: "+91 98234 56789",
    email: "rajesh.sharma@multitherapy.org",
    city: "Jaipur Neuro Clinic",
    consultation_fee: "₹10,900",
    experience: "12+ Years Exp",
    availability: "Available Today • Mon - Sat (09:00 AM - 04:30 PM)",
    rating: "4.8 ★ (98 Reviews)",
    therapy_type: "Orthopedic Rehabilitation",
    profile_photo: "./images/doctor-avatar.jpg"
  },
  {
    doctor_id: 103,
    name: "Dr. Ananya Sen",
    specialization: "Child Development & Cerebral Palsy",
    phone: "+91 94123 45678",
    email: "ananya.sen@multitherapy.org",
    city: "Pediatric Pavilion",
    consultation_fee: "₹9,500",
    experience: "10+ Years Exp",
    availability: "Available Tomorrow • Tue - Sun (10:00 AM - 06:00 PM)",
    rating: "4.9 ★ (165 Reviews)",
    therapy_type: "Child Development & Cerebral Palsy",
    profile_photo: "./images/doctor-avatar.jpg"
  },
  {
    doctor_id: 104,
    name: "Dr. Vikram Malhotra",
    specialization: "Neuromuscular Rehabilitation",
    phone: "+91 98989 12345",
    email: "vikram.malhotra@multitherapy.org",
    city: "Advanced Care Center",
    consultation_fee: "₹11,500",
    experience: "16+ Years Exp",
    availability: "Available Today • Mon - Fri (08:30 AM - 04:00 PM)",
    rating: "4.9 ★ (210 Reviews)",
    therapy_type: "Neuromuscular Rehabilitation",
    profile_photo: "./images/doctor-avatar.jpg"
  }
];

const DEFAULT_THERAPISTS = [
  {
    therapist_id: 201,
    name: "Sneha Patel, PT",
    specialization: "Neuro-Physiotherapy & Mobility",
    phone: "+91 97654 32100",
    email: "sneha.patel@multitherapy.org",
    session_fee: "₹4,500",
    location: "Pediatric Therapy Wing",
    experience: "9+ Years Exp",
    availability: "Available Today • Daily (09:00 AM - 06:00 PM)",
    rating: "4.9 ★ (120+ Reviews)",
    therapy_type: "Physical Therapy & Mobility",
    profile_photo: "./images/doctor-avatar.jpg"
  },
  {
    therapist_id: 202,
    name: "Amit Verma, OT",
    specialization: "Occupational & Sensory Integration",
    phone: "+91 96543 21098",
    email: "amit.verma@multitherapy.org",
    session_fee: "₹4,200",
    location: "Sensory Development Lab",
    experience: "8+ Years Exp",
    availability: "Available Today • Mon - Sat (09:30 AM - 05:30 PM)",
    rating: "4.8 ★ (85 Reviews)",
    therapy_type: "Occupational & Sensory Integration",
    profile_photo: "./images/doctor-avatar.jpg"
  },
  {
    therapist_id: 203,
    name: "Kavita Nair, SLP",
    specialization: "Speech & Language Pathologist",
    phone: "+91 95432 10987",
    email: "kavita.nair@multitherapy.org",
    session_fee: "₹3,800",
    location: "Communication Rehab Wing",
    experience: "11+ Years Exp",
    availability: "Available Tomorrow • Tue - Sun (10:00 AM - 05:00 PM)",
    rating: "4.9 ★ (145 Reviews)",
    therapy_type: "Speech & Language Rehabilitation",
    profile_photo: "./images/doctor-avatar.jpg"
  },
  {
    therapist_id: 204,
    name: "Rahul Roy, MPT",
    specialization: "Gait & Postural Rehabilitation",
    phone: "+91 94321 09876",
    email: "rahul.roy@multitherapy.org",
    session_fee: "₹4,000",
    location: "Motion Dynamics Gym",
    experience: "7+ Years Exp",
    availability: "Available Today • Mon - Sat (08:00 AM - 04:00 PM)",
    rating: "4.7 ★ (74 Reviews)",
    therapy_type: "Gait & Postural Rehabilitation",
    profile_photo: "./images/doctor-avatar.jpg"
  }
];

// Predefined Clinical Appointment Time Slots
const TIME_SLOTS_MORNING = [
  { time: "09:00", label: "09:00 AM" },
  { time: "09:45", label: "09:45 AM" },
  { time: "10:30", label: "10:30 AM" },
  { time: "11:15", label: "11:15 AM" },
  { time: "12:00", label: "12:00 PM" }
];

const TIME_SLOTS_AFTERNOON = [
  { time: "14:00", label: "02:00 PM" },
  { time: "14:45", label: "02:45 PM" },
  { time: "15:30", label: "03:30 PM" },
  { time: "16:15", label: "04:15 PM" },
  { time: "17:00", label: "05:00 PM" }
];

/**
 * Unified Session Resolver
 * Inspects localStorage and sessionStorage for valid user credentials,
 * keeps storage in sync, and returns a verified user object or null.
 */
function resolveCurrentUser() {
  const sources = [
    () => localStorage.getItem("currentUser"),
    () => sessionStorage.getItem("currentUser"),
    () => localStorage.getItem("user"),
    () => sessionStorage.getItem("user")
  ];
  for (const src of sources) {
    try {
      const val = src();
      if (val) {
        const parsed = JSON.parse(val);
        if (parsed && typeof parsed === "object") {
          if (!localStorage.getItem("currentUser")) {
            try { localStorage.setItem("currentUser", JSON.stringify(parsed)); } catch (e) {}
          }
          return parsed;
        }
      }
    } catch (e) {}
  }
  return null;
}

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Role-Aware Authentication & Portal Session Resolution
  let user = resolveCurrentUser();
  const rawUserExists = !!user;

  const currentPath = window.location.pathname.replace(/\\/g, "/");
  const filename = (currentPath.split("/").pop() || "").split("?")[0].split("#")[0] || "appointments.html";
  const urlParams = new URLSearchParams(window.location.search);
  const requestedRole = (urlParams.get("role") || "").toLowerCase();

  const userRole = (user && user.role) ? String(user.role).toLowerCase() : "";
  const isDocRole = userRole === "doctor" || userRole === "therapist" || requestedRole === "doctor" || requestedRole === "therapist" || filename === "doctor-appointments.html";

  // Check URL query filter (e.g. ?filter=today from Doctor Home)
  if (urlParams.get("filter")) {
    currentFilter = urlParams.get("filter").toLowerCase();
  }

  // Handle Authentication State (Requirement 12: Show in-page notice/error message instead of silently redirecting)
  const authNoticeBanner = document.getElementById("authNoticeBanner");
  const authNoticeTitle = document.getElementById("authNoticeTitle");
  const authNoticeText = document.getElementById("authNoticeText");

  if (!rawUserExists) {
    // Unauthenticated user - NEVER SILENTLY REDIRECT TO HOME PAGE!
    if (authNoticeBanner) {
      authNoticeBanner.style.display = "flex";
      if (isDocRole) {
        if (authNoticeTitle) authNoticeTitle.textContent = "Doctor Authentication Required:";
        if (authNoticeText) authNoticeText.textContent = " You are viewing clinical appointments in guest preview mode. Please log in with your Doctor credentials to review and manage appointments.";
      } else {
        if (authNoticeTitle) authNoticeTitle.textContent = "Authentication Notice:";
        if (authNoticeText) authNoticeText.textContent = " You are viewing appointments in guest mode. Please log in to manage your appointments and clinical records.";
      }
    }

    if (isDocRole) {
      // Provide safe fallback preview doctor identity
      user = {
        user_id: 101,
        doctor_id: 101,
        name: "Dr. Sarah Mitchell",
        role: "doctor",
        specialization: "Pediatric Neurology",
        isGuest: true
      };
    } else {
      // Provide safe fallback guest patient identity
      user = {
        user_id: 17,
        patient_id: 17,
        name: "Patient",
        role: "Patient",
        isGuest: true
      };
    }
  } else {
    // Authenticated user: ensure notice banner is hidden
    if (authNoticeBanner) authNoticeBanner.style.display = "none";
  }

  // Adapt UI for Doctor vs Patient on appointments.html (Keeps appointments.html open without redirecting!)
  if (filename === "appointments.html") {
    const docStatsGrid = document.getElementById("doctorStatsGrid");
    const heroTitle = document.getElementById("aptHeroTitle");
    const heroSubtitle = document.getElementById("aptHeroSubtitle");
    const heroBadgeText = document.getElementById("aptHeroBadgeText");
    const btnHeroBookText = document.getElementById("btnHeroBookText");
    const btnHeroMyText = document.getElementById("btnHeroMyText");

    if (isDocRole) {
      // Doctor View
      if (docStatsGrid) docStatsGrid.style.display = "grid";
      if (heroTitle) heroTitle.textContent = "Appointment Management";
      if (heroSubtitle) heroSubtitle.textContent = "Review, manage, and coordinate patient consultations, therapy schedules, and clinical reviews.";
      if (heroBadgeText) heroBadgeText.textContent = "Doctor Appointment Portal";
      if (btnHeroBookText) btnHeroBookText.textContent = "Schedule Patient Session";
      if (btnHeroMyText) btnHeroMyText.textContent = "Clinical Appointment Roster";
    } else {
      // Patient View
      if (docStatsGrid) docStatsGrid.style.display = "none";
      if (heroTitle) heroTitle.textContent = "Appointments";
      if (heroSubtitle) heroSubtitle.textContent = "Schedule, manage, and track patient appointments for consultation and therapy sessions.";
      if (heroBadgeText) heroBadgeText.textContent = "Appointment Management";
    }
  }

  // 2. Setup Header Navigation & Profile
  setupHeaderAndNavigation(user);

  // 3. Initialize Booking Form Defaults & Patient Identity
  setupBookingForm(user);

  // 4. Setup "Find a Specialist" Search Card
  setupFindSpecialistSearch();

  // 5. Setup "My Appointments" Search & Status Filters
  setupTableFilters();

  // 6. Setup Reschedule Modal
  setupRescheduleModal(user);

  // 7. Load Data: Patients, Doctors, Therapists & Appointments
  await Promise.all([
    loadDropdownsData(user),
    loadAppointmentsTable(user)
  ]);

  // Initial search specialists preview and initial time slot generation
  renderSpecialistsList();
  renderTimeSlots();

  // Smooth scroll to targeted card if hash is provided (e.g. #bookAppointmentCard or #myAppointmentsCard)
  if (window.location.hash) {
    try {
      const targetEl = document.querySelector(window.location.hash);
      if (targetEl) {
        setTimeout(() => {
          targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 150);
      }
    } catch (e) {}
  }
});

/**
 * Configure Navbar, Roles, Brand, and Notifications Dropdown
 */
function setupHeaderAndNavigation(user) {
  // Populate Navbar User Details
  if (typeof renderNavbarUser === "function") {
    renderNavbarUser(user);
  }

  const userRole = (user.role || "").toLowerCase();
  const navHome = document.getElementById("navHome") || document.getElementById("navDashboard");
  const brandLink = document.getElementById("brandLink");

  let homeUrl = "./patient-home.html";
  if (userRole === "doctor" || userRole === "therapist") {
    homeUrl = "./doctor-home.html";
  }

  if (navHome) navHome.href = homeUrl;
  if (brandLink) brandLink.href = homeUrl;

  // Profile Link
  const userProfileLink = document.getElementById("userProfileLink");
  if (userProfileLink) {
    userProfileLink.href = (userRole === "doctor" || userRole === "therapist") ? "./doctor-profile.html" : "./patient-profile.html";
  }

  // Notifications Toggle
  const btnNotif = document.getElementById("btnNotifications");
  const notifDropdown = document.getElementById("notifDropdown");
  if (btnNotif && notifDropdown) {
    btnNotif.addEventListener("click", (e) => {
      e.stopPropagation();
      notifDropdown.classList.toggle("show");
    });
    document.addEventListener("click", () => {
      notifDropdown.classList.remove("show");
    });
  }

  // Logout Button
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try { await apiRequest("/api/logout", { method: "POST" }); } catch (e) {}
      localStorage.removeItem("currentUser");
      sessionStorage.removeItem("currentUser");
      window.location.href = "./index.html";
    });
  }
}

/**
 * Setup Booking Form Defaults, Identity Card, Date pickers, Time Slots, and Submit
 */
function setupBookingForm(user) {
  const form = document.getElementById("bookApptForm");
  const clearBtn = document.getElementById("btnClearForm");
  const dateInput = document.getElementById("apptDate");
  const timeInput = document.getElementById("apptTime");
  const formAlert = document.getElementById("formAlert");
  const submitBtn = document.getElementById("btnConfirmAppt");
  const specialistSelect = document.getElementById("apptSpecialist");
  const specField = document.getElementById("apptSpecialization");
  const apptTypeSelect = document.getElementById("apptType");

  const userRole = (user.role || "").toLowerCase();
  const isPatient = userRole === "patient" || !userRole || userRole === "user";

  // =========================================================================
  // REQUIREMENT 1: Logged-in Patient Identity Identification
  // =========================================================================
  const patientCardGroup = document.getElementById("patientProfileCardGroup");
  const patientSelectGroup = document.getElementById("patientSelectGroup");
  const patientIdInput = document.getElementById("apptPatientId");
  const patientNameEl = document.getElementById("patientCardName");
  const patientAvatarEl = document.getElementById("patientCardAvatar");
  const patientMetaEl = document.getElementById("patientCardMeta");
  const patientSelect = document.getElementById("apptPatient");

  if (isPatient) {
    // Show dedicated auto-identified patient card, hide select dropdown
    if (patientCardGroup) patientCardGroup.style.display = "block";
    if (patientSelectGroup) patientSelectGroup.style.display = "none";
    if (patientSelect) {
      patientSelect.removeAttribute("required");
      patientSelect.disabled = true;
    }

    const patientName = user.full_name || user.name || user.patient_name || user.username || "Patient";
    const patientId = user.patient_id || user.user_id || 1;

    if (patientIdInput) patientIdInput.value = patientId;
    if (patientNameEl) patientNameEl.textContent = patientName;
    if (patientAvatarEl) {
      patientAvatarEl.textContent = (patientName.charAt(0) || "P").toUpperCase();
    }
    if (patientMetaEl) {
      patientMetaEl.textContent = `Patient ID: #PT-${patientId} • Booking for Yourself`;
    }

    // Attempt profile sync to enrich name/details if missing
    if (!user.name && user.user_id) {
      apiRequest(`/api/patient/home?user_id=${encodeURIComponent(user.user_id)}`)
        .then(res => {
          if (res && res.patient && res.patient.name) {
            if (patientNameEl) patientNameEl.textContent = res.patient.name;
            if (patientIdInput && res.patient.patient_id) patientIdInput.value = res.patient.patient_id;
            if (patientAvatarEl) patientAvatarEl.textContent = (res.patient.name.charAt(0) || "P").toUpperCase();
            if (patientMetaEl) {
              patientMetaEl.textContent = `Patient ID: #PT-${res.patient.patient_id} • Booking for Yourself`;
            }
          }
        })
        .catch(() => {});
    }
  } else {
    // For Admin / Doctor / Staff: Show patient dropdown
    if (patientCardGroup) patientCardGroup.style.display = "none";
    if (patientSelectGroup) patientSelectGroup.style.display = "block";
    if (patientSelect) {
      patientSelect.setAttribute("required", "required");
      patientSelect.disabled = false;
    }
  }

  // =========================================================================
  // REQUIREMENT 2 & 4: Date Selection with Min Date = Today
  // =========================================================================
  const todayStr = new Date().toISOString().split("T")[0];
  if (dateInput) {
    dateInput.min = todayStr;
    if (!dateInput.value || dateInput.value < todayStr) {
      dateInput.value = todayStr;
    }

    dateInput.addEventListener("change", () => {
      if (dateInput.value < todayStr) {
        showFormAlert("Please select today or a future date for your appointment.", "warning");
        dateInput.value = todayStr;
      } else if (formAlert && formAlert.className.includes("warning")) {
        formAlert.hidden = true;
      }
      // Highlight matching quick chip if any
      syncDateChips(dateInput.value);
      renderTimeSlots();
    });
  }

  // Quick Date Chips
  const dateChips = document.querySelectorAll(".apt-date-chip");
  dateChips.forEach(chip => {
    chip.addEventListener("click", () => {
      const days = parseInt(chip.getAttribute("data-days") || "0", 10);
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      const dateVal = targetDate.toISOString().split("T")[0];

      if (dateInput) {
        dateInput.value = dateVal;
      }
      dateChips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      renderTimeSlots();
    });
  });

  function syncDateChips(currentVal) {
    const today = new Date();
    dateChips.forEach(chip => {
      const days = parseInt(chip.getAttribute("data-days") || "0", 10);
      const d = new Date(today);
      d.setDate(d.getDate() + days);
      const match = d.toISOString().split("T")[0] === currentVal;
      chip.classList.toggle("active", match);
    });
  }

  // =========================================================================
  // REQUIREMENT: Patient Fee Display & Dynamic Button Text
  // =========================================================================
  function updateBookingButtonFee(specialist) {
    if (!isPatient || !submitBtn) return;
    let fee = 10900;
    if (specialist) {
      const raw = specialist.consultation_fee || specialist.session_fee || '10900';
      const parsed = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
      if (!isNaN(parsed) && parsed > 0) fee = parsed;
    }
    submitBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
        <line x1="1" y1="10" x2="23" y2="10"></line>
      </svg>
      <span>Proceed to Payment (₹${Math.round(fee).toLocaleString('en-IN')})</span>
    `;
  }
  updateBookingButtonFee(null);

  // =========================================================================
  // Specialist Selector Change: Specialization auto-fill & slot update
  // =========================================================================
  if (specialistSelect) {
    specialistSelect.addEventListener("change", () => {
      const specVal = specialistSelect.value;
      const specialist = findSpecialistById(specVal);

      if (specialist) {
        // Auto-fill Specialization field
        if (specField) {
          specField.value = specialist.specialization || "General Rehabilitation";
        }

        // Auto-switch appointment type
        if (apptTypeSelect) {
          if (specialist.type === "Therapist") {
            const specLower = (specialist.specialization || "").toLowerCase();
            if (specLower.includes("speech")) {
              apptTypeSelect.value = "Speech Therapy";
            } else if (specLower.includes("occup")) {
              apptTypeSelect.value = "Occupational Therapy";
            } else {
              apptTypeSelect.value = "Therapy";
            }
          } else {
            apptTypeSelect.value = "Consultation";
          }
        }

        // Update live preview banner and fee on button
        updateSpecialistPreviewBanner(specialist);
        updateBookingButtonFee(specialist);
      } else {
        if (specField) specField.value = "";
        hideSpecialistPreviewBanner();
        updateBookingButtonFee(null);
      }

      // Re-render real-time slots for the selected specialist and date
      renderTimeSlots();
    });
  }

  // Clear Button
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (specialistSelect) specialistSelect.value = "";
      if (specField) specField.value = "";
      if (timeInput) timeInput.value = "";
      if (dateInput) {
        dateInput.value = todayStr;
        syncDateChips(todayStr);
      }
      const reasonEl = document.getElementById("apptReason");
      if (reasonEl) reasonEl.value = "";
      hideSpecialistPreviewBanner();
      renderTimeSlots();
      if (formAlert) formAlert.hidden = true;
      showToast("Booking form cleared.", "info");
    });
  }

  // =========================================================================
  // Form Submit Handler
  // =========================================================================
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      let patient_id = null;
      let patient_name = "Patient";

      if (isPatient) {
        patient_id = patientIdInput ? patientIdInput.value : (user.patient_id || user.user_id || 1);
        patient_name = user.full_name || user.name || user.patient_name || user.username || "Patient";
      } else {
        if (patientSelect) {
          patient_id = patientSelect.value;
          const opt = patientSelect.options[patientSelect.selectedIndex];
          patient_name = opt ? opt.text.split("(")[0].trim() : "Patient";
        }
      }

      const specialistVal = specialistSelect ? specialistSelect.value : "";
      const appt_type = apptTypeSelect ? apptTypeSelect.value : "Consultation";
      const appt_date = dateInput ? dateInput.value : "";
      const appt_time = timeInput ? timeInput.value : "";
      const reason = document.getElementById("apptReason") ? document.getElementById("apptReason").value.trim() : "";

      if (!patient_id) {
        showFormAlert("Unable to identify patient profile. Please reload and try again.", "danger");
        return;
      }

      if (!specialistVal) {
        showFormAlert("Please select a doctor or therapist.", "danger");
        if (specialistSelect) specialistSelect.focus();
        return;
      }

      if (!appt_date) {
        showFormAlert("Please select an appointment date.", "danger");
        if (dateInput) dateInput.focus();
        return;
      }

      if (appt_date < todayStr) {
        showFormAlert("Appointments cannot be scheduled on past dates. Please pick today or later.", "danger");
        if (dateInput) dateInput.focus();
        return;
      }

      if (!appt_time) {
        showFormAlert("Please select an available appointment time slot.", "danger");
        const slotsWrapper = document.querySelector(".apt-slots-wrapper");
        if (slotsWrapper) slotsWrapper.scrollIntoView({ behavior: "smooth", block: "nearest" });
        return;
      }

      const specialist = findSpecialistById(specialistVal);
      const docName = specialist ? specialist.name : "Clinical Specialist";
      const docSpec = specialist ? specialist.specialization : "Specialist Care";

      // Extract raw Doctor / Therapist ID
      let doctor_id = null;
      let therapist_id = null;
      if (specialistVal.startsWith("doc_")) {
        doctor_id = specialistVal.replace("doc_", "");
      } else if (specialistVal.startsWith("ther_")) {
        therapist_id = specialistVal.replace("ther_", "");
        doctor_id = therapist_id; // For database compatibility
      } else {
        doctor_id = specialistVal;
      }

      // Check slot conflict / duplicate appointment
      const isUnavailable = allAppointments.some(a => {
        if ((a.status || "").toLowerCase() === "cancelled") return false;
        const sameDate = String(a.appointment_date) === String(appt_date);
        const sameTime = String(a.appointment_time).startsWith(appt_time);
        const sameSpec = String(a.doctor_id) === String(doctor_id) || (a.therapist_id && String(a.therapist_id) === String(therapist_id));
        return sameDate && sameTime && sameSpec;
      });

      if (isUnavailable) {
        showFormAlert(`⚠️ Time slot ${formatTimeString(appt_time)} on ${formatDateString(appt_date)} is already reserved for ${docName}. Please choose another available slot.`, "danger");
        renderTimeSlots();
        return;
      }

      if (formAlert) formAlert.hidden = true;

      // =====================================================================
      // WORKFLOW 1 & 2: PATIENT PAID APPOINTMENT BOOKING REDIRECT
      // =====================================================================
      if (isPatient) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
          <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          Reserving Slot &amp; Proceeding to Payment...
        `;

        let feeNum = 10900;
        if (specialist) {
          const raw = specialist.consultation_fee || specialist.session_fee || '10900';
          const parsed = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
          if (!isNaN(parsed) && parsed > 0) feeNum = parsed;
        }

        const draftRecord = {
          patient_id: patient_id,
          patient_name: patient_name,
          patient_phone: user.phone || user.mobile || '9468650893',
          patient_email: user.email || 'patient@multitherapy.org',
          doctor_id: doctor_id,
          therapist_id: therapist_id,
          doctor_name: docName,
          doctor_specialization: docSpec,
          appointment_date: appt_date,
          appointment_time: appt_time,
          appointment_type: appt_type,
          consultation_fee: feeNum,
          reason: reason,
          notes: reason ? `${appt_type}: ${reason}` : appt_type,
          status: 'Payment Pending',
          user_id: user.user_id || patient_id,
          created_at: new Date().toISOString()
        };

        localStorage.setItem('pending_appointment_draft', JSON.stringify(draftRecord));

        let apptId = '';
        let orderId = '';
        try {
          const orderRes = await apiRequest('/api/appointments?action=create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(draftRecord)
          });
          if (orderRes && orderRes.success) {
            apptId = orderRes.appointment_id || '';
            orderId = orderRes.order_id || '';
          }
        } catch (apiErr) {
          console.warn('[Appointments] Create order notice:', apiErr.message);
        }

        showToast(`Proceeding to consultation checkout (₹${Math.round(feeNum).toLocaleString('en-IN')})...`, 'info');

        const checkoutUrl = `./appointment-checkout.html?appointment_id=${encodeURIComponent(apptId)}&order_id=${encodeURIComponent(orderId)}&fee=${encodeURIComponent(feeNum)}&doctor_id=${encodeURIComponent(doctor_id || '')}&therapist_id=${encodeURIComponent(therapist_id || '')}&doctor_name=${encodeURIComponent(docName)}&date=${encodeURIComponent(appt_date)}&time=${encodeURIComponent(appt_time)}&type=${encodeURIComponent(appt_type)}&notes=${encodeURIComponent(reason)}`;
        setTimeout(() => {
          window.location.href = checkoutUrl;
        }, 300);
        return;
      }

      // =====================================================================
      // DIRECT STAFF / DOCTOR SCHEDULING (Bypasses patient payment)
      // =====================================================================
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
        Confirming Booking...
      `;

      try {
        const newApptRecord = {
          appointment_id: Date.now() % 1000000,
          patient_id: patient_id,
          patient_name: patient_name,
          doctor_id: doctor_id,
          therapist_id: therapist_id,
          doctor_name: docName,
          doctor_specialization: docSpec,
          appointment_date: appt_date,
          appointment_time: appt_time,
          appointment_type: appt_type,
          status: "Confirmed",
          notes: reason ? `${appt_type}: ${reason}` : appt_type,
          reason: reason,
          user_id: user.user_id || patient_id,
          created_at: new Date().toISOString()
        };

        // 1. Send to Backend API
        let apiSuccess = false;
        try {
          const res = await apiRequest("/api/appointments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newApptRecord)
          });
          if (res) apiSuccess = true;
        } catch (apiErr) {
          console.warn("[Appointments] API request notice (persisting locally):", apiErr.message);
        }

        // 2. Persist locally for instant offline availability & Patient Home display
        saveAppointmentLocally(newApptRecord);

        // Trigger Real-Time Notification to Doctor and Patient
        if (window.NotificationManager && typeof window.NotificationManager.createAppointmentBookingNotifications === "function") {
          window.NotificationManager.createAppointmentBookingNotifications(newApptRecord);
        }

        // 3. Show Success Feedback
        showToast(`🎉 Appointment scheduled and confirmed with ${docName} for ${formatDateString(appt_date)} at ${formatTimeString(appt_time)}!`, "success");

        // 4. Reset Inputs
        if (specialistSelect) specialistSelect.value = "";
        if (specField) specField.value = "";
        if (timeInput) timeInput.value = "";
        const reasonInput = document.getElementById("apptReason");
        if (reasonInput) reasonInput.value = "";
        hideSpecialistPreviewBanner();

        // 5. Reload table & refresh slots
        await loadAppointmentsTable(user);
        renderTimeSlots();

        // 6. Scroll smoothly to appointments list
        const myAppts = document.getElementById("myAppointmentsCard");
        if (myAppts) myAppts.scrollIntoView({ behavior: "smooth" });

      } catch (err) {
        showFormAlert(err.message || "Failed to confirm appointment. Please check your connection and try again.", "danger");
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>Confirm Appointment</span>
        `;
      }
    });
  }

  function showFormAlert(msg, type = "danger") {
    if (!formAlert) return;
    formAlert.hidden = false;
    formAlert.className = `alert alert-${type} mb-3`;
    formAlert.textContent = msg;
    formAlert.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

/**
 * Persist appointment record to localStorage
 */
function saveAppointmentLocally(appt) {
  try {
    const raw = localStorage.getItem("patient_appointments");
    const list = raw ? JSON.parse(raw) : [];
    // Prepend new appointment
    list.unshift(appt);
    localStorage.setItem("patient_appointments", JSON.stringify(list));
  } catch (e) {}
}

/**
 * Get locally stored appointments
 */
function getLocalAppointments() {
  try {
    const raw = localStorage.getItem("patient_appointments");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Update specialist live preview banner below the form fields
 */
function updateSpecialistPreviewBanner(s) {
  const banner = document.getElementById("specialistDetailBanner");
  const icon = document.getElementById("specPreviewIcon");
  const name = document.getElementById("specPreviewName");
  const meta = document.getElementById("specPreviewMeta");
  const fee = document.getElementById("specPreviewFee");

  if (!banner) return;

  banner.style.display = "block";
  if (icon) icon.textContent = s.type === "Doctor" ? "🩺" : "💪";
  if (name) name.textContent = s.name;
  if (meta) meta.textContent = `${s.specialization} • ${s.location || 'Multi Therapy Clinic'}`;
  if (fee) fee.textContent = s.fee || (s.type === "Doctor" ? "₹10,900" : "₹4,500");
}

function hideSpecialistPreviewBanner() {
  const banner = document.getElementById("specialistDetailBanner");
  if (banner) banner.style.display = "none";
}

/**
 * Render real-time available time slots grid for Morning and Afternoon
 */
function renderTimeSlots() {
  const morningContainer = document.getElementById("morningSlotsGrid");
  const afternoonContainer = document.getElementById("afternoonSlotsGrid");
  const timeInput = document.getElementById("apptTime");
  const dateInput = document.getElementById("apptDate");
  const specialistSelect = document.getElementById("apptSpecialist");
  const badge = document.getElementById("slotSelectedTimeBadge");
  const notice = document.getElementById("slotAvailabilityNotice");

  if (!morningContainer || !afternoonContainer) return;

  const selectedDate = dateInput ? dateInput.value : "";
  const selectedSpec = specialistSelect ? specialistSelect.value : "";
  const currentTime = timeInput ? timeInput.value : "";

  let docId = "";
  if (selectedSpec.startsWith("doc_")) docId = selectedSpec.replace("doc_", "");
  else if (selectedSpec.startsWith("ther_")) docId = selectedSpec.replace("ther_", "");
  else docId = selectedSpec;

  // Find booked slots for this specialist on selectedDate
  const bookedSet = new Set();
  if (selectedDate && docId) {
    allAppointments.forEach(a => {
      if ((a.status || "").toLowerCase() === "cancelled") return;
      const sameDate = String(a.appointment_date) === String(selectedDate);
      const sameSpec = String(a.doctor_id) === String(docId) || (a.therapist_id && String(a.therapist_id) === String(docId));
      if (sameDate && sameSpec && a.appointment_time) {
        const timeKey = String(a.appointment_time).substring(0, 5);
        bookedSet.add(timeKey);
      }
    });
  }

  // Helper to build slot button
  function createSlotButton(slot) {
    const isBooked = bookedSet.has(slot.time);
    const isSelected = currentTime === slot.time;

    if (isBooked) {
      return `<button type="button" class="apt-slot-pill slot-booked" disabled title="Already booked for this specialist">${slot.label}</button>`;
    }

    return `<button type="button" class="apt-slot-pill ${isSelected ? 'slot-selected' : ''}" data-time="${slot.time}" data-label="${slot.label}">${slot.label}</button>`;
  }

  morningContainer.innerHTML = TIME_SLOTS_MORNING.map(createSlotButton).join("");
  afternoonContainer.innerHTML = TIME_SLOTS_AFTERNOON.map(createSlotButton).join("");

  // Attach slot click listener
  const allSlotPills = document.querySelectorAll(".apt-slots-grid .apt-slot-pill:not(.slot-booked)");
  allSlotPills.forEach(pill => {
    pill.addEventListener("click", () => {
      const timeVal = pill.getAttribute("data-time");
      const labelVal = pill.getAttribute("data-label");

      if (timeInput) timeInput.value = timeVal;

      allSlotPills.forEach(p => p.classList.remove("slot-selected"));
      pill.classList.add("slot-selected");

      if (badge) {
        badge.style.display = "inline-block";
        badge.textContent = `Selected: ${labelVal}`;
      }

      const formAlert = document.getElementById("formAlert");
      if (formAlert && formAlert.textContent.includes("time slot")) {
        formAlert.hidden = true;
      }
    });
  });

  if (notice) {
    if (selectedSpec && selectedDate) {
      const bookedCount = bookedSet.size;
      const totalSlots = TIME_SLOTS_MORNING.length + TIME_SLOTS_AFTERNOON.length;
      const availableCount = totalSlots - bookedCount;
      notice.innerHTML = `<span class="text-success fw-bold">✓ ${availableCount} slots available</span> on ${formatDateString(selectedDate)} for this specialist.`;
    } else {
      notice.textContent = "Select a specialist & date to view real-time available time slots.";
    }
  }

  // Update badge if time already chosen
  if (badge) {
    if (currentTime) {
      badge.style.display = "inline-block";
      badge.textContent = `Selected: ${formatTimeString(currentTime)}`;
    } else {
      badge.style.display = "none";
    }
  }
}

/**
 * Fetch Patients, Doctors, and Therapists from the API and Local Storage
 */
async function loadDropdownsData(user) {
  try {
    const [pRes, dRes, tRes] = await Promise.all([
      apiRequest(`/api/patients?user_id=${encodeURIComponent(user.user_id || '')}&role=${encodeURIComponent(user.role || '')}`).catch(() => ({ patients: [] })),
      apiRequest(`/api/doctors?user_id=${encodeURIComponent(user.user_id || '')}&role=${encodeURIComponent(user.role || '')}`).catch(() => ({ doctors: [] })),
      apiRequest(`/api/therapists?user_id=${encodeURIComponent(user.user_id || '')}&role=${encodeURIComponent(user.role || '')}`).catch(() => ({ therapists: [] }))
    ]);

    const apiDoctors = (dRes && Array.isArray(dRes.doctors)) ? dRes.doctors : [];
    const apiTherapists = (tRes && Array.isArray(tRes.therapists)) ? tRes.therapists : [];
    patientsList = (pRes && Array.isArray(pRes.patients)) ? pRes.patients : [];

    // Merge doctors with default verified roster so list is always complete
    const docMap = new Map();
    DEFAULT_DOCTORS.forEach(d => docMap.set(String(d.doctor_id), d));
    apiDoctors.forEach(d => docMap.set(String(d.doctor_id), {
      ...d,
      consultation_fee: d.consultation_fee || "₹10,900"
    }));
    doctorsList = Array.from(docMap.values());

    // Merge therapists with default verified roster
    const therMap = new Map();
    DEFAULT_THERAPISTS.forEach(t => therMap.set(String(t.therapist_id), t));
    apiTherapists.forEach(t => therMap.set(String(t.therapist_id), {
      ...t,
      session_fee: t.session_fee || "₹4,500"
    }));
    therapistsList = Array.from(therMap.values());

    // Populate Patient Dropdown (Used by staff/admin)
    const pSelect = document.getElementById("apptPatient");
    if (pSelect) {
      if (patientsList.length === 0) {
        // Fallback demo patients for staff view
        patientsList = [
          { patient_id: 1, name: "Aarav Sharma", gender: "Male", age: 8, condition: "Spastic Diplegia" },
          { patient_id: 2, name: "Diya Patel", gender: "Female", age: 6, condition: "Ataxic CP" },
          { patient_id: 3, name: "Vihaan Joshi", gender: "Male", age: 10, condition: "Hemiplegia" }
        ];
      }

      pSelect.innerHTML = `<option value="" disabled selected>Select Clinic Patient</option>` +
        patientsList.map(p => {
          const meta = [p.gender || 'Patient', p.age ? `${p.age} yrs` : null].filter(Boolean).join(', ');
          return `<option value="${p.patient_id}">${escapeHtml(p.name)} (${escapeHtml(meta)})</option>`;
        }).join("");
    }

    // Populate Specialist Dropdown
    populateSpecialistDropdown();

  } catch (err) {
    console.error("Failed to load dropdown data:", err);
    doctorsList = [...DEFAULT_DOCTORS];
    therapistsList = [...DEFAULT_THERAPISTS];
    populateSpecialistDropdown();
  }
}

/**
 * Populate Specialist (Doctor / Therapist) dropdown with optgroups
 */
function populateSpecialistDropdown() {
  const sSelect = document.getElementById("apptSpecialist");
  if (!sSelect) return;

  let html = `<option value="" disabled selected>Select Specialist (Doctor or Therapist)</option>`;

  if (doctorsList.length > 0) {
    html += `<optgroup label="🩺 Doctors / Clinical Physicians">`;
    doctorsList.forEach(d => {
      const name = d.name.startsWith("Dr.") ? d.name : `Dr. ${d.name}`;
      const spec = d.specialization ? ` - ${d.specialization}` : '';
      const fee = d.consultation_fee || "₹10,900";
      html += `<option value="doc_${d.doctor_id}">${escapeHtml(name)}${escapeHtml(spec)} (Fee: ${escapeHtml(fee)})</option>`;
    });
    html += `</optgroup>`;
  }

  if (therapistsList.length > 0) {
    html += `<optgroup label="💪 Certified Physiotherapists & Specialists">`;
    therapistsList.forEach(t => {
      const spec = t.specialization ? ` - ${t.specialization}` : ' - Physical Therapy';
      const fee = t.session_fee || "₹4,500";
      html += `<option value="ther_${t.therapist_id}">${escapeHtml(t.name)}${escapeHtml(spec)} (Session: ${escapeHtml(fee)})</option>`;
    });
    html += `</optgroup>`;
  }

  sSelect.innerHTML = html;
}

/**
 * Find specialist object from composite ID (doc_X or ther_X)
 */
function findSpecialistById(specId) {
  if (!specId) return null;

  if (specId.startsWith("doc_")) {
    const rawId = specId.replace("doc_", "");
    const doc = doctorsList.find(d => String(d.doctor_id) === String(rawId));
    if (doc) {
      return {
        id: specId,
        rawId: doc.doctor_id,
        name: doc.name.startsWith("Dr.") ? doc.name : `Dr. ${doc.name}`,
        specialization: doc.specialization || "Clinical Physician",
        type: "Doctor",
        location: doc.city || "Main Clinic (Building A)",
        fee: doc.consultation_fee || "₹10,900"
      };
    }
  } else if (specId.startsWith("ther_")) {
    const rawId = specId.replace("ther_", "");
    const ther = therapistsList.find(t => String(t.therapist_id) === String(rawId));
    if (ther) {
      return {
        id: specId,
        rawId: ther.therapist_id,
        name: ther.name,
        specialization: ther.specialization || "Physiotherapy & Rehab",
        type: "Therapist",
        location: ther.location || "Pediatric Therapy Wing",
        fee: ther.session_fee || "₹4,500"
      };
    }
  }

  return null;
}

/**
 * Setup "Find a Specialist" Card with Tabs, Search, and 1-Click Select
 */
function setupFindSpecialistSearch() {
  const tabs = document.querySelectorAll(".apt-spec-tab, .apt-tab-btn");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      
      const tabId = tab.id || "";
      if (tabId.includes("Doctor") || tabId.includes("Doc")) {
        currentSpecTab = "doctor";
      } else if (tabId.includes("Therapist") || tabId.includes("Ther")) {
        currentSpecTab = "therapist";
      } else {
        currentSpecTab = "all";
      }
      renderSpecialistsList();
    });
  });

  // Search doctor by name or specialization input
  const filterKeyword = document.getElementById("filterKeyword") || document.getElementById("searchDocInput");
  if (filterKeyword) {
    filterKeyword.addEventListener("input", renderSpecialistsList);
    filterKeyword.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        renderSpecialistsList();
      }
    });
  }

  // Search therapist by therapy type dropdown
  const filterTherapyType = document.getElementById("filterTherapyType") || document.getElementById("filterSpec") || document.getElementById("specDomainSelect");
  if (filterTherapyType) filterTherapyType.addEventListener("change", renderSpecialistsList);

  const filterLoc = document.getElementById("filterLoc") || document.getElementById("specLocationSelect");
  if (filterLoc) filterLoc.addEventListener("change", renderSpecialistsList);

  const btnSearch = document.getElementById("btnSearchSpecialists") || document.getElementById("btnSearchSpec");
  if (btnSearch) {
    btnSearch.addEventListener("click", (e) => {
      e.preventDefault();
      renderSpecialistsList();
    });
  }

  const specSearchForm = document.getElementById("specSearchForm");
  if (specSearchForm) {
    specSearchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      renderSpecialistsList();
    });
  }
}

/**
 * Render the filtered doctor & therapist profile cards in SaaS card grid
 */
function renderSpecialistsList() {
  const listEl = document.getElementById("specialistsResultsList") || document.getElementById("doctorCardsGrid") || document.getElementById("specResultsList");
  if (!listEl) return;

  const keyword = (document.getElementById("filterKeyword")?.value || document.getElementById("searchDocInput")?.value || "").trim().toLowerCase();
  const therapyFilter = (document.getElementById("filterTherapyType")?.value || document.getElementById("filterSpec")?.value || "all").toLowerCase();
  const locationFilter = (document.getElementById("filterLoc")?.value || "all").toLowerCase();

  let specialists = [];

  if (currentSpecTab === "all" || currentSpecTab === "doctor" || currentSpecTab === "doctors") {
    doctorsList.forEach(d => {
      specialists.push({
        id: `doc_${d.doctor_id}`,
        doctor_id: d.doctor_id,
        name: d.name.startsWith("Dr.") ? d.name : `Dr. ${d.name}`,
        specialization: d.specialization || "Pediatric Neurology",
        type: "Doctor",
        location: d.city || "Jaipur Main Rehab Center",
        defaultType: "Consultation",
        fee: d.consultation_fee || "₹10,900",
        experience: d.experience || "14+ Years Exp",
        availability: d.availability || "Available Today • Mon - Sat (09:00 AM - 05:00 PM)",
        rating: d.rating || "4.9 ★ (140+ Reviews)",
        therapy_type: d.therapy_type || d.specialization || "Pediatric Neurology",
        profile_photo: d.profile_photo || "./images/doctor-avatar.jpg"
      });
    });
  }

  if (currentSpecTab === "all" || currentSpecTab === "therapist" || currentSpecTab === "therapists") {
    therapistsList.forEach(t => {
      specialists.push({
        id: `ther_${t.therapist_id}`,
        therapist_id: t.therapist_id,
        name: t.name,
        specialization: t.specialization || "Physiotherapy & Mobility",
        type: "Therapist",
        location: t.location || "Pediatric Therapy Wing",
        defaultType: "Therapy",
        fee: t.session_fee || "₹4,500",
        experience: t.experience || "9+ Years Exp",
        availability: t.availability || "Available Today • Daily (09:00 AM - 06:00 PM)",
        rating: t.rating || "4.9 ★ (120+ Reviews)",
        therapy_type: t.therapy_type || t.specialization || "Physical Therapy & Mobility",
        profile_photo: t.profile_photo || "./images/doctor-avatar.jpg"
      });
    });
  }

  // 1. Search doctor by name or specialization
  if (keyword) {
    specialists = specialists.filter(s =>
      s.name.toLowerCase().includes(keyword) ||
      s.specialization.toLowerCase().includes(keyword) ||
      (s.experience && s.experience.toLowerCase().includes(keyword)) ||
      (s.therapy_type && s.therapy_type.toLowerCase().includes(keyword))
    );
  }

  // 2. Search therapist by therapy type
  if (therapyFilter !== "all") {
    specialists = specialists.filter(s => {
      const spec = s.specialization.toLowerCase();
      const tt = (s.therapy_type || "").toLowerCase();
      if (therapyFilter === "pediatric") return spec.includes("pediatric") || tt.includes("pediatric") || spec.includes("neuro");
      if (therapyFilter === "physio") return spec.includes("physio") || tt.includes("physio") || spec.includes("mobility");
      if (therapyFilter === "occupational") return spec.includes("occup") || tt.includes("occup") || spec.includes("sensory");
      if (therapyFilter === "speech") return spec.includes("speech") || tt.includes("speech") || spec.includes("language");
      if (therapyFilter === "gait") return spec.includes("gait") || tt.includes("gait") || spec.includes("postur");
      if (therapyFilter === "ortho") return spec.includes("ortho") || tt.includes("ortho");
      if (therapyFilter === "cp") return spec.includes("cerebral") || spec.includes("child") || spec.includes("cp");
      return spec.includes(therapyFilter) || tt.includes(therapyFilter);
    });
  }

  // 3. Filter location
  if (locationFilter !== "all") {
    specialists = specialists.filter(s => {
      const sLoc = (s.location || "").toLowerCase();
      if (locationFilter.includes("jaipur") && sLoc.includes("jaipur")) return true;
      if (locationFilter.includes("tele") && (sLoc.includes("tele") || sLoc.includes("online"))) return true;
      if (locationFilter.includes("main") && sLoc.includes("main")) return true;
      return sLoc.includes(locationFilter);
    });
  }

  // Update count pills if present
  const countAllEl = document.getElementById("countSpecAll");
  const countDocEl = document.getElementById("countSpecDoc");
  const countTherEl = document.getElementById("countSpecTher");
  if (countAllEl) countAllEl.textContent = doctorsList.length + therapistsList.length;
  if (countDocEl) countDocEl.textContent = doctorsList.length;
  if (countTherEl) countTherEl.textContent = therapistsList.length;

  if (specialists.length === 0) {
    listEl.innerHTML = `
      <div class="p-4 text-center text-muted border rounded-3 bg-white" style="border: 1.5px dashed #cbd5e1 !important; width: 100%;">
        <div style="font-size: 32px; margin-bottom: 6px;">🔍</div>
        <h5 class="fw-bold text-dark mb-1">No matching doctors or therapists found</h5>
        <p class="small text-muted mb-0">Try adjusting your keyword or selecting "All Therapy Types".</p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = `<div class="apt-doctor-grid">` + specialists.map(s => `
    <div class="apt-doctor-card" id="card_${escapeHtml(s.id)}">
      <div class="apt-doc-card-header">
        <div class="apt-doc-avatar-wrap">
          <img src="${s.profile_photo || './images/doctor-avatar.jpg'}" alt="${escapeHtml(s.name)}" class="apt-doc-avatar-img" onerror="this.outerHTML='<span style=\\'font-size:26px;\\'>${s.type === 'Doctor' ? '👨‍⚕️' : '🏃'}</span>';">
          <span class="apt-doc-status-dot" title="Active on Clinical Roster"></span>
        </div>
        <div class="apt-doc-info">
          <h4 class="apt-doc-name">${escapeHtml(s.name)}</h4>
          <div class="apt-doc-spec">${escapeHtml(s.specialization)}</div>
          <div class="apt-doc-meta-row">
            <span class="apt-doc-experience-badge">★ ${escapeHtml(s.experience || '12+ Years Exp')}</span>
            <span class="badge" style="background:#eff6ff; color:#0875F9; border:1px solid #bfdbfe; font-weight:700;">${escapeHtml(s.type)}</span>
          </div>
        </div>
      </div>

      <div class="mb-2">
        <div class="apt-doc-avail-pill">
          <span>●</span>
          <span>${escapeHtml(s.availability || 'Available Today • Mon - Sat (09:00 AM - 05:00 PM)')}</span>
        </div>
      </div>

      <div class="apt-doc-card-footer">
        <div class="apt-doc-fee">
          ${escapeHtml(s.fee)}
          <small>${s.type === 'Doctor' ? 'Consultation Fee' : 'Per Session Fee'}</small>
        </div>
        <button type="button" class="btn-book-doctor" onclick="selectSpecialistForBooking('${escapeHtml(s.id)}', '${escapeHtml(s.defaultType)}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span>Book Appointment</span>
        </button>
      </div>
    </div>
  `).join("") + `</div>`;
}

/**
 * 1-Click "Book Appointment" populates the booking form and highlights it
 */
window.selectSpecialistForBooking = function(specialistId, defaultType) {
  const sSelect = document.getElementById("apptSpecialist");
  const typeSelect = document.getElementById("apptType");
  const specField = document.getElementById("apptSpecialization");
  const formCard = document.getElementById("bookAppointmentCard");

  if (sSelect) {
    sSelect.value = specialistId;
  }

  const specialist = findSpecialistById(specialistId);
  if (specialist) {
    if (specField) specField.value = specialist.specialization;
    if (typeSelect && defaultType) typeSelect.value = defaultType;
    updateSpecialistPreviewBanner(specialist);
  }

  // Highlight selected card visually
  document.querySelectorAll(".apt-doctor-card").forEach(c => c.classList.remove("selected-for-booking"));
  const card = document.getElementById(`card_${specialistId}`);
  if (card) card.classList.add("selected-for-booking");

  renderTimeSlots();

  if (formCard) {
    formCard.scrollIntoView({ behavior: "smooth", block: "center" });
    formCard.style.boxShadow = "0 0 0 4px rgba(8, 117, 249, 0.4)";
    setTimeout(() => { formCard.style.boxShadow = ""; }, 1800);
  }

  showToast(`${specialist ? specialist.name : 'Specialist'} selected! Complete your consultation details below.`, "success");
};

/**
 * Load Appointments Table & Compute Status Metrics
 */
async function loadAppointmentsTable(user) {
  const loading = document.getElementById("tableLoading");
  const tableWrapper = document.getElementById("tableWrapper");
  const emptyState = document.getElementById("tableEmptyState");

  if (loading) loading.style.display = "block";
  if (tableWrapper) tableWrapper.style.display = "none";
  if (emptyState) emptyState.style.display = "none";

  try {
    const u = resolveCurrentUser() || user || {};
    let backendAppointments = [];

    try {
      const res = await apiRequest(`/api/appointments?user_id=${encodeURIComponent(u.user_id || '')}&role=${encodeURIComponent(u.role || '')}`);
      if (res && Array.isArray(res.appointments)) {
        backendAppointments = res.appointments;
      }
    } catch (e) {
      console.warn("[Appointments] Backend table fetch notice:", e.message);
    }

    // Merge with local appointments
    const localAppts = getLocalAppointments();
    const seenIds = new Set();
    const combined = [];

    // Local appointments take precedence
    localAppts.forEach(a => {
      seenIds.add(String(a.appointment_id));
      combined.push(a);
    });

    backendAppointments.forEach(a => {
      if (!seenIds.has(String(a.appointment_id))) {
        seenIds.add(String(a.appointment_id));
        combined.push(a);
      }
    });

    // Provide default clinical appointments for doctor and patient rosters if no records exist
    if (combined.length === 0) {
      const todayIso = new Date().toISOString().split("T")[0];
      const tomorrowIso = new Date(Date.now() + 86400000).toISOString().split("T")[0];
      const yesterdayIso = new Date(Date.now() - 86400000).toISOString().split("T")[0];

      const seedAppts = [
        {
          appointment_id: 1001,
          patient_id: 101,
          patient_name: "Aarav Sharma",
          patient_phone: "+91 98765 43210",
          doctor_id: 90001,
          doctor_name: "Dr. Lakhshansh Joshi",
          doctor_specialization: "Pediatric Neurologist & Rehabilitation Lead",
          appointment_date: todayIso,
          appointment_time: "10:30",
          appointment_type: "Physical Therapy",
          status: "Confirmed",
          notes: "Spastic Diplegia milestone and reflex review",
          reason: "Spastic Diplegia milestone and reflex review",
          consultation_fee: 12000
        },
        {
          appointment_id: 1002,
          patient_id: 102,
          patient_name: "Priya Patel",
          patient_phone: "+91 98234 56789",
          doctor_id: 90002,
          doctor_name: "Dr. Sunita Mehra, PT",
          doctor_specialization: "Senior Pediatric Physiotherapist",
          appointment_date: todayIso,
          appointment_time: "14:00",
          appointment_type: "Pediatric Consultation",
          status: "Paid – Pending Doctor Approval",
          notes: "Lower extremity motor strength and gait therapy",
          reason: "Lower extremity motor strength and gait therapy",
          consultation_fee: 4500
        },
        {
          appointment_id: 1003,
          patient_id: 103,
          patient_name: "Vihaan Joshi",
          patient_phone: "+91 94123 45678",
          doctor_id: 90001,
          doctor_name: "Dr. Lakhshansh Joshi",
          doctor_specialization: "Pediatric Neurologist",
          appointment_date: todayIso,
          appointment_time: "16:30",
          appointment_type: "Medical Consultation",
          status: "Completed",
          notes: "Postural balance and developmental progression examination",
          reason: "Postural balance and developmental progression examination",
          consultation_fee: 12000
        },
        {
          appointment_id: 1004,
          patient_id: 104,
          patient_name: "Ananya Verma",
          patient_phone: "+91 94140 12345",
          doctor_id: 90003,
          doctor_name: "Dr. Vikram Joshi, OT",
          doctor_specialization: "Sensory Integration Therapist",
          appointment_date: tomorrowIso,
          appointment_time: "11:00",
          appointment_type: "Occupational Therapy",
          status: "Confirmed",
          notes: "Sensory integration and fine-motor coordination session",
          reason: "Sensory integration and fine-motor coordination session",
          consultation_fee: 4000
        },
        {
          appointment_id: 1005,
          patient_id: 105,
          patient_name: "Kabir Singh",
          patient_phone: "+91 98333 77112",
          doctor_id: 90004,
          doctor_name: "Dr. Sarah Johnson",
          doctor_specialization: "Clinical Neurologist & CP Care",
          appointment_date: yesterdayIso,
          appointment_time: "09:30",
          appointment_type: "Speech Therapy",
          status: "Completed",
          notes: "Cerebral Palsy spasticity assessment and speech clarity review",
          reason: "Cerebral Palsy spasticity assessment and speech clarity review",
          consultation_fee: 11000
        }
      ];
      seedAppts.forEach(s => combined.push(s));
    }

    allAppointments = combined.map(a => {
      let normStatus = a.status || "Confirmed";
      const rawStatus = (a.status || "").toLowerCase();

      if (rawStatus === "cancelled") {
        normStatus = "Cancelled";
      } else if (rawStatus === "completed") {
        normStatus = "Completed";
      } else if (rawStatus.includes("refund completed") || rawStatus === "refunded") {
        normStatus = "Refund Completed";
      } else if (rawStatus.includes("reject") || rawStatus.includes("refund pending") || rawStatus.includes("refund processing")) {
        normStatus = "Rejected – Refund Pending";
      } else if (rawStatus.includes("paid – pending") || rawStatus.includes("paid - pending") || rawStatus.includes("pending doctor approval") || rawStatus === "paid") {
        normStatus = "Paid – Pending Doctor Approval";
      } else if (rawStatus.includes("payment pending") || rawStatus === "unpaid") {
        normStatus = "Payment Pending";
      } else if (rawStatus.includes("pending") || rawStatus.includes("approval") || rawStatus === "scheduled") {
        normStatus = "Paid – Pending Doctor Approval";
      } else if (rawStatus === "confirmed") {
        normStatus = "Confirmed";
      }

      let apptType = a.appointment_type || "Consultation";
      const docName = (a.doctor_name || "").toLowerCase();
      if (!a.appointment_type) {
        if (docName.includes("therapist") || docName.includes("pt") || (a.notes && a.notes.toLowerCase().includes("therapy"))) {
          apptType = "Therapy";
        }
      }

      return {
        ...a,
        normalizedStatus: normStatus,
        apptType
      };
    });

    // Update Filter Counters
    updateFilterCounts();

    // Render Table Rows
    renderAppointmentsTable();

  } catch (err) {
    console.error("Failed to load appointments:", err);
    if (emptyState) {
      emptyState.style.display = "block";
      const desc = emptyState.querySelector(".apt-empty-desc");
      if (desc) desc.textContent = "Unable to load appointments. Please check connection.";
    }
  } finally {
    if (loading) loading.style.display = "none";
  }
}

/**
 * Setup Real-time Table Filter Buttons and Search Box
 */
function setupTableFilters() {
  const searchInput = document.getElementById("searchApptInput") || document.getElementById("apptsSearchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearch = e.target.value.trim().toLowerCase();
      renderAppointmentsTable();
    });
  }

  const filterButtons = document.querySelectorAll("#statusFiltersGroup .apt-filter-pill");
  filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      filterButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.getAttribute("data-filter") || "all";
      renderAppointmentsTable();
    });
  });

  const btnRefresh = document.getElementById("btnRefreshAppts");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", async () => {
      btnRefresh.disabled = true;
      btnRefresh.innerHTML = "↻ Refreshing...";
      const user = resolveCurrentUser();
      await loadAppointmentsTable(user);
      btnRefresh.disabled = false;
      btnRefresh.innerHTML = "↻ Refresh Roster";
      showToast("Clinical roster refreshed successfully.", "info");
    });
  }

  // Interactive 4 Dashboard Metric Cards on Doctor Appointment Management
  const cardToday = document.getElementById("cardTodayAppts");
  if (cardToday) {
    cardToday.addEventListener("click", () => {
      currentFilter = (currentFilter === "today") ? "all" : "today";
      syncFilterPillState(currentFilter);
      renderAppointmentsTable();
      scrollToTable();
    });
  }

  const cardPending = document.getElementById("cardPendingAppts");
  if (cardPending) {
    cardPending.addEventListener("click", () => {
      currentFilter = (currentFilter === "pending") ? "all" : "pending";
      syncFilterPillState(currentFilter);
      renderAppointmentsTable();
      scrollToTable();
    });
  }

  const cardConfirmed = document.getElementById("cardConfirmedAppts");
  if (cardConfirmed) {
    cardConfirmed.addEventListener("click", () => {
      currentFilter = (currentFilter === "confirmed") ? "all" : "confirmed";
      syncFilterPillState(currentFilter);
      renderAppointmentsTable();
      scrollToTable();
    });
  }

  const cardCompleted = document.getElementById("cardCompletedAppts");
  if (cardCompleted) {
    cardCompleted.addEventListener("click", () => {
      currentFilter = (currentFilter === "completed") ? "all" : "completed";
      syncFilterPillState(currentFilter);
      renderAppointmentsTable();
      scrollToTable();
    });
  }

  // Hero CTA: "View Today's Appointments"
  const btnHeroToday = document.getElementById("btnHeroTodayAppts");
  if (btnHeroToday) {
    btnHeroToday.addEventListener("click", (e) => {
      e.preventDefault();
      currentFilter = "today";
      syncFilterPillState("today");
      renderAppointmentsTable();
      scrollToTable();
    });
  }

  // Hero CTA: "Book New Appointment"
  const btnHeroBook = document.getElementById("btnHeroBook");
  if (btnHeroBook) {
    btnHeroBook.addEventListener("click", (e) => {
      e.preventDefault();
      const formCard = document.getElementById("bookAppointmentCard");
      if (formCard) {
        formCard.scrollIntoView({ behavior: "smooth", block: "center" });
        formCard.style.boxShadow = "0 0 0 4px rgba(8, 117, 249, 0.4)";
        setTimeout(() => { formCard.style.boxShadow = ""; }, 1600);
      }
    });
  }
}

function syncFilterPillState(filterKey) {
  document.querySelectorAll("#statusFiltersGroup .apt-filter-pill").forEach(p => {
    if (p.getAttribute("data-filter") === filterKey) {
      p.classList.add("active");
    } else {
      p.classList.remove("active");
    }
  });

  // Highlight KPI card
  const statCards = {
    today: document.getElementById("cardTodayAppts"),
    pending: document.getElementById("cardPendingAppts"),
    confirmed: document.getElementById("cardConfirmedAppts"),
    completed: document.getElementById("cardCompletedAppts")
  };
  Object.keys(statCards).forEach(k => {
    if (statCards[k]) {
      if (k === filterKey) statCards[k].classList.add("active-stat");
      else statCards[k].classList.remove("active-stat");
    }
  });
}

function scrollToTable() {
  const t = document.getElementById("myAppointmentsCard") || document.getElementById("appointmentsTable");
  if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Calculate count badges for All, Confirmed, Pending, Completed, Cancelled
 */
function updateFilterCounts() {
  const total = allAppointments.length;
  let confirmed = 0;
  let pending = 0;
  let rejected = 0;
  let cancelled = 0;
  let completed = 0;
  let todayCount = 0;

  const todayStr = new Date().toISOString().split("T")[0];

  allAppointments.forEach(a => {
    const rawStatus = (a.normalizedStatus || a.status || "").toLowerCase();
    const rawDate = String(a.appointment_date || "").split(" ")[0];

    if (rawStatus === "completed") {
      completed++;
    } else if (rawStatus === "confirmed") {
      confirmed++;
    } else if (rawStatus.includes("pending") || rawStatus.includes("approval")) {
      pending++;
    } else if (rawStatus.includes("reject") || rawStatus.includes("refund")) {
      rejected++;
    } else if (rawStatus === "cancelled") {
      cancelled++;
    }

    if (rawDate === todayStr && rawStatus !== "cancelled") {
      todayCount++;
    }
  });

  const elAll = document.getElementById("countAll");
  const elConf = document.getElementById("countConfirmed");
  const elPend = document.getElementById("countPending");
  const elRej = document.getElementById("countRejected");
  const elCanc = document.getElementById("countCancelled");

  if (elAll) elAll.textContent = total;
  if (elConf) elConf.textContent = confirmed;
  if (elPend) elPend.textContent = pending;
  if (elRej) elRej.textContent = rejected;
  if (elCanc) elCanc.textContent = cancelled;

  // 4 Dashboard Statistics for Doctor Appointment Management Page
  const statTodayEl = document.getElementById("statTodayAppts");
  const statPendingEl = document.getElementById("statPendingAppts");
  const statConfirmedEl = document.getElementById("statConfirmedAppts");
  const statCompletedEl = document.getElementById("statCompletedAppts");

  if (statTodayEl) statTodayEl.textContent = todayCount;
  if (statPendingEl) statPendingEl.textContent = pending;
  if (statConfirmedEl) statConfirmedEl.textContent = confirmed;
  if (statCompletedEl) statCompletedEl.textContent = completed;
}

function renderAppointmentsTable() {
  const tbody = document.getElementById("apptsTableBody");
  const tableWrapper = document.getElementById("tableWrapper");
  const emptyState = document.getElementById("tableEmptyState");

  if (!tbody) return;

  const filtered = allAppointments.filter(a => {
    // Status Filter
    if (currentFilter !== "all") {
      const target = currentFilter.toLowerCase();
      const actual = (a.normalizedStatus || "").toLowerCase();
      if (target === "today") {
        const todayStr = new Date().toISOString().split("T")[0];
        const rawDate = String(a.appointment_date || "").split(" ")[0];
        if (rawDate !== todayStr) return false;
      } else if (target === "pending") {
        if (!actual.includes("pending") && !actual.includes("approval")) return false;
      } else if (target === "confirmed") {
        if (actual !== "confirmed") return false;
      } else if (target === "completed") {
        if (actual !== "completed" && a.status !== "Completed") return false;
      } else if (target === "rejected") {
        if (!actual.includes("reject") && !actual.includes("refund")) return false;
      } else if (target === "cancelled") {
        if (actual !== "cancelled") return false;
      }
    }

    // Search Query Filter
    if (currentSearch) {
      const pName = (a.patient_name || "").toLowerCase();
      const dName = (a.doctor_name || "").toLowerCase();
      const date = (a.appointment_date || "").toLowerCase();
      const idStr = String(a.appointment_id || "").toLowerCase();
      const statusStr = (a.normalizedStatus || "").toLowerCase();

      const match = pName.includes(currentSearch) ||
                    dName.includes(currentSearch) ||
                    date.includes(currentSearch) ||
                    idStr.includes(currentSearch) ||
                    statusStr.includes(currentSearch);
      if (!match) return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    if (tableWrapper) tableWrapper.style.display = "none";
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  if (emptyState) emptyState.style.display = "none";
  if (tableWrapper) tableWrapper.style.display = "block";

  tbody.innerHTML = filtered.map(a => {
    const formattedDate = formatDateString(a.appointment_date);
    const formattedTime = formatTimeString(a.appointment_time);
    const patientName = a.patient_name || `Patient #${a.patient_id}`;
    const doctorName = a.doctor_name ? (a.doctor_name.startsWith("Dr.") ? a.doctor_name : `Dr. ${a.doctor_name}`) : `Specialist #${a.doctor_id}`;

    const curUser = resolveCurrentUser() || {};
    const curRole = (curUser.role || "").toLowerCase();
    const isDoctorOrStaff = curRole === "doctor" || curRole === "therapist" || curRole === "admin" ||
      window.location.pathname.includes("doctor-appointments") ||
      new URLSearchParams(window.location.search).get("role") === "doctor";

    const statusBadgeClass = (a.normalizedStatus || "confirmed").toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const typeBadgeClass = (a.apptType || "Consultation").toLowerCase().replace(/\s+/g, '-');
    
    const isCancelled = a.normalizedStatus === "Cancelled";
    const isCompleted = a.normalizedStatus === "Completed" || a.status === "Completed";
    const isPaidPending = a.normalizedStatus === "Paid – Pending Doctor Approval" || a.normalizedStatus === "Pending Approval";
    const isPaymentPending = a.normalizedStatus === "Payment Pending";
    const isConfirmed = a.normalizedStatus === "Confirmed";
    const isRejectedRefund = a.normalizedStatus === "Rejected – Refund Pending";
    const isRefundCompleted = a.normalizedStatus === "Refund Completed";

    return `
      <tr class="${isCancelled ? 'opacity-75' : ''}">
        <td>
          <div class="d-flex align-items-center gap-2">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px;">
              ${(patientName.replace(/Dr\.?\s*/i, '').charAt(0) || 'P').toUpperCase()}
            </div>
            <div>
              <div class="fw-bold text-dark">${escapeHtml(patientName)}</div>
              <small class="text-success fw-bold d-block" style="font-size: 11px;">📞 ${escapeHtml(a.patient_phone || '+91 94686 50893')}</small>
            </div>
          </div>
        </td>
        <td>
          <span class="badge bg-light text-primary border fw-bold" style="font-size: 11.5px;">#PT-${escapeHtml(a.patient_id)}</span>
        </td>
        <td>
          <div class="fw-bold text-dark">${escapeHtml(formattedDate)}</div>
          <small class="text-muted" style="font-size: 11px;">#APT-${escapeHtml(a.appointment_id)}</small>
        </td>
        <td>
          <div class="fw-bold text-primary">🕒 ${escapeHtml(formattedTime)}</div>
        </td>
        <td>
          <span class="apt-type-badge ${escapeHtml(typeBadgeClass)}">
            ${escapeHtml(a.apptType || 'Consultation')}
          </span>
          <div class="small text-muted text-truncate mt-1" style="max-width: 140px;" title="${escapeHtml(a.reason || a.notes || '')}">
            ${escapeHtml(a.reason || a.notes || 'Rehabilitation consultation')}
          </div>
        </td>
        <td>
          <span class="apt-status-badge ${escapeHtml(statusBadgeClass)}">
            ● ${escapeHtml(a.normalizedStatus || 'Confirmed')}
          </span>
        </td>
        <td style="text-align: right;">
          <div class="apt-action-btn-group d-flex align-items-center justify-content-end gap-1 flex-wrap">
            <!-- 1. View Details (Always accessible) -->
            <button type="button" class="apt-btn-view-details" onclick="openDoctorPatientModal('${a.patient_id}', ${JSON.stringify(a).replace(/"/g, '&quot;')})" title="View Details">
              👁️ Details
            </button>

            ${isDoctorOrStaff ? `
              <!-- Doctor Portal Actions: Accept, Reject, Reschedule, Complete -->
              ${isPaidPending ? `
                <button type="button" class="apt-btn-accept" onclick="acceptAppointmentAction(${a.appointment_id})" title="Accept and Confirm">
                  ✓ Accept
                </button>
                <button type="button" class="apt-btn-reject" onclick="rejectAppointmentAction(${a.appointment_id})" title="Reject Request">
                  ✕ Reject
                </button>
              ` : ''}

              ${isConfirmed ? `
                <button type="button" class="apt-btn-reschedule" onclick="openRescheduleModal(${a.appointment_id})" title="Reschedule">
                  🗓️ Reschedule
                </button>
                <button type="button" class="apt-btn-complete" onclick="completeAppointmentAction(${a.appointment_id})" title="Mark Appointment as Completed">
                  ✅ Complete
                </button>
              ` : ''}

              ${isCompleted ? `
                <span class="badge bg-success-subtle text-success border border-success fw-bold px-2 py-1" style="font-size: 11px;">✓ Completed</span>
              ` : ''}

              ${isPaymentPending ? `
                <button type="button" class="apt-btn-cancel-appt" onclick="cancelAppointment(${a.appointment_id})" title="Cancel">Cancel</button>
              ` : ''}

            ` : `
              <!-- Patient Portal Actions -->
              ${isPaymentPending ? `
                <a href="./appointment-checkout.html?appointment_id=${a.appointment_id}&fee=${a.consultation_fee || 10900}&doctor_name=${encodeURIComponent(a.doctor_name || '')}&date=${encodeURIComponent(a.appointment_date || '')}&time=${encodeURIComponent(a.appointment_time || '')}&type=${encodeURIComponent(a.appointment_type || 'Consultation')}" class="btn btn-sm btn-success fw-bold py-1 px-2" style="font-size: 11.5px;">
                  💳 Complete Payment
                </a>
                <button type="button" class="apt-btn-cancel-appt" onclick="cancelAppointment(${a.appointment_id})" title="Cancel">Cancel</button>
              ` : ''}

              ${isConfirmed ? `
                <button type="button" class="apt-btn-reschedule" onclick="openRescheduleModal(${a.appointment_id})" title="Reschedule">
                  🗓️ Reschedule
                </button>
                <button type="button" class="apt-btn-cancel-appt" onclick="cancelAppointment(${a.appointment_id})" title="Cancel">Cancel</button>
              ` : ''}

              ${isCompleted ? `
                <span class="badge bg-success-subtle text-success border border-success fw-bold px-2 py-1" style="font-size: 11px;">✓ Completed</span>
              ` : ''}
            `}
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

/**
 * Setup Reschedule Modal and Action
 */
function setupRescheduleModal(user) {
  const form = document.getElementById("rescheduleForm");
  const modalDate = document.getElementById("rescheduleDate");
  const modalTime = document.getElementById("rescheduleTime");
  const modalAlert = document.getElementById("rescheduleAlert");
  const submitBtn = document.getElementById("btnConfirmReschedule");

  if (modalDate) {
    const today = new Date().toISOString().split("T")[0];
    modalDate.min = today;
  }

  // Quick Chips in modal
  const chips = document.querySelectorAll("[data-modal-time]");
  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      if (modalTime) {
        modalTime.value = chip.getAttribute("data-modal-time");
        chips.forEach(c => c.style.borderColor = "#e2e8f0");
        chip.style.borderColor = "#0875F9";
      }
    });
  });

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const apptId = document.getElementById("rescheduleApptId").value;
      const newDate = modalDate.value;
      const newTime = modalTime.value;

      if (!apptId || !newDate || !newTime) {
        if (modalAlert) {
          modalAlert.hidden = false;
          modalAlert.textContent = "Please select both a new date and time.";
        }
        return;
      }

      // Check slot collision
      const appt = allAppointments.find(a => String(a.appointment_id) === String(apptId));
      if (appt) {
        const isUnavailable = allAppointments.some(a => {
          if (String(a.appointment_id) === String(apptId)) return false;
          if ((a.status || "").toLowerCase() === "cancelled") return false;
          const isSameDate = String(a.appointment_date) === String(newDate);
          const isSameTime = String(a.appointment_time).startsWith(newTime);
          const isSameSpec = String(a.doctor_id) === String(appt.doctor_id);
          return isSameDate && isSameTime && isSameSpec;
        });

        if (isUnavailable) {
          if (modalAlert) {
            modalAlert.hidden = false;
            modalAlert.textContent = `⚠️ This specialist is already booked on ${newDate} at ${newTime}. Please pick another slot.`;
          }
          return;
        }
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Rescheduling...";

      try {
        // Update local appointment
        const localList = getLocalAppointments();
        const localMatch = localList.find(a => String(a.appointment_id) === String(apptId));
        if (localMatch) {
          localMatch.appointment_date = newDate;
          localMatch.appointment_time = newTime;
          localMatch.status = "Confirmed";
          localStorage.setItem("patient_appointments", JSON.stringify(localList));
        }

        // Try API
        try {
          await apiRequest(`/api/appointments/${apptId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              appointment_date: newDate,
              appointment_time: newTime,
              status: "Confirmed"
            })
          });
        } catch (_) {}

        // Close modal
        const modalEl = document.getElementById("rescheduleModal");
        if (modalEl && window.bootstrap && window.bootstrap.Modal) {
          const inst = window.bootstrap.Modal.getInstance(modalEl) || new window.bootstrap.Modal(modalEl);
          inst.hide();
        }

        showToast("Appointment rescheduled successfully!", "success");
        await loadAppointmentsTable(user);
        renderTimeSlots();

      } catch (err) {
        if (modalAlert) {
          modalAlert.hidden = false;
          modalAlert.textContent = err.message || "Failed to reschedule appointment.";
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Confirm Reschedule";
      }
    });
  }
}

/**
 * Open Reschedule Modal with appointment details
 */
window.openRescheduleModal = function(apptId) {
  const appt = allAppointments.find(a => String(a.appointment_id) === String(apptId));
  if (!appt) return;

  const idInput = document.getElementById("rescheduleApptId");
  const metaAppt = document.getElementById("rescheduleApptMeta");
  const metaSpec = document.getElementById("rescheduleSpecMeta");
  const modalDate = document.getElementById("rescheduleDate");
  const modalTime = document.getElementById("rescheduleTime");
  const modalAlert = document.getElementById("rescheduleAlert");

  if (idInput) idInput.value = appt.appointment_id;
  if (metaAppt) metaAppt.textContent = `#APT-${appt.appointment_id} (${appt.patient_name || 'Patient'})`;
  if (metaSpec) metaSpec.textContent = appt.doctor_name || `Specialist #${appt.doctor_id}`;
  if (modalDate) modalDate.value = appt.appointment_date || "";
  if (modalTime) modalTime.value = (appt.appointment_time || "").substring(0, 5);
  if (modalAlert) modalAlert.hidden = true;

  const modalEl = document.getElementById("rescheduleModal");
  if (modalEl && window.bootstrap && window.bootstrap.Modal) {
    const modalInstance = new window.bootstrap.Modal(modalEl);
    modalInstance.show();
  }
};

/**
 * Cancel Appointment Action
 */
window.cancelAppointment = async function(apptId) {
  if (!confirm(`Are you sure you want to cancel appointment #APT-${apptId}?`)) {
    return;
  }

  try {
    const user = resolveCurrentUser() || {};

    // 1. Update in local storage
    const localList = getLocalAppointments();
    const match = localList.find(a => String(a.appointment_id) === String(apptId));
    if (match) {
      match.status = "Cancelled";
      localStorage.setItem("patient_appointments", JSON.stringify(localList));
    }

    // 2. Update memory state
    const appt = allAppointments.find(a => String(a.appointment_id) === String(apptId));
    if (appt) {
      appt.status = "Cancelled";
      appt.normalizedStatus = "Cancelled";
    }

    // 3. Try API DELETE
    try {
      await apiRequest(`/api/appointments/${apptId}`, { method: "DELETE" });
    } catch (_) {}

    showToast(`Appointment #APT-${apptId} has been cancelled.`, "info");
    updateFilterCounts();
    renderAppointmentsTable();
    renderTimeSlots();

  } catch (err) {
    showToast(err.message || "Failed to cancel appointment.", "danger");
  }
};

/**
 * Floating Toast Notification Helper
 */
function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) {
    alert(message);
    return;
  }

  const toast = document.createElement("div");
  toast.className = `apt-toast ${type}`;
  toast.innerHTML = `
    <span>${type === "success" ? "✅" : (type === "danger" ? "⚠️" : "ℹ️")}</span>
    <div style="flex: 1;">${escapeHtml(message)}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(40px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/**
 * Format Date Utility (e.g. "Sat, Nov 07, 2026")
 */
function formatDateString(dateStr) {
  if (!dateStr) return "-";
  try {
    const parts = String(dateStr).split("-");
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric"
        });
      }
    }
    return String(dateStr);
  } catch (e) {
    return String(dateStr);
  }
}

/**
 * Format Time Utility (e.g. "10:30 AM")
 */
function formatTimeString(timeStr) {
  if (!timeStr) return "-";
  try {
    const parts = String(timeStr).split(":");
    if (parts.length >= 2) {
      let hours = parseInt(parts[0], 10);
      const minutes = parts[1];
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${hours}:${minutes} ${ampm}`;
    }
    return String(timeStr);
  } catch (e) {
    return String(timeStr);
  }
}

/**
 * Escape HTML Utility
 */
function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Global listener for appointment status changes
window.addEventListener("appointmentStatusChanged", () => {
  const user = resolveCurrentUser();
  loadAppointmentsTable(user);
});

/**
 * Doctor Action: Accept Appointment
 */
window.acceptAppointmentAction = async function(apptId) {
  if (window.NotificationManager && typeof window.NotificationManager.acceptAppointment === "function") {
    return window.NotificationManager.acceptAppointment(apptId);
  }

  const user = resolveCurrentUser() || {};
  const doctorPhone = user.phone || user.mobile || "+91 98765 43210";

  try {
    const res = await apiRequest("/api/appointments?action=accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointment_id: apptId,
        doctor_id: user.doctor_id || user.user_id,
        doctor_phone: doctorPhone
      })
    });

    showToast(`Appointment #APT-${apptId} accepted and confirmed!`, "success");
    await loadAppointmentsTable(user);
  } catch (e) {
    showToast(e.message || "Failed to accept appointment.", "danger");
  }
};

/**
 * Doctor Action: Reject Appointment & Initiate Refund
 */
window.rejectAppointmentAction = async function(apptId, reason = "") {
  if (window.NotificationManager && typeof window.NotificationManager.rejectAppointment === "function") {
    return window.NotificationManager.rejectAppointment(apptId, reason);
  }

  const rejReason = reason || prompt("Please provide a reason for rejecting this appointment (initiates 100% patient refund):", "Doctor unavailable") || "Doctor unavailable";
  const user = resolveCurrentUser() || {};

  try {
    const res = await apiRequest("/api/appointments?action=reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointment_id: apptId,
        doctor_id: user.doctor_id || user.user_id,
        rejection_reason: rejReason
      })
    });

    showToast(`Appointment #APT-${apptId} rejected. Patient refund initiated.`, "warning");
    await loadAppointmentsTable(user);
  } catch (e) {
    showToast(e.message || "Failed to reject appointment.", "danger");
  }
};

/**
 * Doctor Action: Complete Appointment
 */
window.completeAppointmentAction = async function(apptId) {
  const confirmed = confirm(`Mark Appointment #APT-${apptId} as Completed?`);
  if (!confirmed) return;

  const appt = allAppointments.find(a => String(a.appointment_id) === String(apptId));
  if (appt) {
    appt.status = "Completed";
    appt.normalizedStatus = "Completed";
  }

  const localAppts = getLocalAppointments();
  const locIdx = localAppts.findIndex(a => String(a.appointment_id) === String(apptId));
  if (locIdx >= 0) {
    localAppts[locIdx].status = "Completed";
    saveLocalAppointments(localAppts);
  } else if (appt) {
    localAppts.unshift({ ...appt, status: "Completed" });
    saveLocalAppointments(localAppts);
  }

  try {
    await apiRequest("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", appointment_id: apptId, status: "Completed" })
    });
  } catch (e) {
    console.warn("Complete API notice:", e.message);
  }

  updateFilterCounts();
  renderAppointmentsTable();
  showToast(`Appointment #APT-${apptId} successfully marked as Completed!`, "success");
};

/**
 * View Patient Details Modal Dialog
 */
window.openDoctorPatientModal = function(patientId, appt) {
  const modal = document.getElementById("doctorPatientModal");
  const body = document.getElementById("doctorPatientModalBody");
  if (!modal || !body) {
    alert(`Patient: ${appt.patient_name || 'Patient'} (#PT-${patientId})\nDate: ${formatDateString(appt.appointment_date)} at ${formatTimeString(appt.appointment_time)}\nStatus: ${appt.status || appt.normalizedStatus}\nReason: ${appt.reason || appt.notes || 'Consultation'}`);
    return;
  }

  const patientName = appt.patient_name || `Patient #${patientId}`;
  const aptDate = formatDateString(appt.appointment_date);
  const aptTime = formatTimeString(appt.appointment_time);
  const aptType = appt.apptType || appt.appointment_type || "Clinical Consultation";
  const reason = appt.reason || appt.notes || "Comprehensive clinical consultation and rehabilitation review.";
  const status = appt.normalizedStatus || appt.status || "Confirmed";
  const phone = appt.patient_phone || "+91 94686 50893";
  const fee = appt.consultation_fee ? `₹${parseFloat(appt.consultation_fee).toLocaleString('en-IN')}` : "₹10,900";

  body.innerHTML = `
    <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1.5px solid #e2e8f0;">
      <div style="width: 52px; height: 52px; border-radius: 14px; background: linear-gradient(135deg, #0875F9 0%, #0056b3 100%); color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 800;">
        ${(patientName.replace(/Dr\\.?\\s*/i, '').charAt(0) || 'P').toUpperCase()}
      </div>
      <div>
        <h4 style="margin: 0; font-size: 17px; font-weight: 800; color: #103463;">${escapeHtml(patientName)}</h4>
        <div style="font-size: 12px; color: #64748b; font-weight: 600;">Patient ID: #PT-${escapeHtml(patientId)} &bull; Verified Portal Record</div>
        <div style="font-size: 13px; color: #059669; font-weight: 700; margin-top: 2px;">📞 Contact Phone: ${escapeHtml(phone)}</div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; font-size: 12.5px;">
      <div style="background: #f8fafc; padding: 10px 14px; border-radius: 10px; border: 1px solid #e2e8f0;">
        <span style="color: #64748b; font-size: 11px; display: block; font-weight: 700; text-transform: uppercase;">Appointment Date</span>
        <strong style="color: #103463; font-size: 13px;">${escapeHtml(aptDate)}</strong>
      </div>
      <div style="background: #f8fafc; padding: 10px 14px; border-radius: 10px; border: 1px solid #e2e8f0;">
        <span style="color: #64748b; font-size: 11px; display: block; font-weight: 700; text-transform: uppercase;">Scheduled Time</span>
        <strong style="color: #0875F9; font-size: 13px;">🕒 ${escapeHtml(aptTime)}</strong>
      </div>
      <div style="background: #f8fafc; padding: 10px 14px; border-radius: 10px; border: 1px solid #e2e8f0;">
        <span style="color: #64748b; font-size: 11px; display: block; font-weight: 700; text-transform: uppercase;">Therapy / Session Type</span>
        <strong style="color: #0284c7; font-size: 13px;">${escapeHtml(aptType)}</strong>
      </div>
      <div style="background: #f8fafc; padding: 10px 14px; border-radius: 10px; border: 1px solid #e2e8f0;">
        <span style="color: #64748b; font-size: 11px; display: block; font-weight: 700; text-transform: uppercase;">Current Status</span>
        <span class="badge ${status === 'Completed' ? 'bg-success' : (status.includes('Pending') ? 'bg-warning text-dark' : 'bg-primary')}" style="font-size: 12px; font-weight: 700;">● ${escapeHtml(status)}</span>
      </div>
    </div>

    <div style="background: #f0f7ff; padding: 14px; border-radius: 12px; border: 1px solid #bfdbfe; margin-bottom: 16px;">
      <div style="font-weight: 700; font-size: 12px; color: #0369a1; text-transform: uppercase; margin-bottom: 4px;">Symptoms / Consultation Notes</div>
      <div style="font-size: 13px; color: #1e293b; line-height: 1.5;">${escapeHtml(reason)}</div>
    </div>

    <div style="display: flex; justify-content: flex-end; gap: 8px;">
      <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('doctorPatientModal').style.display='none'">Close</button>
      ${status !== 'Completed' ? `
        <button type="button" class="btn btn-success btn-sm fw-bold" onclick="document.getElementById('doctorPatientModal').style.display='none'; completeAppointmentAction(${appt.appointment_id});">
          ✓ Mark Completed
        </button>
      ` : ''}
    </div>
  `;

  modal.style.display = "flex";
};
