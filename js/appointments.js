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
    profile_photo: "./images/doctor_female_avatar.png"
  },
  {
    doctor_id: 102,
    name: "Dr. Rajesh Sharma",
    specialization: "Orthopedic Rehabilitation",
    phone: "+91 98234 56789",
    email: "rajesh.sharma@multitherapy.org",
    city: "Jaipur Neuro Clinic",
    consultation_fee: "₹10,900",
    profile_photo: "./images/doctor_male_avatar.png"
  },
  {
    doctor_id: 103,
    name: "Dr. Ananya Sen",
    specialization: "Child Development & Cerebral Palsy",
    phone: "+91 94123 45678",
    email: "ananya.sen@multitherapy.org",
    city: "Pediatric Pavilion",
    consultation_fee: "₹9,500",
    profile_photo: "./images/doctor_female_avatar.png"
  },
  {
    doctor_id: 104,
    name: "Dr. Vikram Malhotra",
    specialization: "Neuromuscular Rehabilitation",
    phone: "+91 98989 12345",
    email: "vikram.malhotra@multitherapy.org",
    city: "Advanced Care Center",
    consultation_fee: "₹11,500",
    profile_photo: "./images/doctor_male_avatar.png"
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
    location: "Pediatric Therapy Wing"
  },
  {
    therapist_id: 202,
    name: "Amit Verma, OT",
    specialization: "Occupational & Sensory Integration",
    phone: "+91 96543 21098",
    email: "amit.verma@multitherapy.org",
    session_fee: "₹4,200",
    location: "Sensory Development Lab"
  },
  {
    therapist_id: 203,
    name: "Kavita Nair, SLP",
    specialization: "Speech & Language Pathologist",
    phone: "+91 95432 10987",
    email: "kavita.nair@multitherapy.org",
    session_fee: "₹3,800",
    location: "Communication Rehab Wing"
  },
  {
    therapist_id: 204,
    name: "Rahul Roy, MPT",
    specialization: "Gait & Postural Rehabilitation",
    phone: "+91 94321 09876",
    email: "rahul.roy@multitherapy.org",
    session_fee: "₹4,000",
    location: "Motion Dynamics Gym"
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

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Check Authentication
  const rawUser = localStorage.getItem("currentUser");
  let user = null;
  if (rawUser) {
    try { user = JSON.parse(rawUser); } catch (e) { user = null; }
  }

  if (!user) {
    window.location.href = "./index.html";
    return;
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

        // Update live preview banner
        updateSpecialistPreviewBanner(specialist);
      } else {
        if (specField) specField.value = "";
        hideSpecialistPreviewBanner();
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
          status: isPatient ? "Pending Approval" : "Confirmed",
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
        if (isPatient) {
          showToast(`🗓️ Appointment request submitted to ${docName} for ${formatDateString(appt_date)} at ${formatTimeString(appt_time)}! Status: Pending Approval.`, "info");
        } else {
          showToast(`🎉 Appointment scheduled and confirmed with ${docName} for ${formatDateString(appt_date)} at ${formatTimeString(appt_time)}!`, "success");
        }

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
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentSpecTab = tab.getAttribute("data-type") || tab.id?.replace("tabSpec", "").toLowerCase() || "all";
      renderSpecialistsList();
    });
  });

  const filterSpec = document.getElementById("filterSpec") || document.getElementById("specDomainSelect");
  if (filterSpec) filterSpec.addEventListener("change", renderSpecialistsList);

  const filterLoc = document.getElementById("filterLoc") || document.getElementById("specLocationSelect");
  if (filterLoc) filterLoc.addEventListener("change", renderSpecialistsList);
}

/**
 * Render the filtered specialist cards in the right column
 */
