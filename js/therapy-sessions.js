/**
 * ============================================================================
 * Multi Therapy - Therapy Sessions Management Dashboard
 * Comprehensive session scheduling, tracking, live filtering, and persistent storage
 * ============================================================================
 */

// Storage keys
const STORAGE_KEY = "mt_therapy_sessions_db";

// Default clinical seed data
const DEFAULT_SESSIONS = [
  {
    session_id: "TS-1001",
    patient_id: "P-101",
    patient_name: "Aarav Sharma",
    therapist_id: "TH-201",
    therapist_name: "Dr. Sunita Mehra",
    therapist_role: "Senior Physiotherapist",
    therapy_type: "Physiotherapy",
    session_date: new Date().toISOString().split("T")[0],
    start_time: "09:30",
    duration_minutes: 45,
    status: "Completed",
    exercise: "Gait Mobility & Posture Correction",
    notes: "Patient demonstrated 15% improved knee flexion during parallel bar walking. Maintained balance for 4 minutes continuously."
  },
  {
    session_id: "TS-1002",
    patient_id: "P-102",
    patient_name: "Ananya Verma",
    therapist_id: "TH-202",
    therapist_name: "Dr. Vikram Joshi",
    therapist_role: "Occupational Therapist",
    therapy_type: "Occupational Therapy",
    session_date: new Date().toISOString().split("T")[0],
    start_time: "11:00",
    duration_minutes: 60,
    status: "In Progress",
    exercise: "Fine Motor Skills & Adaptive Grip",
    notes: "Practicing pegboard insertion and fork-holding adaptations. Good fine-motor focus today."
  },
  {
    session_id: "TS-1003",
    patient_id: "P-103",
    patient_name: "Rohan Patel",
    therapist_id: "TH-203",
    therapist_name: "Dr. Neha Kapoor",
    therapist_role: "Speech & Language Pathologist",
    therapy_type: "Speech Therapy",
    session_date: new Date().toISOString().split("T")[0],
    start_time: "14:30",
    duration_minutes: 30,
    status: "Scheduled",
    exercise: "Oral-Motor Phonation & Syllables",
    notes: "Targeting two-syllable word articulation and diaphragm breathing control."
  },
  {
    session_id: "TS-1004",
    patient_id: "P-104",
    patient_name: "Priya Gupta",
    therapist_id: "TH-201",
    therapist_name: "Dr. Sunita Mehra",
    therapist_role: "Senior Physiotherapist",
    therapy_type: "Neuromuscular Rehabilitation",
    session_date: getRelativeDate(1),
    start_time: "10:00",
    duration_minutes: 45,
    status: "Scheduled",
    exercise: "Passive Hamstring Stretch & Ankle Dorsiflexion",
    notes: "Addressing mild spasticity in left calf. Follow-up after home stretching regimen."
  },
  {
    session_id: "TS-1005",
    patient_id: "P-105",
    patient_name: "Kabir Singh",
    therapist_id: "TH-204",
    therapist_name: "Rajesh Verma",
    therapist_role: "Aquatic Therapy Specialist",
    therapy_type: "Hydrotherapy",
    session_date: getRelativeDate(2),
    start_time: "15:00",
    duration_minutes: 45,
    status: "Scheduled",
    exercise: "Buoyancy Assisted Leg Kicks",
    notes: "Heated hydro pool session to reduce joint load and encourage spontaneous stepping movements."
  },
  {
    session_id: "TS-1006",
    patient_id: "P-106",
    patient_name: "Ishita Rao",
    therapist_id: "TH-202",
    therapist_name: "Dr. Vikram Joshi",
    therapist_role: "Occupational Therapist",
    therapy_type: "Cognitive Behavioral",
    session_date: getRelativeDate(-1),
    start_time: "16:30",
    duration_minutes: 60,
    status: "Completed",
    exercise: "Sensory Integration & Balance Board",
    notes: "Completed all 5 sensory transition tasks without distress. Parents advised to continue quiet corner routines."
  },
  {
    session_id: "TS-1007",
    patient_id: "P-107",
    patient_name: "Vihaan Nair",
    therapist_id: "TH-201",
    therapist_name: "Dr. Sunita Mehra",
    therapist_role: "Senior Physiotherapist",
    therapy_type: "Physiotherapy",
    session_date: getRelativeDate(-2),
    start_time: "09:00",
    duration_minutes: 45,
    status: "Completed",
    exercise: "Arm-Shoulder Extension with Elastic Band",
    notes: "Excellent upper-body stability achieved. Repetition counts increased from 8 to 12."
  },
  {
    session_id: "TS-1008",
    patient_id: "P-108",
    patient_name: "Meera Sen",
    therapist_id: "TH-203",
    therapist_name: "Dr. Neha Kapoor",
    therapist_role: "Speech & Language Pathologist",
    therapy_type: "Speech Therapy",
    session_date: getRelativeDate(-3),
    start_time: "11:30",
    duration_minutes: 30,
    status: "Cancelled",
    exercise: "Phonetic Pronunciation Practice",
    notes: "Session cancelled due to patient fever. Rescheduling requested for next Tuesday."
  }
];

