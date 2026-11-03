// ============================================================================
// Every Individual Deserves Better Care. - Modern Appointments Controller
// Matches the official Multi Therapy Appointment Page UI design reference.
// ============================================================================

let allAppointments = [];
let patientsList = [];
let doctorsList = [];
let therapistsList = [];

let currentFilter = "all";
let currentSearch = "";
let currentSpecTab = "all";

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

  // 3. Initialize Booking Form Defaults & Quick Chips
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

  // Initial search specialists preview
  renderSpecialistsList();
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
 * Setup Booking Form Defaults, Quick Time Chips, and Submit Handler
 */
function setupBookingForm(user) {
  const form = document.getElementById("bookApptForm");
  const clearBtn = document.getElementById("btnClearForm");
  const dateInput = document.getElementById("apptDate");
  const timeInput = document.getElementById("apptTime");
  const formAlert = document.getElementById("formAlert");
  const submitBtn = document.getElementById("btnConfirmAppt");

  // Preset Date to Today and Minimum to Today
  if (dateInput) {
    const today = new Date().toISOString().split("T")[0];
    dateInput.value = today;
    dateInput.min = today;
  }

  // Quick Time Selector Chips
  const chips = document.querySelectorAll(".apt-time-chips .apt-time-chip");
  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      const selectedTime = chip.getAttribute("data-time");
      if (timeInput && selectedTime) {
        timeInput.value = selectedTime;
        chips.forEach(c => c.style.borderColor = "#e2e8f0");
        chip.style.borderColor = "#0d6efd";
      }
    });
  });

  // Clear Button
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (form) form.reset();
      if (dateInput) {
        const today = new Date().toISOString().split("T")[0];
        dateInput.value = today;
        dateInput.min = today;
      }
      chips.forEach(c => c.style.borderColor = "#e2e8f0");
      if (formAlert) formAlert.hidden = true;
      showToast("Booking form cleared.", "info");
    });
  }

  // Submit Handler
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const patient_id = document.getElementById("apptPatient").value;
      const specialistValue = document.getElementById("apptSpecialist").value;
      const appt_type = document.getElementById("apptType").value;
      const appt_date = document.getElementById("apptDate").value;
      const appt_time = document.getElementById("apptTime").value;
      const reason = document.getElementById("apptReason").value.trim();

      if (!patient_id || !specialistValue || !appt_date || !appt_time) {
        showFormAlert("Please fill in all required fields (Patient, Specialist, Date, Time).", "danger");
        return;
      }

      // Extract Doctor ID
      let doctor_id = null;
      if (specialistValue.startsWith("doc_")) {
        doctor_id = specialistValue.replace("doc_", "");
      } else if (specialistValue.startsWith("ther_")) {
        // If therapist selected, use their ID or fallback to 1st doctor if backend requires doctor_id
        doctor_id = specialistValue.replace("ther_", "");
      } else {
        doctor_id = specialistValue;
      }

      // Check slot collision / availability
      const isUnavailable = allAppointments.some(a => {
        const isSameDate = String(a.appointment_date) === String(appt_date);
        const isSameTime = String(a.appointment_time).startsWith(appt_time);
        const isSameSpec = String(a.doctor_id) === String(doctor_id);
        const isNotCancelled = (a.status || "").toLowerCase() !== "cancelled";
        return isSameDate && isSameTime && isSameSpec && isNotCancelled;
      });

      if (isUnavailable) {
        showFormAlert(`⚠️ Time slot ${formatTimeString(appt_time)} on ${formatDateString(appt_date)} is already booked for this specialist. Please choose another time.`, "danger");
        return;
      }

      if (formAlert) formAlert.hidden = true;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
        Confirming...
      `;

      try {
        const payload = {
          patient_id,
          doctor_id,
          appointment_date: appt_date,
          appointment_time: appt_time,
          status: "Confirmed",
          notes: reason ? `${appt_type}: ${reason}` : appt_type,
          user_id: user.user_id
        };

        const res = await apiRequest("/api/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        showToast(res.message || "Appointment confirmed and scheduled successfully!", "success");

        // Reset inputs
        document.getElementById("apptSpecialist").value = "";
        document.getElementById("apptTime").value = "";
        document.getElementById("apptReason").value = "";

        // Reload appointments table & refresh metrics
        await loadAppointmentsTable(user);

        // Smooth scroll to appointments table
        const myAppts = document.getElementById("myAppointmentsCard");
        if (myAppts) myAppts.scrollIntoView({ behavior: "smooth" });

      } catch (err) {
        showFormAlert(err.message || "Failed to confirm appointment. Please verify details.", "danger");
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
 * Fetch Patients, Doctors, and Therapists from the API
 */
async function loadDropdownsData(user) {
  try {
    const [pRes, dRes, tRes] = await Promise.all([
      apiRequest(`/api/patients?user_id=${encodeURIComponent(user.user_id || '')}&role=${encodeURIComponent(user.role || '')}`).catch(() => ({ patients: [] })),
      apiRequest(`/api/doctors?user_id=${encodeURIComponent(user.user_id || '')}&role=${encodeURIComponent(user.role || '')}`).catch(() => ({ doctors: [] })),
      apiRequest(`/api/therapists?user_id=${encodeURIComponent(user.user_id || '')}&role=${encodeURIComponent(user.role || '')}`).catch(() => ({ therapists: [] }))
    ]);

    patientsList = pRes.patients || [];
    doctorsList = dRes.doctors || [];
    therapistsList = tRes.therapists || [];

    // Populate Patient Dropdown
    const pSelect = document.getElementById("apptPatient");
    const helpText = document.getElementById("patientHelpText");

    if (pSelect) {
      if (patientsList.length === 0) {
        pSelect.innerHTML = `<option value="" disabled selected>No patients found</option>`;
      } else {
        pSelect.innerHTML = `<option value="" disabled selected>Select Patient</option>` +
          patientsList.map(p => {
            const meta = [p.gender || 'Patient', p.age ? `${p.age} yrs` : null].filter(Boolean).join(', ');
            return `<option value="${p.patient_id}">${escapeHtml(p.name)} (${escapeHtml(meta)})</option>`;
          }).join("");

        // If user is a patient, auto-select them
        if ((user.role || "").toLowerCase() === "patient") {
          const matched = patientsList.find(p =>
            (p.user_id && p.user_id === user.user_id) ||
            (p.name && user.username && p.name.toLowerCase() === user.username.toLowerCase()) ||
            (p.name && user.name && p.name.toLowerCase() === user.name.toLowerCase())
          );
          if (matched) {
            pSelect.value = matched.patient_id;
            if (helpText) helpText.textContent = `Auto-selected: ${matched.name}`;
          }
        }
      }
    }

    // Populate Specialist (Doctor / Therapist) Dropdown with optgroups
    populateSpecialistDropdown();

  } catch (err) {
    console.error("Failed to load dropdown data:", err);
  }
}

/**
 * Populate the Specialist dropdown in the booking form
 */
function populateSpecialistDropdown() {
  const sSelect = document.getElementById("apptSpecialist");
  if (!sSelect) return;

  let html = `<option value="" disabled selected>Select Specialist (Doctor / Therapist)</option>`;

  if (doctorsList.length > 0) {
    html += `<optgroup label="Doctors / Physicians">`;
    doctorsList.forEach(d => {
      const spec = d.specialization ? ` - ${d.specialization}` : '';
      html += `<option value="doc_${d.doctor_id}" data-fee="₹10,900">Dr. ${escapeHtml(d.name)}${escapeHtml(spec)} (Consultation: ₹10,900)</option>`;
    });
    html += `</optgroup>`;
  }

  if (therapistsList.length > 0) {
    html += `<optgroup label="Certified Therapists">`;
    therapistsList.forEach(t => {
      const spec = t.specialization ? ` - ${t.specialization}` : ' - Therapist';
      html += `<option value="ther_${t.therapist_id}" data-fee="₹4,500">${escapeHtml(t.name)}${escapeHtml(spec)} (Session: ₹4,500)</option>`;
    });
    html += `</optgroup>`;
  }

  sSelect.innerHTML = html;
}

/**
 * Setup "Find a Specialist" Card with Tabs, Search, and 1-Click Select
 */
function setupFindSpecialistSearch() {
  const tabs = document.querySelectorAll(".apt-spec-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentSpecTab = tab.getAttribute("data-type") || "all";
      renderSpecialistsList();
    });
  });

  const searchForm = document.getElementById("specSearchForm");
  if (searchForm) {
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      renderSpecialistsList();
    });
  }
}

/**
 * Render the filtered specialist cards in the right column
 */
function renderSpecialistsList() {
  const listEl = document.getElementById("specResultsList");
  if (!listEl) return;

  const domainFilter = document.getElementById("specDomainSelect")?.value || "all";
  const locationFilter = document.getElementById("specLocationSelect")?.value || "all";

  // Build combined specialist items
  let specialists = [];

  if (currentSpecTab === "all" || currentSpecTab === "doctor") {
    doctorsList.forEach(d => {
      specialists.push({
        id: `doc_${d.doctor_id}`,
        name: d.name.startsWith("Dr.") ? d.name : `Dr. ${d.name}`,
        specialization: d.specialization || "General Physician",
        type: "Doctor",
        location: d.city ? `${d.city} Clinic` : "Main Clinic (Building A)",
        defaultType: "Consultation",
        fee: "₹10,900"
      });
    });
  }

  if (currentSpecTab === "all" || currentSpecTab === "therapist") {
    therapistsList.forEach(t => {
      specialists.push({
        id: `ther_${t.therapist_id}`,
        name: t.name,
        specialization: t.specialization || "Physiotherapy & Rehab",
        type: "Therapist",
        location: "Pediatric Therapy Wing",
        defaultType: "Therapy",
        fee: "₹4,500"
      });
    });
  }

  // Filter by Specialization domain
  if (domainFilter !== "all") {
    const q = domainFilter.toLowerCase();
    specialists = specialists.filter(s =>
      s.specialization.toLowerCase().includes(q) ||
      (q === "physiotherapy" && s.specialization.toLowerCase().includes("physio")) ||
      (q === "occupational" && s.specialization.toLowerCase().includes("occup")) ||
      (q === "speech" && s.specialization.toLowerCase().includes("speech")) ||
      (q === "neurology" && s.specialization.toLowerCase().includes("neuro"))
    );
  }

  // Filter by Location
  if (locationFilter !== "all") {
    specialists = specialists.filter(s =>
      s.location.toLowerCase().includes(locationFilter.toLowerCase())
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
  const formCard = document.getElementById("bookAppointmentCard");
  const feeEl = document.getElementById("specialistFeeText");

  if (sSelect) {
    sSelect.value = specialistId;
  }
  if (typeSelect && defaultType) {
    typeSelect.value = defaultType;
  }
  if (feeEl) {
    if (specialistId.startsWith("doc_")) {
      feeEl.innerHTML = '<span class="text-success fw-bold">🩺 Consultation Fee: ₹10,900 (INR)</span>';
    } else if (specialistId.startsWith("ther_")) {
      feeEl.innerHTML = '<span class="text-success fw-bold">💪 Therapy Session Fee: ₹4,500 (INR)</span>';
    } else {
      feeEl.textContent = '';
    }
  }

  if (formCard) {
    formCard.scrollIntoView({ behavior: "smooth", block: "center" });
    formCard.style.boxShadow = "0 0 0 3px rgba(13, 110, 253, 0.4)";
    setTimeout(() => { formCard.style.boxShadow = ""; }, 1500);
  }

  showToast("Specialist selected in booking form!", "success");
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
    const res = await apiRequest(`/api/appointments?user_id=${encodeURIComponent(u.user_id || '')}&role=${encodeURIComponent(u.role || '')}`);

    allAppointments = (res && res.appointments) ? res.appointments : [];

    // Normalize Status and Types
    allAppointments = allAppointments.map(a => {
      let normStatus = "Confirmed";
      const rawStatus = (a.status || "").toLowerCase();

      if (rawStatus === "cancelled") {
        normStatus = "Cancelled";
      } else if (rawStatus === "pending" || rawStatus === "rescheduled") {
        normStatus = "Pending";
      } else {
        normStatus = "Confirmed";
      }

      // Infer Type if missing
      let apptType = "Consultation";
      const docName = (a.doctor_name || "").toLowerCase();
      if (docName.includes("therapist") || docName.includes("therapy") || (a.notes && a.notes.toLowerCase().includes("therapy"))) {
        apptType = "Therapy";
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
    console.error("Failed to fetch appointments:", err);
    if (emptyState) {
      emptyState.style.display = "block";
      const desc = emptyState.querySelector(".apt-empty-desc");
      if (desc) desc.textContent = "Unable to load appointments from server. Please verify your backend server.";
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
  let cancelled = 0;

  allAppointments.forEach(a => {
    if (a.normalizedStatus === "Confirmed") confirmed++;
    else if (a.normalizedStatus === "Pending") pending++;
    else if (a.normalizedStatus === "Cancelled") cancelled++;
  });

  const elAll = document.getElementById("countAll");
  const elConf = document.getElementById("countConfirmed");
  const elPend = document.getElementById("countPending");
  const elCanc = document.getElementById("countCancelled");

  if (elAll) elAll.textContent = total;
  if (elConf) elConf.textContent = confirmed;
  if (elPend) elPend.textContent = pending;
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
      if (a.normalizedStatus.toLowerCase() !== currentFilter.toLowerCase()) return false;
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

    const statusBadgeClass = a.normalizedStatus.toLowerCase();
    const typeBadgeClass = (a.apptType || "Consultation").toLowerCase();

    return `
      <tr>
        <td>
          <span class="badge bg-light text-dark border fw-bold">#APT-${escapeHtml(a.appointment_id)}</span>
        </td>
        <td>
          <div class="d-flex align-items-center gap-2">
            ${a.patient_photo || a.patient_profile_photo
              ? `<img src="${typeof CdnManager !== 'undefined' ? CdnManager.buildCdnUrl(a.patient_photo || a.patient_profile_photo, { width: 48, height: 48, crop: 'fill' }) : (a.patient_photo || a.patient_profile_photo)}" style="width:26px; height:26px; border-radius:50%; object-fit:cover;" onerror="this.outerHTML='<span style=\\'font-size: 17px;\\'>👤</span>';">`
              : `<span style="font-size: 17px;">👤</span>`
            }
            <div>
              <div class="fw-bold text-dark">${escapeHtml(patientName)}</div>
              <small class="text-muted">ID: #${escapeHtml(a.patient_id)}</small>
            </div>
          </div>
        </td>
        <td>
          <div class="d-flex align-items-center gap-2">
            ${a.doctor_photo || a.doctor_profile_photo
              ? `<img src="${typeof CdnManager !== 'undefined' ? CdnManager.buildCdnUrl(a.doctor_photo || a.doctor_profile_photo, { width: 48, height: 48, crop: 'fill' }) : (a.doctor_photo || a.doctor_profile_photo)}" style="width:26px; height:26px; border-radius:50%; object-fit:cover;" onerror="this.outerHTML='<span style=\\'font-size: 17px;\\'>🩺</span>';">`
              : `<span style="font-size: 17px;">🩺</span>`
            }
            <div>
              <div class="fw-bold text-dark">${escapeHtml(doctorName)}</div>
              <small class="text-muted">Specialist</small>
            </div>
          </div>
        </td>
        <td>
          <span class="apt-type-badge ${escapeHtml(typeBadgeClass)}">
            ${a.apptType === "Therapy" ? '💪 Therapy' : '🩺 Consultation'}
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
        chip.style.borderColor = "#0d6efd";
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
          const isSameDate = String(a.appointment_date) === String(newDate);
          const isSameTime = String(a.appointment_time).startsWith(newTime);
          const isSameSpec = String(a.doctor_id) === String(appt.doctor_id);
          const isNotCancelled = (a.status || "").toLowerCase() !== "cancelled";
          return isSameDate && isSameTime && isSameSpec && isNotCancelled;
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
        // First try PUT /api/appointments/:id, fallback to re-scheduling via POST and DELETE
        let updated = false;
        try {
          const res = await apiRequest(`/api/appointments/${apptId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              appointment_date: newDate,
              appointment_time: newTime,
              status: "Pending"
            })
          });
          if (res && res.success) updated = true;
        } catch (e) {
          // If PUT not supported by backend route, re-schedule using POST and DELETE old
          if (appt) {
            await apiRequest("/api/appointments", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                patient_id: appt.patient_id,
                doctor_id: appt.doctor_id,
                appointment_date: newDate,
                appointment_time: newTime,
                status: "Pending",
                user_id: user.user_id
              })
            });
            await apiRequest(`/api/appointments/${apptId}`, { method: "DELETE" }).catch(() => {});
            updated = true;
          }
        }

        // Close modal
        const modalEl = document.getElementById("rescheduleModal");
        if (modalEl && window.bootstrap && window.bootstrap.Modal) {
          const inst = window.bootstrap.Modal.getInstance(modalEl) || new window.bootstrap.Modal(modalEl);
          inst.hide();
        }

        showToast("Appointment rescheduled successfully!", "success");
        await loadAppointmentsTable(user);

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
  if (metaSpec) metaSpec.textContent = appt.doctor_name || `Doctor #${appt.doctor_id}`;
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

    // Call DELETE API
    const res = await apiRequest(`/api/appointments/${apptId}`, {
      method: "DELETE"
    });

    showToast(res.message || `Appointment #APT-${apptId} cancelled successfully.`, "success");
    await loadAppointmentsTable(user);

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
 * Format Date Utility (e.g. "Sat, Oct 31, 2026")
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