function renderSpecialistsList() {
  const listEl = document.getElementById("specResultsList");
  if (!listEl) return;

  const domainFilter = (document.getElementById("filterSpec") || document.getElementById("specDomainSelect"))?.value || "all";
  const locationFilter = (document.getElementById("filterLoc") || document.getElementById("specLocationSelect"))?.value || "all";

  let specialists = [];

  if (currentSpecTab === "all" || currentSpecTab === "doctor" || currentSpecTab === "doctors") {
    doctorsList.forEach(d => {
      specialists.push({
        id: `doc_${d.doctor_id}`,
        name: d.name.startsWith("Dr.") ? d.name : `Dr. ${d.name}`,
        specialization: d.specialization || "Pediatric Neurology",
        type: "Doctor",
        location: d.city || "Jaipur Main Rehab Center",
        defaultType: "Consultation",
        fee: d.consultation_fee || "₹10,900"
      });
    });
  }

  if (currentSpecTab === "all" || currentSpecTab === "therapist" || currentSpecTab === "therapists") {
    therapistsList.forEach(t => {
      specialists.push({
        id: `ther_${t.therapist_id}`,
        name: t.name,
        specialization: t.specialization || "Physiotherapy & Rehab",
        type: "Therapist",
        location: t.location || "Pediatric Therapy Wing",
        defaultType: "Therapy",
        fee: t.session_fee || "₹4,500"
      });
    });
  }

  // Filter domain
  if (domainFilter !== "all") {
    const q = domainFilter.toLowerCase();
    specialists = specialists.filter(s =>
      s.specialization.toLowerCase().includes(q) ||
      (q === "pediatric" && s.specialization.toLowerCase().includes("pediatric")) ||
      (q === "physio" && s.specialization.toLowerCase().includes("physio")) ||
      (q === "occupational" && s.specialization.toLowerCase().includes("occup")) ||
      (q === "speech" && s.specialization.toLowerCase().includes("speech")) ||
      (q === "ortho" && s.specialization.toLowerCase().includes("ortho"))
    );
  }

  if (specialists.length === 0) {
    listEl.innerHTML = `
      <div class="text-center text-muted py-4 small">
        No matching specialists found for the selected criteria.
      </div>
    `;
    return;
  }

  listEl.innerHTML = specialists.map(s => `
    <div class="apt-spec-item">
      <div class="apt-spec-info">
        <div class="apt-spec-name">${escapeHtml(s.name)}</div>
        <div class="apt-spec-meta">
          <span class="badge bg-light text-primary border me-1">${escapeHtml(s.type)}</span>
          ${escapeHtml(s.specialization)} • <span class="text-secondary">${escapeHtml(s.location)}</span> • <span class="badge bg-light text-success border fw-bold">${escapeHtml(s.fee)}</span>
        </div>
      </div>
      <button type="button" class="apt-btn-select-spec" onclick="selectSpecialistForBooking('${escapeHtml(s.id)}', '${escapeHtml(s.defaultType)}')">
        Select
      </button>
    </div>
  `).join("");
}

/**
 * 1-Click "Select" specialist into Book Appointment Form
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

  renderTimeSlots();

  if (formCard) {
    formCard.scrollIntoView({ behavior: "smooth", block: "center" });
    formCard.style.boxShadow = "0 0 0 3px rgba(8, 117, 249, 0.4)";
    setTimeout(() => { formCard.style.boxShadow = ""; }, 1500);
  }

  showToast(`${specialist ? specialist.name : 'Specialist'} selected for booking!`, "success");
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
    const rawUser = localStorage.getItem("currentUser");
    const u = rawUser ? JSON.parse(rawUser) : (user || {});
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

    allAppointments = combined.map(a => {
      let normStatus = "Confirmed";
      const rawStatus = (a.status || "").toLowerCase();

      if (rawStatus === "cancelled") {
        normStatus = "Cancelled";
      } else if (rawStatus.includes("reject")) {
        normStatus = "Rejected";
      } else if (rawStatus.includes("pending") || rawStatus.includes("approval") || rawStatus === "scheduled") {
        normStatus = "Pending Approval";
      } else {
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
  const searchInput = document.getElementById("searchApptInput");
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
}

/**
 * Calculate count badges for All, Confirmed, Pending, Cancelled
 */