// Helper to get relative ISO date string
function getRelativeDate(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split("T")[0];
}

// Global state
let allSessions = [];
let editingSessionId = null;
let currentStatusFilter = "all";
let currentPage = 1;
const PAGE_SIZE = 7;
let sessionToDelete = null;

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Auth check and Navbar setup
  const rawUser = localStorage.getItem("currentUser");
  let currentUser = null;
  if (rawUser) {
    try { currentUser = JSON.parse(rawUser); } catch (e) { currentUser = null; }
  }
  setupNavbarAuth(currentUser);

  // 2. Mobile Menu Toggle
  const navToggle = document.getElementById("navToggle");
  const navMenu = document.getElementById("navMenu");
  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      navMenu.classList.toggle("active");
    });
  }

  // 3. Pre-fill default session date with today
  const sDateInput = document.getElementById("sDate");
  if (sDateInput && !sDateInput.value) {
    sDateInput.value = new Date().toISOString().split("T")[0];
  }

  // 4. Quick Time Slot Chips
  document.querySelectorAll(".ts-chip-btn").forEach(chip => {
    chip.addEventListener("click", () => {
      const timeVal = chip.getAttribute("data-time");
      const sTimeInput = document.getElementById("sTime");
      if (sTimeInput && timeVal) {
        sTimeInput.value = timeVal;
      }
    });
  });

  // 5. Populate Dropdowns (Patients, Therapists, Exercises)
  await loadDropdownData(currentUser);

  // 6. Load Sessions
  await loadSessions();

  // 7. Setup Form Handlers (Save and Cancel)
  setupFormHandlers();

  // 8. Setup Search and Filter Handlers
  setupSearchAndFilters();

  // 9. Quick Actions (+ New Session and Refresh)
  const btnHeroNew = document.getElementById("btnHeroNew");
  const btnHeaderNew = document.getElementById("btnHeaderNew");
  if (btnHeroNew) {
    btnHeroNew.addEventListener("click", (e) => {
      e.preventDefault();
      focusAddForm();
    });
  }
  if (btnHeaderNew) {
    btnHeaderNew.addEventListener("click", (e) => {
      e.preventDefault();
      focusAddForm();
    });
  }

  const btnRefresh = document.getElementById("btnRefreshSessions");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", async () => {
      btnRefresh.disabled = true;
      btnRefresh.innerHTML = `<span>⏳</span> Refreshing...`;
      await loadSessions();
      showToast("Sessions refreshed from database.", "info");
      setTimeout(() => {
        btnRefresh.disabled = false;
        btnRefresh.innerHTML = `<span>🔄</span> Refresh`;
      }, 500);
    });
  }

  // 10. Delete Modal Confirmation Button
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", async () => {
      if (sessionToDelete) {
        await executeDeleteSession(sessionToDelete);
        sessionToDelete = null;
        const modalEl = document.getElementById("deleteSessionModal");
        if (modalEl && window.bootstrap && window.bootstrap.Modal) {
          const modalInstance = bootstrap.Modal.getInstance(modalEl);
          if (modalInstance) modalInstance.hide();
        }
      }
    });
  }
});

/**
 * Configure Navbar user pill or login buttons
 */
function setupNavbarAuth(user) {
  const userProfileWrap = document.getElementById("userProfileWrap");
  const logoutBtn = document.getElementById("logoutBtn");
  const publicNavActions = document.getElementById("publicNavActions");
  const navUsername = document.getElementById("navUsername");
  const navRole = document.getElementById("navRole");
  const navAvatar = document.getElementById("navAvatar");
  const navAvatarImg = document.getElementById("navAvatarImg");

  if (user) {
    if (userProfileWrap) userProfileWrap.style.display = "inline-flex";
    if (logoutBtn) {
      logoutBtn.style.display = "inline-flex";
      logoutBtn.addEventListener("click", async () => {
        try {
          if (typeof apiRequest === "function") {
            await apiRequest("/api/logout", { method: "POST" });
          }
        } catch (e) {}
        localStorage.removeItem("currentUser");
        window.location.href = "./index.html";
      });
    }
    if (publicNavActions) publicNavActions.style.display = "flex";

    const name = user.name || user.username || "User";
    if (navUsername) navUsername.textContent = name;
    if (navRole) navRole.textContent = (user.role || "Clinical Staff").toUpperCase();

    if (typeof renderNavbarUser === "function") {
      renderNavbarUser(user);
    }
  } else {
    if (userProfileWrap) userProfileWrap.style.display = "inline-flex";
    if (logoutBtn) logoutBtn.style.display = "inline-flex";
    if (publicNavActions) publicNavActions.style.display = "flex";
  }
}

