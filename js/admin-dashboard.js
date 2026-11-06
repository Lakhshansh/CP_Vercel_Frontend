/**
 * ============================================================================
 * Multi Therapy - Admin Analytics Dashboard Controller
 * Every Individual Deserves Better Care.
 * Dedicated, secured administration logic and real-time Chart.js visualizer
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// 1. STRICT AUTHENTICATION GUARD
// ----------------------------------------------------------------------------
(function checkAdminAuthGuard() {
  try {
    const rawUser = localStorage.getItem("currentUser");
    const adminRole = (localStorage.getItem("adminRole") || "").toLowerCase();
    const isSessionActive = sessionStorage.getItem("admin_logged_in") === "true";

    if (!rawUser && !isSessionActive) {
      window.location.replace("./admin-login.html?redirect=admin-dashboard.html");
      return;
    }

    const user = JSON.parse(rawUser || "{}");
    const role = (user.role || adminRole || "").toLowerCase();
    const username = (user.username || "").toLowerCase();
    const email = (user.email || "").toLowerCase();

    // Verify authorized single admin credentials
    const isAuthorized =
      (role === "admin" || role === "superadmin") &&
      (username === "admin" || email === "admin@multitherapy.org" || isSessionActive);

    if (!isAuthorized) {
      console.warn("[Admin Guard] Unauthorized access attempt detected. Redirecting to admin-login.html.");
      localStorage.removeItem("currentUser");
      localStorage.removeItem("adminRole");
      localStorage.removeItem("adminToken");
      sessionStorage.removeItem("admin_logged_in");
      window.location.replace("./admin-login.html?unauthorized=true");
    }
  } catch (err) {
    console.error("[Admin Guard] Error parsing session:", err);
    window.location.replace("./admin-login.html?redirect=admin-dashboard.html");
  }
})();

// Global chart references for re-rendering
let monthlyChart = null;
let apptChart = null;
let sessionChart = null;
let genderChart = null;

// Fallback demo dataset in case API is completely offline
const FALLBACK_DEMO_DATA = {
  is_live_data: false,
  data_source_label: "Demo Analytics (Database Offline)",
  summary: {
    total_patients: 148,
    total_doctors: 24,
    total_therapists: 18,
    total_appointments: 312,
    total_sessions: 428,
    pending_doctors: 4
  },
  patient_analytics: {
    gender_distribution: { Male: 82, Female: 61, Other: 5 },
    total: 148
  },
  appointment_analytics: {
    statuses: { Completed: 270, Scheduled: 28, Cancelled: 14 },
    total: 312
  },
  therapy_sessions_analytics: {
    statuses: { Completed: 395, Scheduled: 25, "In Progress": 8 },
    total: 428
  },
  monthly_registrations: [
    { month: "Jun 2026", patients: 18, doctors: 3 },
    { month: "Jul 2026", patients: 24, doctors: 4 },
    { month: "Aug 2026", patients: 31, doctors: 5 },
    { month: "Sep 2026", patients: 36, doctors: 6 },
    { month: "Oct 2026", patients: 42, doctors: 7 },
    { month: "Nov 2026", patients: 12, doctors: 2 }
  ],
  recent_activity: [
    { type: "patient", text: "New patient registered: Aarav Sharma", timeFormatted: "10 mins ago" },
    { type: "doctor", text: "Dr. Lakhshansh Joshi updated credentials", timeFormatted: "2 hours ago" },
    { type: "appointment", text: "Appointment booked for Pediatric Assessment", timeFormatted: "5 hours ago" },
    { type: "doctor", text: "Dr. Ananya Verma submitted registration certificate", timeFormatted: "1 day ago" }
  ],
  recent_patients: [
    { patient_id: 101, name: "Aarav Sharma", age: 7, gender: "Male", contact: "+91 98765 43210", created_at: new Date().toISOString() },
    { patient_id: 102, name: "Diya Patel", age: 5, gender: "Female", contact: "+91 98234 56789", created_at: new Date(Date.now() - 86400000).toISOString() },
    { patient_id: 103, name: "Vihaan Joshi", age: 11, gender: "Male", contact: "+91 94123 45678", created_at: new Date(Date.now() - 172800000).toISOString() }
  ],
  doctor_queue: [
    { doctor_id: 30018, name: "Dr. Lakhshansh Joshi", specialization: "Pediatric Physical Therapist", contact: "+91 98290 12345", email: "dr.joshi@example.com", otp_verified: 0 },
    { doctor_id: 90018, name: "Dr. Ananya Verma", specialization: "Clinical Neurologist", contact: "+91 94140 98765", email: "dr.verma@example.com", otp_verified: 0 }
  ]
};

// ----------------------------------------------------------------------------
// 2. LOGOUT HANDLER
// ----------------------------------------------------------------------------
function handleAdminLogout() {
  if (confirm("Are you sure you want to log out of the Multi Therapy Admin Portal?")) {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("adminRole");
    localStorage.removeItem("adminToken");
    sessionStorage.removeItem("admin_logged_in");
    sessionStorage.removeItem("admin_captcha");
    
    // Optional API call to log out on server if endpoint exists
    try {
      fetch("/api/logout", { method: "POST" }).catch(() => {});
    } catch (e) {}

    window.location.replace("./admin-login.html?logout=true");
  }
}

// ----------------------------------------------------------------------------
// 3. FETCH LIVE STATS & METRICS
// ----------------------------------------------------------------------------
async function fetchAdminStats() {
  try {
    const res = await fetch("/api/admin/stats", {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Cache-Control": "no-cache"
      }
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.warn("[Admin Dashboard] Could not reach /api/admin/stats:", err.message);
    return FALLBACK_DEMO_DATA;
  }
}

// ----------------------------------------------------------------------------
// 4. POPULATE DASHBOARD UI
// ----------------------------------------------------------------------------
function populateDashboardUI(data) {
  const summary = data.summary || {};

  // KPI Numbers
  const elPatients = document.getElementById("statTotalPatients");
  const elDoctors = document.getElementById("statTotalDoctors");
  const elTherapists = document.getElementById("statTotalTherapists");
  const elAppts = document.getElementById("statTotalAppointments");
  const elSessions = document.getElementById("statTotalSessions");
  const elPending = document.getElementById("statPendingDoctors");
  const elPendingBadge = document.getElementById("kpiPendingBadge");

  if (elPatients) elPatients.textContent = Number(summary.total_patients || 0).toLocaleString("en-IN");
  if (elDoctors) elDoctors.textContent = Number(summary.total_doctors || 0).toLocaleString("en-IN");
  if (elTherapists) elTherapists.textContent = Number(summary.total_therapists || 0).toLocaleString("en-IN");
  if (elAppts) elAppts.textContent = Number(summary.total_appointments || 0).toLocaleString("en-IN");
  if (elSessions) elSessions.textContent = Number(summary.total_sessions || 0).toLocaleString("en-IN");
  
  const pendingCount = summary.pending_doctors || 0;
  if (elPending) elPending.textContent = Number(pendingCount).toLocaleString("en-IN");
  if (elPendingBadge) {
    if (pendingCount > 0) {
      elPendingBadge.className = "badge-review-needed";
      elPendingBadge.textContent = `${pendingCount} Need Verification`;
    } else {
      elPendingBadge.className = "badge bg-success-subtle text-success border px-2 py-1";
      elPendingBadge.textContent = "All Doctors Verified";
    }
  }

  // Live Database Status Indicator
  const badgeDb = document.getElementById("liveDbBadge");
  const textDb = document.getElementById("liveDbStatusText");
  const sysDbName = document.getElementById("sysDbName");
  const sysLastSync = document.getElementById("sysLastSync");

  const isLive = data.is_live_data === true;
  if (badgeDb && textDb) {
    if (isLive) {
      badgeDb.classList.remove("badge-demo");
      textDb.textContent = "Live TiDB Cloud";
      badgeDb.title = "Connected to live TiDB Cloud MySQL (AWS Tokyo)";
      if (sysDbName) sysDbName.textContent = "Live TiDB Cloud MySQL (Connected)";
    } else {
      badgeDb.classList.add("badge-demo");
      textDb.textContent = data.data_source_label || "Demo Analytics (DB Offline)";
      badgeDb.title = "Database is offline or unreachable. Displaying labeled demo dataset.";
      if (sysDbName) sysDbName.textContent = "Demo Dataset (Database Offline)";
    }
  }

  if (sysLastSync) {
    sysLastSync.textContent = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  // Render Charts
  renderMonthlyRegistrationsChart(data.monthly_registrations || []);
  renderAppointmentStatusChart(data.appointment_analytics || {});
  renderSessionStatusChart(data.therapy_sessions_analytics || {});
  renderGenderDemographicsChart(data.patient_analytics || {});

  // Render Tables
  renderDoctorQueueTable(data.doctor_queue || []);
  renderRecentPatientsTable(data.recent_patients || []);

  // Render Activity
  renderActivityList(data.recent_activity || []);
}

// ----------------------------------------------------------------------------
// 5. CHART.JS VISUALIZATIONS
// ----------------------------------------------------------------------------
function renderMonthlyRegistrationsChart(monthlyData) {
  const ctx = document.getElementById("chartMonthlyReg");
  if (!ctx) return;

  const labels = monthlyData.map(d => d.month);
  const patientCounts = monthlyData.map(d => d.patients);
  const doctorCounts = monthlyData.map(d => d.doctors);

  if (monthlyChart) {
    monthlyChart.destroy();
  }

  monthlyChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Registered Patients",
          data: patientCounts,
          backgroundColor: "rgba(8, 102, 245, 0.85)",
          borderColor: "#0866f5",
          borderWidth: 1.5,
          borderRadius: 6
        },
        {
          label: "Registered Doctors",
          data: doctorCounts,
          backgroundColor: "rgba(5, 150, 105, 0.85)",
          borderColor: "#059669",
          borderWidth: 1.5,
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: { font: { family: "Plus Jakarta Sans", weight: "600", size: 12 }, boxWidth: 14 }
        },
        tooltip: {
          padding: 10,
          cornerRadius: 8,
          bodyFont: { family: "Plus Jakarta Sans" }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
            font: { family: "Plus Jakarta Sans", size: 11 }
          },
          grid: { color: "#f1f5f9" }
        },
        x: {
          ticks: { font: { family: "Plus Jakarta Sans", size: 11 } },
          grid: { display: false }
        }
      }
    }
  });
}

function renderAppointmentStatusChart(apptAnalytics) {
  const ctx = document.getElementById("chartAppointmentStatus");
  if (!ctx) return;

  const statuses = apptAnalytics.statuses || {
    Completed: apptAnalytics.completed || 0,
    Scheduled: apptAnalytics.scheduled || 0,
    Cancelled: apptAnalytics.cancelled || 0
  };

  const labels = Object.keys(statuses);
  const counts = Object.values(statuses);

  // If all zeroes, provide default placeholder
  const hasData = counts.some(c => c > 0);
  const displayLabels = hasData ? labels : ["No Records"];
  const displayCounts = hasData ? counts : [1];
  const displayColors = hasData ? ["#059669", "#0866f5", "#dc2626", "#d97706"] : ["#cbd5e1"];

  if (apptChart) {
    apptChart.destroy();
  }

  apptChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: displayLabels,
      datasets: [
        {
          data: displayCounts,
          backgroundColor: displayColors,
          borderWidth: 2,
          borderColor: "#ffffff"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { font: { family: "Plus Jakarta Sans", weight: "600", size: 12 }, boxWidth: 12 }
        }
      },
      cutout: "65%"
    }
  });
}

function renderSessionStatusChart(sessionAnalytics) {
  const ctx = document.getElementById("chartSessionStatus");
  if (!ctx) return;

  const statuses = sessionAnalytics.statuses || {
    Completed: sessionAnalytics.completed || 0,
    Scheduled: sessionAnalytics.scheduled || 0,
    "In Progress": sessionAnalytics.in_progress || 0
  };

  const labels = Object.keys(statuses);
  const counts = Object.values(statuses);

  const hasData = counts.some(c => c > 0);
  const displayLabels = hasData ? labels : ["No Sessions"];
  const displayCounts = hasData ? counts : [1];
  const displayColors = hasData ? ["#0866f5", "#7c3aed", "#0891b2", "#10b981"] : ["#cbd5e1"];

  if (sessionChart) {
    sessionChart.destroy();
  }

  sessionChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: displayLabels,
      datasets: [
        {
          data: displayCounts,
          backgroundColor: displayColors,
          borderWidth: 2,
          borderColor: "#ffffff"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { font: { family: "Plus Jakarta Sans", weight: "600", size: 12 }, boxWidth: 12 }
        }
      },
      cutout: "65%"
    }
  });
}

function renderGenderDemographicsChart(patientAnalytics) {
  const ctx = document.getElementById("chartGenderDemographics");
  if (!ctx) return;

  const dist = patientAnalytics.gender_distribution || { Male: 0, Female: 0, Other: 0 };
  const labels = Object.keys(dist);
  const counts = Object.values(dist);

  const hasData = counts.some(c => c > 0);
  const displayLabels = hasData ? labels : ["No Patients"];
  const displayCounts = hasData ? counts : [1];
  const displayColors = hasData ? ["#0866f5", "#ec4899", "#f59e0b", "#64748b"] : ["#cbd5e1"];

  if (genderChart) {
    genderChart.destroy();
  }

  genderChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: displayLabels,
      datasets: [
        {
          data: displayCounts,
          backgroundColor: displayColors,
          borderWidth: 2,
          borderColor: "#ffffff"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { font: { family: "Plus Jakarta Sans", weight: "600", size: 12 }, boxWidth: 12 }
        }
      },
      cutout: "65%"
    }
  });
}

// ----------------------------------------------------------------------------
// 6. OPERATIONAL TABLES POPULATION
// ----------------------------------------------------------------------------
function renderDoctorQueueTable(queue) {
  const tbody = document.getElementById("doctorQueueBody");
  const badgeCount = document.getElementById("badgeDoctorQueueCount");
  if (!tbody) return;

  if (!queue || queue.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-3">All medical practitioners are currently verified. No pending reviews in queue.</td></tr>`;
    if (badgeCount) badgeCount.textContent = "0 Pending";
    return;
  }

  const pendingCount = queue.filter(d => Number(d.otp_verified) !== 1).length;
  if (badgeCount) {
    badgeCount.textContent = `${pendingCount} Review Pending`;
    badgeCount.className = pendingCount > 0 ? "badge bg-warning text-dark border px-2 py-1" : "badge bg-success-subtle text-success border px-2 py-1";
  }

  tbody.innerHTML = queue.map(d => {
    const isVerified = Number(d.otp_verified) === 1;
    const badgeHtml = isVerified
      ? `<span class="status-badge badge-verified">✓ Verified</span>`
      : `<span class="status-badge badge-pending">⏳ Pending Review</span>`;

    return `
      <tr>
        <td>
          <div class="fw-bold">${escapeHtml(d.name || "Dr. Unnamed")}</div>
          <div class="text-muted small">ID: #${d.doctor_id}</div>
        </td>
        <td>
          <span class="badge bg-light text-dark border">${escapeHtml(d.specialization || "General Specialist")}</span>
        </td>
        <td>
          <div class="small fw-semibold">${escapeHtml(d.contact || "--")}</div>
          <div class="text-muted small">${escapeHtml(d.email || "--")}</div>
        </td>
        <td>${badgeHtml}</td>
      </tr>
    `;
  }).join("");
}

function renderRecentPatientsTable(patients) {
  const tbody = document.getElementById("recentPatientsBody");
  if (!tbody) return;

  if (!patients || patients.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">No patient registration records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = patients.map(p => {
    const dateStr = p.created_at
      ? new Date(p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : "Recently";

    return `
      <tr>
        <td class="text-muted fw-bold">#${p.patient_id}</td>
        <td>
          <div class="fw-bold text-dark">${escapeHtml(p.name || "Patient")}</div>
          <div class="text-muted small">${escapeHtml(p.email || "")}</div>
        </td>
        <td>
          <span>${p.age ? p.age + " yrs" : "--"}</span> / 
          <span class="fw-semibold">${escapeHtml(p.gender || "Unspecified")}</span>
        </td>
        <td class="small fw-semibold">${escapeHtml(p.contact || "--")}</td>
        <td class="small text-muted">${dateStr}</td>
      </tr>
    `;
  }).join("");
}

function renderActivityList(activities) {
  const list = document.getElementById("recentActivityList");
  if (!list) return;

  if (!activities || activities.length === 0) {
    list.innerHTML = `<li class="activity-item"><div class="activity-content"><div class="text-muted small">No recent activity recorded.</div></div></li>`;
    return;
  }

  list.innerHTML = activities.map(act => {
    let dotClass = "";
    if (act.type === "doctor") dotClass = "dot-doctor";
    else if (act.type === "appointment") dotClass = "dot-appt";
    else if (act.type === "pending") dotClass = "dot-pending";

    return `
      <li class="activity-item">
        <div class="activity-dot ${dotClass}"></div>
        <div class="activity-content">
          <div class="activity-text">${escapeHtml(act.text || "")}</div>
          <div class="activity-time">${escapeHtml(act.timeFormatted || act.time || "Just now")}</div>
        </div>
      </li>
    `;
  }).join("");
}

function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str.replace(/[&<>"']/g, function (m) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[m];
  });
}

// ----------------------------------------------------------------------------
// 7. INITIALIZATION & EVENT LISTENERS
// ----------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  // Populate Admin Name & Avatar in Header
  try {
    const rawUser = localStorage.getItem("currentUser");
    if (rawUser) {
      const user = JSON.parse(rawUser);
      const name = user.name || user.username || "Administrator";
      const headerName = document.getElementById("headerAdminName") || document.getElementById("navUsername");
      const headerAvatar = document.getElementById("headerAdminAvatar") || document.getElementById("navAvatar");
      const modalName = document.getElementById("modalAdminName");
      const modalEmail = document.getElementById("modalAdminEmail");
      const modalId = document.getElementById("modalAdminId");

      if (headerName) headerName.textContent = name;
      if (headerAvatar) headerAvatar.textContent = (name[0] || "A").toUpperCase();
      if (modalName) modalName.textContent = name;
      if (modalEmail) modalEmail.textContent = user.email || "admin@multitherapy.org";
      if (modalId && user.user_id) modalId.textContent = `#${user.user_id}`;
    }
  } catch (e) {}

  // Wire up Logout buttons
  const btnLogout = document.getElementById("btnAdminLogout") || document.getElementById("logoutBtn");
  if (btnLogout) {
    btnLogout.addEventListener("click", handleAdminLogout);
  }
  const modalBtnLogout = document.getElementById("modalBtnLogout");
  if (modalBtnLogout) {
    modalBtnLogout.addEventListener("click", handleAdminLogout);
  }

  // Wire up Admin Profile Modal
  const modalOverlay = document.getElementById("adminProfileModal");
  const btnOpenProfile = document.getElementById("btnOpenAdminProfile") || document.getElementById("userProfileBtn");
  const btnCloseProfile = document.getElementById("btnCloseAdminProfile");

  function openModal() {
    if (modalOverlay) {
      modalOverlay.classList.add("active");
      modalOverlay.setAttribute("aria-hidden", "false");
    }
  }

  function closeModal() {
    if (modalOverlay) {
      modalOverlay.classList.remove("active");
      modalOverlay.setAttribute("aria-hidden", "true");
    }
  }

  if (btnOpenProfile) btnOpenProfile.addEventListener("click", openModal);
  if (btnCloseProfile) btnCloseProfile.addEventListener("click", closeModal);
  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalOverlay && modalOverlay.classList.contains("active")) {
      closeModal();
    }
  });

  // Wire up Refresh Data button
  const btnRefresh = document.getElementById("btnRefreshData");
  const refreshIcon = document.getElementById("refreshIconSvg");

  async function loadData() {
    if (refreshIcon) refreshIcon.style.animation = "spin 1s linear infinite";
    if (btnRefresh) btnRefresh.disabled = true;

    try {
      const stats = await fetchAdminStats();
      populateDashboardUI(stats);
    } catch (err) {
      console.error("[Admin Dashboard] Failed to load statistics:", err);
      populateDashboardUI(FALLBACK_DEMO_DATA);
    } finally {
      if (refreshIcon) refreshIcon.style.animation = "";
      if (btnRefresh) btnRefresh.disabled = false;
    }
  }

  if (btnRefresh) {
    btnRefresh.addEventListener("click", loadData);
  }

  // Initial load
  await loadData();
});