function updateFilterCounts() {
  const total = allAppointments.length;
  let confirmed = 0;
  let pending = 0;
  let rejected = 0;
  let cancelled = 0;

  allAppointments.forEach(a => {
    if (a.normalizedStatus === "Confirmed") confirmed++;
    else if (a.normalizedStatus === "Pending Approval") pending++;
    else if (a.normalizedStatus === "Rejected") rejected++;
    else if (a.normalizedStatus === "Cancelled") cancelled++;
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
}

/**
 * Render the My Appointments Table
 */
function renderAppointmentsTable() {
  const tbody = document.getElementById("apptsTableBody");
  const tableWrapper = document.getElementById("tableWrapper");
  const emptyState = document.getElementById("tableEmptyState");

  if (!tbody) return;

  const filtered = allAppointments.filter(a => {
    // Status Filter
    if (currentFilter !== "all") {
      const target = currentFilter.toLowerCase();
      const actual = a.normalizedStatus.toLowerCase();
      if (target === "pending") {
        if (!actual.includes("pending")) return false;
      } else if (target === "confirmed") {
        if (actual !== "confirmed") return false;
      } else if (target === "rejected") {
        if (actual !== "rejected") return false;
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

    const rawUser = localStorage.getItem("currentUser");
    const curUser = rawUser ? JSON.parse(rawUser) : {};
    const curRole = (curUser.role || "").toLowerCase();
    const isDoctorOrStaff = curRole === "doctor" || curRole === "therapist" || curRole === "admin";

    const statusBadgeClass = a.normalizedStatus.toLowerCase().replace(/\s+/g, '-');
    const typeBadgeClass = (a.apptType || "Consultation").toLowerCase().replace(/\s+/g, '-');
    const isCancelled = a.normalizedStatus === "Cancelled";
    const isPending = a.normalizedStatus === "Pending Approval";
    const isConfirmed = a.normalizedStatus === "Confirmed";
    const isRejected = a.normalizedStatus === "Rejected";

    return `
      <tr class="${isCancelled ? 'opacity-75' : ''}">
        <td>
          <span class="badge bg-light text-dark border fw-bold">#APT-${escapeHtml(a.appointment_id)}</span>
        </td>
        <td>
          <div class="d-flex align-items-center gap-2">
            ${a.patient_photo || a.patient_profile_photo
              ? `<img src="${typeof CdnManager !== 'undefined' ? CdnManager.buildCdnUrl(a.patient_photo || a.patient_profile_photo, { width: 48, height: 48, crop: 'fill' }) : (a.patient_photo || a.patient_profile_photo)}" style="width:28px; height:28px; border-radius:50%; object-fit:cover;" onerror="this.outerHTML='<span style=\\'font-size: 18px;\\'>👤</span>';">`
              : `<span style="font-size: 18px;">👤</span>`
            }
            <div>
              <div class="fw-bold text-dark">${escapeHtml(patientName)}</div>
              <small class="text-muted">ID: #${escapeHtml(a.patient_id)}</small>
            </div>
          </div>
        </td>
        <td>
          <div class="d-flex align-items-center gap-2">
            <span style="font-size: 18px;">${(a.apptType && a.apptType.includes("Therapy")) ? '💪' : '🩺'}</span>
            <div>
              <div class="fw-bold text-dark">${escapeHtml(doctorName)}</div>
              <small class="text-muted">${escapeHtml(a.doctor_specialization || 'Clinical Specialist')}</small>
            </div>
          </div>
        </td>
        <td>
          <span class="apt-type-badge ${escapeHtml(typeBadgeClass)}">
            ${escapeHtml(a.apptType || 'Consultation')}
          </span>
        </td>
        <td>
          <div><strong>${escapeHtml(formattedDate)}</strong></div>
          <small class="text-muted">🕒 ${escapeHtml(formattedTime)}</small>
        </td>
        <td>
          <span class="apt-status-badge ${escapeHtml(statusBadgeClass)}">
            ● ${escapeHtml(a.normalizedStatus)}
          </span>
        </td>
        <td style="text-align: right;">
          <div class="apt-action-btn-group">
            ${isPending ? `
              ${isDoctorOrStaff ? `
                <button type="button" class="apt-btn-accept" onclick="window.NotificationManager ? window.NotificationManager.acceptAppointment(${a.appointment_id}) : acceptAppointmentAction(${a.appointment_id})" title="Accept and Confirm this Appointment">
                  ✓ Accept
                </button>
                <button type="button" class="apt-btn-reject" onclick="window.NotificationManager ? window.NotificationManager.rejectAppointment(${a.appointment_id}) : rejectAppointmentAction(${a.appointment_id})" title="Reject this Appointment Request">
                  ✕ Reject
                </button>
                <button type="button" class="apt-btn-info" onclick="openDoctorPatientModal('${a.patient_id}', ${JSON.stringify(a).replace(/"/g, '&quot;')})" title="View Patient Clinical Overview">
                  👤 Info
                </button>
              ` : `
                <span class="badge bg-light text-warning border me-1">Awaiting Doctor Approval</span>
                <button type="button" class="apt-btn-cancel-appt" onclick="cancelAppointment(${a.appointment_id})" title="Withdraw this request">
                  Cancel
                </button>
              `}
            ` : `
              ${isConfirmed ? `
                <button type="button" class="apt-btn-reschedule" onclick="openRescheduleModal(${a.appointment_id})" title="Reschedule this appointment">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  <span>Reschedule</span>
                </button>

                <button type="button" class="apt-btn-cancel-appt" onclick="cancelAppointment(${a.appointment_id})" title="Cancel this appointment">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  <span>Cancel</span>
                </button>
              ` : `
                ${isRejected ? `
                  <span class="badge bg-light text-danger border me-2">Rejected</span>
                  <a href="#bookAppointmentCard" class="btn btn-sm btn-outline-primary py-0 px-2" style="font-size: 11px; font-weight: 700;">Re-book Slot</a>
                ` : `
                  <span class="badge bg-light text-secondary border">Cancelled</span>
                `}
              `}
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
    const rawUser = localStorage.getItem("currentUser");
    const user = rawUser ? JSON.parse(rawUser) : {};

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
  const rawUser = localStorage.getItem("currentUser");
  const user = rawUser ? JSON.parse(rawUser) : null;
  loadAppointmentsTable(user);
});