/**
 * Populate Patient, Therapist, and Exercise Dropdowns
 */
async function loadDropdownData(user) {
  const sPatient = document.getElementById("sPatient");
  const sTherapist = document.getElementById("sTherapist");
  const filterTherapist = document.getElementById("filterTherapist");

  let patients = [
    { patient_id: "P-101", name: "Aarav Sharma" },
    { patient_id: "P-102", name: "Ananya Verma" },
    { patient_id: "P-103", name: "Rohan Patel" },
    { patient_id: "P-104", name: "Priya Gupta" },
    { patient_id: "P-105", name: "Kabir Singh" },
    { patient_id: "P-106", name: "Ishita Rao" },
    { patient_id: "P-107", name: "Vihaan Nair" },
    { patient_id: "P-108", name: "Meera Sen" }
  ];

  let therapists = [
    { therapist_id: "TH-201", name: "Dr. Sunita Mehra", specialization: "Senior Physiotherapist" },
    { therapist_id: "TH-202", name: "Dr. Vikram Joshi", specialization: "Occupational Therapist" },
    { therapist_id: "TH-203", name: "Dr. Neha Kapoor", specialization: "Speech Pathologist" },
    { therapist_id: "TH-204", name: "Rajesh Verma", specialization: "Aquatic Therapy Specialist" },
    { therapist_id: "TH-205", name: "Dr. Kavita Chawla", specialization: "Neurologist / Rehab Specialist" }
  ];

  // Try fetching dynamic list from backend
  try {
    if (typeof apiRequest === "function") {
      const [pRes, tRes] = await Promise.all([
        apiRequest(`/api/patients?user_id=${encodeURIComponent(user?.user_id || '')}`).catch(() => null),
        apiRequest(`/api/therapists?user_id=${encodeURIComponent(user?.user_id || '')}`).catch(() => null)
      ]);

      if (pRes && pRes.patients && pRes.patients.length > 0) {
        patients = pRes.patients;
      }
      if (tRes && tRes.therapists && tRes.therapists.length > 0) {
        therapists = tRes.therapists;
      }
    }
  } catch (err) {
    // Graceful fallback to default lists
  }

  // Populate Patient select
  if (sPatient) {
    sPatient.innerHTML = `<option value="" disabled selected>Select Patient</option>` +
      patients.map(p => `<option value="${escapeHtml(p.patient_id || p.id || p.name)}" data-name="${escapeHtml(p.name)}">${escapeHtml(p.patient_id ? p.patient_id + ' • ' : '')}${escapeHtml(p.name)}</option>`).join("");
  }

  // Populate Therapist select
  if (sTherapist) {
    sTherapist.innerHTML = `<option value="" disabled selected>Select Therapist</option>` +
      therapists.map(t => `<option value="${escapeHtml(t.name)}" data-id="${escapeHtml(t.therapist_id || '')}" data-role="${escapeHtml(t.specialization || '')}">${escapeHtml(t.name)} (${escapeHtml(t.specialization || 'Therapist')})</option>`).join("");
  }

  // Populate Filter Therapist
  if (filterTherapist) {
    const existing = filterTherapist.value;
    filterTherapist.innerHTML = `<option value="all">All Therapists</option>` +
      therapists.map(t => `<option value="${escapeHtml(t.name)}">${escapeHtml(t.name)}</option>`).join("");
    if (existing) filterTherapist.value = existing;
  }
}

/**
 * Load Sessions from API or LocalStorage fallback
 */
async function loadSessions() {
  let loaded = [];

  // Try API first
  try {
    if (typeof apiRequest === "function") {
      const rawUser = localStorage.getItem("currentUser");
      const user = rawUser ? JSON.parse(rawUser) : {};
      const res = await apiRequest(`/api/therapy-sessions?user_id=${encodeURIComponent(user.user_id || '')}`);
      if (res && Array.isArray(res.sessions) && res.sessions.length > 0) {
        loaded = res.sessions.map(s => normalizeSession(s));
      }
    }
  } catch (err) {
    // API not available, proceed to localStorage
  }

  // Fallback to localStorage if API returned nothing
  if (loaded.length === 0) {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        loaded = JSON.parse(saved);
      }
    } catch (e) {
      loaded = [];
    }
  }

  // Seed default sessions if completely empty
  if (!loaded || loaded.length === 0) {
    loaded = JSON.parse(JSON.stringify(DEFAULT_SESSIONS));
    persistSessionsLocally(loaded);
  }

  allSessions = loaded;
  updateKpiMetrics();
  renderSessionsTable();
}

/**
 * Standardize session object schema
 */
function normalizeSession(s) {
  return {
    session_id: s.session_id ? (String(s.session_id).startsWith("TS-") ? s.session_id : "TS-" + s.session_id) : "TS-" + Math.floor(1000 + Math.random() * 9000),
    patient_id: s.patient_id || "P-100",
    patient_name: s.patient_name || s.name || "Patient",
    therapist_id: s.therapist_id || "TH-200",
    therapist_name: s.therapist_name || "Specialist",
    therapist_role: s.therapist_role || s.specialization || "Therapist",
    therapy_type: s.therapy_type || "Physiotherapy",
    session_date: s.session_date || new Date().toISOString().split("T")[0],
    start_time: s.start_time || s.time || "10:00",
    duration_minutes: parseInt(s.duration_minutes || s.duration || 45, 10),
    status: s.status || "Scheduled",
    exercise: s.exercise || s.exercise_name || "General Therapy",
    notes: s.notes || "Clinical session recorded."
  };
}

/**
 * Save sessions array to LocalStorage
 */
function persistSessionsLocally(sessions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error("Failed to save sessions to localStorage:", e);
  }
}

/**
 * Update the 4 Dashboard Statistics Cards
 */
function updateKpiMetrics() {
  const total = allSessions.length;
  const todayStr = new Date().toISOString().split("T")[0];

  const todayCount = allSessions.filter(s => s.session_date === todayStr).length;
  const completedCount = allSessions.filter(s => s.status === "Completed").length;
  const upcomingCount = allSessions.filter(s => (s.status === "Scheduled" || s.status === "In Progress") && s.session_date >= todayStr).length;

  const kpiTotal = document.getElementById("kpiTotalSessions");
  const kpiToday = document.getElementById("kpiTodaySessions");
  const kpiCompleted = document.getElementById("kpiCompletedSessions");
  const kpiUpcoming = document.getElementById("kpiUpcomingSessions");

  if (kpiTotal) kpiTotal.textContent = total;
  if (kpiToday) kpiToday.textContent = todayCount;
  if (kpiCompleted) kpiCompleted.textContent = completedCount;
  if (kpiUpcoming) kpiUpcoming.textContent = upcomingCount;

  // Update Status Tab Badges
  const scheduledCount = allSessions.filter(s => s.status === "Scheduled").length;
  const inProgCount = allSessions.filter(s => s.status === "In Progress").length;
  const cancelledCount = allSessions.filter(s => s.status === "Cancelled").length;

  const badgeAll = document.getElementById("tabBadgeAll");
  const badgeScheduled = document.getElementById("tabBadgeScheduled");
  const badgeCompleted = document.getElementById("tabBadgeCompleted");
  const badgeInProg = document.getElementById("tabBadgeInProgress");
  const badgeCancelled = document.getElementById("tabBadgeCancelled");

  if (badgeAll) badgeAll.textContent = total;
  if (badgeScheduled) badgeScheduled.textContent = scheduledCount;
  if (badgeCompleted) badgeCompleted.textContent = completedCount;
  if (badgeInProg) badgeInProg.textContent = inProgCount;
  if (badgeCancelled) badgeCancelled.textContent = cancelledCount;
}

/**
 * Filter sessions according to search and dropdown criteria
 */
function getFilteredSessions() {
  const searchTerm = (document.getElementById("searchSessions")?.value || "").toLowerCase().trim();
  const typeFilter = document.getElementById("filterType")?.value || "all";
  const therapistFilter = document.getElementById("filterTherapist")?.value || "all";
  const statusFilter = document.getElementById("filterStatus")?.value || "all";
  const dateFilter = document.getElementById("filterDate")?.value || "";

  return allSessions.filter(s => {
    // 1. Status Pill Tab Filter
    if (currentStatusFilter !== "all" && s.status.toLowerCase() !== currentStatusFilter.toLowerCase()) {
      return false;
    }

    // 2. Dropdown Status Filter
    if (statusFilter !== "all" && s.status.toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }

    // 3. Therapy Type Filter
    if (typeFilter !== "all" && s.therapy_type.toLowerCase() !== typeFilter.toLowerCase()) {
      return false;
    }

    // 4. Therapist Filter
    if (therapistFilter !== "all" && s.therapist_name.toLowerCase() !== therapistFilter.toLowerCase()) {
      return false;
    }

    // 5. Date Filter
    if (dateFilter && s.session_date !== dateFilter) {
      return false;
    }

    // 6. Search Query
    if (searchTerm) {
      const matchId = (s.session_id || "").toLowerCase().includes(searchTerm);
      const matchPatient = (s.patient_name || "").toLowerCase().includes(searchTerm);
      const matchTherapist = (s.therapist_name || "").toLowerCase().includes(searchTerm);
      const matchType = (s.therapy_type || "").toLowerCase().includes(searchTerm);
      const matchExercise = (s.exercise || "").toLowerCase().includes(searchTerm);
      const matchNotes = (s.notes || "").toLowerCase().includes(searchTerm);
      if (!matchId && !matchPatient && !matchTherapist && !matchType && !matchExercise && !matchNotes) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Render Sessions Table with Pagination
 */
function renderSessionsTable() {
  const tbody = document.getElementById("sessionsTableBody");
  if (!tbody) return;

  const filtered = getFilteredSessions();
  const total = filtered.length;

  // Pagination calculation
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, total);
  const pagedSessions = filtered.slice(startIndex, endIndex);

  // Render Table Rows
  if (pagedSessions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-5">
          <div style="color: #94a3b8; font-size: 38px; margin-bottom: 8px;">📋</div>
          <div style="font-weight: 700; font-size: 16px; color: #334155;">No therapy sessions found</div>
          <p style="color: #64748b; font-size: 13.5px; margin-top: 4px;">Try clearing filters or search query, or schedule a new session.</p>
        </td>
      </tr>
    `;
  } else {
    tbody.innerHTML = pagedSessions.map(s => {
      const initials = getInitials(s.patient_name);
      const typeClass = getTypeClass(s.therapy_type);
      const statusClass = getStatusClass(s.status);
      const formattedDate = formatDateDisplay(s.session_date);
      const formattedTime = formatTimeDisplay(s.start_time);

      return `
        <tr>
          <td>
            <span class="ts-session-id-pill">#${escapeHtml(s.session_id)}</span>
          </td>
          <td>
            <div class="ts-patient-cell">
              <div class="ts-patient-avatar">${initials}</div>
              <div>
                <div class="ts-patient-name">${escapeHtml(s.patient_name)}</div>
                <div class="ts-patient-id-sub">${escapeHtml(s.patient_id)}</div>
              </div>
            </div>
          </td>
          <td>
            <div class="ts-therapist-cell">
              <div class="ts-therapist-name">${escapeHtml(s.therapist_name)}</div>
              <div class="ts-therapist-role">${escapeHtml(s.therapist_role)}</div>
            </div>
          </td>
          <td>
            <span class="ts-type-badge ${typeClass}">
              <span>●</span> ${escapeHtml(s.therapy_type)}
            </span>
          </td>
          <td>
            <div style="font-weight: 700; color: #1e293b;">${formattedDate}</div>
            <div style="font-size: 12px; color: #64748b;">${formattedTime}</div>
          </td>
          <td>
            <span style="font-weight: 600; color: #334155; background: #f1f5f9; padding: 3px 8px; border-radius: 6px; font-size: 12px;">
              ⏱️ ${s.duration_minutes} min
            </span>
          </td>
          <td>
            <span class="ts-status-badge ${statusClass}">
              ${escapeHtml(s.status)}
            </span>
          </td>
          <td>
            <div style="max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12.5px; color: #475569;" title="${escapeHtml(s.exercise)}">
              ${escapeHtml(s.exercise || '-')}
            </div>
          </td>
          <td class="ts-sticky-col">
            <div class="ts-actions-wrap">
              <button type="button" class="ts-btn-action view" title="View Session Details" onclick="viewSession('${s.session_id}')">
                👁️
              </button>
              <button type="button" class="ts-btn-action edit" title="Edit Session" onclick="editSession('${s.session_id}')">
                ✏️
              </button>
              <button type="button" class="ts-btn-action delete" title="Delete Session" onclick="promptDeleteSession('${s.session_id}')">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  // Render Pagination Bar
  renderPagination(total, startIndex, endIndex, totalPages);
}

/**
 * Render pagination controls and info text
 */
function renderPagination(total, startIndex, endIndex, totalPages) {
  const infoEl = document.getElementById("paginationInfo");
  const btnsEl = document.getElementById("paginationBtns");

  if (infoEl) {
    if (total === 0) {
      infoEl.textContent = "Showing 0 sessions";
    } else {
      infoEl.textContent = `Showing ${startIndex + 1} to ${endIndex} of ${total} sessions`;
    }
  }

  if (btnsEl) {
    if (totalPages <= 1) {
      btnsEl.innerHTML = "";
      return;
    }

    let html = `
      <button type="button" class="ts-page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
        &laquo; Prev
      </button>
    `;

    for (let p = 1; p <= totalPages; p++) {
      html += `
        <button type="button" class="ts-page-btn ${p === currentPage ? 'active' : ''}" onclick="changePage(${p})">
          ${p}
        </button>
      `;
    }

    html += `
      <button type="button" class="ts-page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
        Next &raquo;
      </button>
    `;

    btnsEl.innerHTML = html;
  }
}

function changePage(page) {
  currentPage = page;
  renderSessionsTable();
}

/**
 * Setup Search & Filter Handlers
 */
function setupSearchAndFilters() {
  const searchInput = document.getElementById("searchSessions");
  const filterType = document.getElementById("filterType");
  const filterTherapist = document.getElementById("filterTherapist");
  const filterStatus = document.getElementById("filterStatus");
  const filterDate = document.getElementById("filterDate");
  const btnResetFilters = document.getElementById("btnResetFilters");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      currentPage = 1;
      renderSessionsTable();
    });
  }

  [filterType, filterTherapist, filterStatus, filterDate].forEach(el => {
    if (el) {
      el.addEventListener("change", () => {
        currentPage = 1;
        renderSessionsTable();
      });
    }
  });

  if (btnResetFilters) {
    btnResetFilters.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (filterType) filterType.value = "all";
      if (filterTherapist) filterTherapist.value = "all";
      if (filterStatus) filterStatus.value = "all";
      if (filterDate) filterDate.value = "";
      currentStatusFilter = "all";

      document.querySelectorAll(".ts-status-tab-btn").forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-status") === "all");
      });

      currentPage = 1;
      renderSessionsTable();
      showToast("Filters reset to default.", "info");
    });
  }

  // Quick Status Tab Buttons
  document.querySelectorAll(".ts-status-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".ts-status-tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentStatusFilter = btn.getAttribute("data-status") || "all";
      currentPage = 1;
      renderSessionsTable();
    });
  });
}

/**
 * Setup Form Submission (Add and Edit)
 */
function setupFormHandlers() {
  const form = document.getElementById("sessionForm");
  const btnCancel = document.getElementById("btnCancelForm");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const pSelect = document.getElementById("sPatient");
      const tSelect = document.getElementById("sTherapist");
      const typeSelect = document.getElementById("sTherapyType");
      const dateInput = document.getElementById("sDate");
      const timeInput = document.getElementById("sTime");
      const durationInput = document.getElementById("sDuration");
      const statusSelect = document.getElementById("sStatus");
      const exerciseInput = document.getElementById("sExercise");
      const notesInput = document.getElementById("sNotes");
      const saveBtn = document.getElementById("btnSaveSession");

      const patientId = pSelect.value;
      const patientName = pSelect.options[pSelect.selectedIndex]?.getAttribute("data-name") || pSelect.value;
      const therapistName = tSelect.value;
      const therapistRole = tSelect.options[tSelect.selectedIndex]?.getAttribute("data-role") || "Specialist";
      const therapistId = tSelect.options[tSelect.selectedIndex]?.getAttribute("data-id") || "TH-200";
      const therapyType = typeSelect.value;
      const sessionDate = dateInput.value;
      const startTime = timeInput.value || "10:00";
      const duration = parseInt(durationInput.value, 10) || 45;
      const status = statusSelect.value || "Scheduled";
      const exercise = (exerciseInput.value || "").trim() || "Mobility Assessment";
      const notes = (notesInput.value || "").trim() || "Session recorded.";

      if (!patientId || !therapistName || !therapyType || !sessionDate) {
        showToast("Please fill in all required fields (Patient, Therapist, Type, and Date).", "danger");
        return;
      }

      saveBtn.disabled = true;
      saveBtn.innerHTML = `<span>⏳</span> Saving...`;

      try {
        if (editingSessionId) {
          // UPDATE EXISTING SESSION
          const index = allSessions.findIndex(s => s.session_id === editingSessionId);
          if (index !== -1) {
            allSessions[index] = {
              ...allSessions[index],
              patient_id: patientId,
              patient_name: patientName,
              therapist_id: therapistId,
              therapist_name: therapistName,
              therapist_role: therapistRole,
              therapy_type: therapyType,
              session_date: sessionDate,
              start_time: startTime,
              duration_minutes: duration,
              status: status,
              exercise: exercise,
              notes: notes
            };

            // Call API if available
            try {
              if (typeof apiRequest === "function") {
                await apiRequest(`/api/therapy-sessions/${editingSessionId}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(allSessions[index])
                });
              }
            } catch (err) {}

            persistSessionsLocally(allSessions);
            showToast(`Therapy session #${editingSessionId} updated successfully!`, "success");
          }
        } else {
          // CREATE NEW SESSION
          const newId = "TS-" + Math.floor(1000 + Math.random() * 9000);
          const newSession = {
            session_id: newId,
            patient_id: patientId,
            patient_name: patientName,
            therapist_id: therapistId,
            therapist_name: therapistName,
            therapist_role: therapistRole,
            therapy_type: therapyType,
            session_date: sessionDate,
            start_time: startTime,
            duration_minutes: duration,
            status: status,
            exercise: exercise,
            notes: notes
          };

          allSessions.unshift(newSession);

          // Call API if available
          try {
            if (typeof apiRequest === "function") {
              await apiRequest("/api/therapy-sessions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newSession)
              });
            }
          } catch (err) {}

          persistSessionsLocally(allSessions);
          showToast(`Therapy session #${newId} scheduled successfully!`, "success");
        }

        // Reset and refresh
        resetForm();
        updateKpiMetrics();
        renderSessionsTable();

      } catch (err) {
        showToast(err.message || "Failed to save session.", "danger");
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<span>💾</span> <span id="btnSaveText">Save Session</span>`;
      }
    });
  }

  if (btnCancel) {
    btnCancel.addEventListener("click", () => {
      resetForm();
    });
  }
}

/**
 * Edit Session: load data into left form
 */
window.editSession = function(sessionId) {
  const session = allSessions.find(s => s.session_id === sessionId);
  if (!session) return;

  editingSessionId = sessionId;

  // Show editing banner
  const banner = document.getElementById("editingBanner");
  const bannerText = document.getElementById("editingBannerText");
  if (banner) banner.style.display = "flex";
  if (bannerText) bannerText.textContent = `Editing Session #${session.session_id} (${session.patient_name})`;

  // Update Form Title and Save button text
  const formTitle = document.getElementById("formCardTitle");
  const saveText = document.getElementById("btnSaveText");
  if (formTitle) formTitle.textContent = "Edit Therapy Session";
  if (saveText) saveText.textContent = "Update Session";

  // Fill inputs
  const pSelect = document.getElementById("sPatient");
  const tSelect = document.getElementById("sTherapist");
  const typeSelect = document.getElementById("sTherapyType");
  const dateInput = document.getElementById("sDate");
  const timeInput = document.getElementById("sTime");
  const durationInput = document.getElementById("sDuration");
  const statusSelect = document.getElementById("sStatus");
  const exerciseInput = document.getElementById("sExercise");
  const notesInput = document.getElementById("sNotes");

  if (pSelect) pSelect.value = session.patient_id;
  if (tSelect) tSelect.value = session.therapist_name;
  if (typeSelect) typeSelect.value = session.therapy_type;
  if (dateInput) dateInput.value = session.session_date;
  if (timeInput) timeInput.value = session.start_time;
  if (durationInput) durationInput.value = session.duration_minutes;
  if (statusSelect) statusSelect.value = session.status;
  if (exerciseInput) exerciseInput.value = session.exercise;
  if (notesInput) notesInput.value = session.notes;

  focusAddForm();
};

/**
 * Reset form back to Add mode
 */
function resetForm() {
  editingSessionId = null;
  const form = document.getElementById("sessionForm");
  if (form) form.reset();

  // Reset date to today
  const sDateInput = document.getElementById("sDate");
  if (sDateInput) sDateInput.value = new Date().toISOString().split("T")[0];

  const banner = document.getElementById("editingBanner");
  if (banner) banner.style.display = "none";

  const formTitle = document.getElementById("formCardTitle");
  const saveText = document.getElementById("btnSaveText");
  if (formTitle) formTitle.textContent = "Add Therapy Session";
  if (saveText) saveText.textContent = "Save Session";
}

/**
 * View Session in Detailed Modal
 */
window.viewSession = function(sessionId) {
  const session = allSessions.find(s => s.session_id === sessionId);
  if (!session) return;

  const modalBody = document.getElementById("viewModalBody");
  if (!modalBody) return;

  const typeClass = getTypeClass(session.therapy_type);
  const statusClass = getStatusClass(session.status);

  modalBody.innerHTML = `
    <div class="d-flex align-items-center justify-content-between mb-3 pb-3 border-bottom flex-wrap gap-2">
      <div>
        <span class="ts-session-id-pill fs-6">#${escapeHtml(session.session_id)}</span>
        <div class="fw-bold fs-5 text-dark mt-1">${escapeHtml(session.therapy_type)}</div>
      </div>
      <div>
        <span class="ts-status-badge ${statusClass} fs-6">${escapeHtml(session.status)}</span>
      </div>
    </div>

    <div class="ts-modal-details-grid">
      <div class="ts-detail-item">
        <span class="ts-detail-label">Patient Name &amp; ID</span>
        <span class="ts-detail-val">👤 ${escapeHtml(session.patient_name)} (${escapeHtml(session.patient_id)})</span>
      </div>
      <div class="ts-detail-item">
        <span class="ts-detail-label">Therapist / Specialist</span>
        <span class="ts-detail-val">🧑‍⚕️ ${escapeHtml(session.therapist_name)}</span>
        <small class="text-success fw-semibold">${escapeHtml(session.therapist_role)}</small>
      </div>
      <div class="ts-detail-item">
        <span class="ts-detail-label">Scheduled Date</span>
        <span class="ts-detail-val">📅 ${formatDateDisplay(session.session_date)}</span>
      </div>
      <div class="ts-detail-item">
        <span class="ts-detail-label">Time &amp; Duration</span>
        <span class="ts-detail-val">⏰ ${formatTimeDisplay(session.start_time)} (${session.duration_minutes} Mins)</span>
      </div>
    </div>

    <div class="mb-3">
      <span class="ts-detail-label">Primary Exercise / Functional Activity</span>
      <div class="p-2 px-3 rounded-3 bg-light border fw-semibold text-dark mt-1">
        🏃 ${escapeHtml(session.exercise || 'Not specified')}
      </div>
    </div>

    <div>
      <span class="ts-detail-label">Clinical Observations &amp; Session Notes</span>
      <div class="ts-notes-callout">
        ${escapeHtml(session.notes || 'No clinical notes recorded for this session.')}
      </div>
    </div>
  `;

  // Wire Edit button inside modal
  const btnModalEdit = document.getElementById("btnModalEditSession");
  if (btnModalEdit) {
    btnModalEdit.onclick = () => {
      const modalEl = document.getElementById("viewSessionModal");
      if (modalEl && window.bootstrap && window.bootstrap.Modal) {
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();
      }
      editSession(sessionId);
    };
  }

  // Open bootstrap modal
  const viewModalEl = document.getElementById("viewSessionModal");
  if (viewModalEl && window.bootstrap && window.bootstrap.Modal) {
    const modal = new bootstrap.Modal(viewModalEl);
    modal.show();
  }
};

/**
 * Prompt Delete Confirmation Modal
 */
window.promptDeleteSession = function(sessionId) {
  const session = allSessions.find(s => s.session_id === sessionId);
  if (!session) return;

  sessionToDelete = sessionId;

  const msgEl = document.getElementById("deleteModalMessage");
  if (msgEl) {
    msgEl.innerHTML = `Are you sure you want to delete session <strong>#${escapeHtml(session.session_id)}</strong> for <strong>${escapeHtml(session.patient_name)}</strong> with <strong>${escapeHtml(session.therapist_name)}</strong>?<br><br>This clinical record will be removed permanently.`;
  }

  const deleteModalEl = document.getElementById("deleteSessionModal");
  if (deleteModalEl && window.bootstrap && window.bootstrap.Modal) {
    const modal = new bootstrap.Modal(deleteModalEl);
    modal.show();
  }
};

/**
 * Execute actual deletion
 */
async function executeDeleteSession(sessionId) {
  try {
    if (typeof apiRequest === "function") {
      await apiRequest(`/api/therapy-sessions/${sessionId}`, { method: "DELETE" }).catch(() => {});
    }

    allSessions = allSessions.filter(s => s.session_id !== sessionId);
    persistSessionsLocally(allSessions);

    if (editingSessionId === sessionId) {
      resetForm();
    }

    updateKpiMetrics();
    renderSessionsTable();
    showToast(`Therapy session #${sessionId} deleted successfully.`, "info");
  } catch (err) {
    showToast("Failed to delete session: " + err.message, "danger");
  }
}

/**
 * Focus and scroll to the add/edit form
 */
function focusAddForm() {
  const formCard = document.getElementById("sessionFormCard");
  if (formCard) {
    formCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const sPatient = document.getElementById("sPatient");
  if (sPatient) sPatient.focus();
}

/**
 * Helpers & Formatters
 */
function getInitials(name) {
  if (!name) return "PT";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getTypeClass(type) {
  if (!type) return "physio";
  const lower = type.toLowerCase();
  if (lower.includes("physio")) return "physio";
  if (lower.includes("occupational")) return "occupational";
  if (lower.includes("speech")) return "speech";
  if (lower.includes("neuro")) return "neuro";
  if (lower.includes("hydro") || lower.includes("water")) return "hydro";
  if (lower.includes("cognitive") || lower.includes("behavior")) return "cognitive";
  return "physio";
}

function getStatusClass(status) {
  if (!status) return "scheduled";
  const lower = status.toLowerCase();
  if (lower.includes("sched")) return "scheduled";
  if (lower.includes("prog")) return "in-progress";
  if (lower.includes("comp")) return "completed";
  if (lower.includes("cancel")) return "cancelled";
  return "scheduled";
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "-";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, monthIndex, day);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch (e) {
    return dateStr;
  }
}

function formatTimeDisplay(timeStr) {
  if (!timeStr) return "-";
  const parts = timeStr.split(":");
  if (parts.length >= 2) {
    let hour = parseInt(parts[0], 10);
    const minute = parts[1];
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${ampm}`;
  }
  return timeStr;
}

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Toast Notification Banner
 */
function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `ts-toast ${type}`;
  const icon = type === "success" ? "✓" : type === "danger" ? "⚠️" : "ℹ️";
  toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(15px)";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
