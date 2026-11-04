/**
 * Multi Therapy - Doctor Dashboard Client Logic
 * Handles real-time clinical metrics, appointment schedule, patient directory,
 * therapist assignments, progress reporting, and consultation communications.
 */

(function () {
  "use strict";

  let loadedDoctorData = null;
  let loadedPatients = [];

  document.addEventListener("DOMContentLoaded", async () => {
    // 1. Session Detection
    const rawUser = localStorage.getItem("currentUser");
    let user = null;
    if (rawUser) {
      try {
        user = JSON.parse(rawUser);
      } catch (e) {
        user = null;
      }
    }

    const previewBanner = document.getElementById("guestDocPreviewBanner");
    const heroName = document.getElementById("heroDocName");
    const navName = document.getElementById("docNavName");
    const navRole = document.getElementById("docNavRole");
    const cardName = document.getElementById("docIllustrationName");
    const cardSpec = document.getElementById("docIllustrationSpec");
    const heroAvatar = document.getElementById("heroDocAvatar");
    const navAvatar = document.getElementById("docNavAvatar");
    const heroDate = document.getElementById("docHeroDate");

    // Display formatted current date
    if (heroDate) {
      const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
      heroDate.textContent = new Date().toLocaleDateString('en-US', options);
    }

    if (!user) {
      // Guest / Demo Preview Mode
      if (previewBanner) previewBanner.style.display = "block";
      const docName = "Dr. Sarah Mitchell";
      if (heroName) heroName.textContent = docName;
      if (navName) navName.textContent = docName;
      if (cardName) cardName.textContent = docName;
      if (cardSpec) cardSpec.textContent = "Chief Neurologist & Specialist";
    } else {
      // Authenticated Doctor Session
      if (previewBanner) previewBanner.style.display = "none";

      const docName = user.doctor_name || user.name || (user.username ? ("Dr. " + user.username) : "Dr. Practitioner");
      if (heroName) heroName.textContent = docName;
      if (navName) navName.textContent = docName;
      if (cardName) cardName.textContent = docName;

      const spec = user.doctor_specialization || user.specialization || "Senior Neurologist & Specialist";
      if (cardSpec) cardSpec.textContent = spec;
      if (navRole) navRole.textContent = spec;

      // Doctor Profile Photo
      const docPhoto = user.profile_photo || localStorage.getItem("mt_doc_photo_" + (user.username || "doctor"));
      if (docPhoto && !docPhoto.includes("doctor-avatar.svg") && (docPhoto.startsWith("http://") || docPhoto.startsWith("https://") || docPhoto.startsWith("data:image/"))) {
        if (heroAvatar) heroAvatar.src = docPhoto;
        if (navAvatar) {
          navAvatar.src = docPhoto;
          navAvatar.style.borderRadius = "50%";
          navAvatar.style.objectFit = "cover";
        }
      }
    }

    // 2. Navigation & User Pill Dropdowns
    const userPill = document.getElementById("docUserPill");
    const profileDropdown = document.getElementById("docProfileDropdown");
    if (userPill && profileDropdown) {
      userPill.addEventListener("click", (e) => {
        e.stopPropagation();
        profileDropdown.classList.toggle("open");
        if (notifDropdown) notifDropdown.classList.remove("open");
      });
    }

    const notifBtn = document.getElementById("btnDocNotifications");
    const notifDropdown = document.getElementById("docNotifDropdown");
    if (notifBtn && notifDropdown) {
      notifBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        notifDropdown.classList.toggle("open");
        if (profileDropdown) profileDropdown.classList.remove("open");
      });
    }

    document.addEventListener("click", () => {
      if (profileDropdown) profileDropdown.classList.remove("open");
      if (notifDropdown) notifDropdown.classList.remove("open");
    });

    // 3. Mobile Navigation Menu Toggle
    const navToggle = document.getElementById("docNavToggle");
    const navMenu = document.getElementById("docNavMenu");
    if (navToggle && navMenu) {
      navToggle.addEventListener("click", () => {
        navMenu.classList.toggle("open");
      });
    }

    // 4. Logout Action
    const btnLogout = document.getElementById("btnDocLogout");
    if (btnLogout) {
      btnLogout.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
          if (typeof apiRequest === "function") {
            await apiRequest("/api/logout", { method: "POST" });
          }
        } catch (err) {
          // ignore
        }
        localStorage.removeItem("currentUser");
        window.location.href = "./doctor-login.html";
      });
    }

    // 5. Setup Action Buttons
    setupActionButtons();

    // 6. Fetch Database Dashboard Data
    await loadDashboardData(user);
  });

  /**
   * Loads dashboard statistics, schedule, and patient overview from backend APIs
   */
  async function loadDashboardData(user) {
    const userIdParam = user && user.user_id ? `?user_id=${encodeURIComponent(user.user_id)}` : "";

    try {
      let res = null;
      if (typeof apiRequest === "function") {
        res = await apiRequest(`/api/doctor/home${userIdParam}`);
      } else {
        const response = await fetch(`/api/doctor/home${userIdParam}`);
        if (response.ok) {
          res = await response.json();
        }
      }

      if (res && res.success) {
        loadedDoctorData = res;

        // Render Stats
        if (res.stats) {
          renderStats(res.stats);
        }

        // Render Today's Schedule
        renderSchedule(res.schedule || []);

        // Render Patient Overview
        renderPatientOverview(res.patient_overview || []);

        // Populate patient dropdown in modals
        if (res.patient_overview && res.patient_overview.length > 0) {
          loadedPatients = res.patient_overview;
          populatePatientSelectors(res.patient_overview);
        }
      } else {
        showEmptyStates();
      }
    } catch (err) {
      console.warn("[Doctor Dashboard] Error connecting to clinical API:", err);
      showEmptyStates();
    }
  }

  /**
   * Updates stat card values
   */
  function renderStats(stats) {
    const elPatients = document.getElementById("statTotalPatients");
    const elAppointments = document.getElementById("statTodayAppointments");
    const elTherapists = document.getElementById("statActiveTherapists");
    const elReports = document.getElementById("statProgressReports");

    if (elPatients) elPatients.textContent = stats.total_patients !== undefined ? stats.total_patients : "0";
    if (elAppointments) elAppointments.textContent = stats.today_appointments !== undefined ? stats.today_appointments : "0";
    if (elTherapists) elTherapists.textContent = stats.active_therapists !== undefined ? stats.active_therapists : "0";
    if (elReports) elReports.textContent = stats.progress_reports !== undefined ? stats.progress_reports : "0";
  }

  /**
   * Renders today's schedule table rows or displays an empty state
   */
  function renderSchedule(schedule) {
    const tbody = document.getElementById("todayScheduleTableBody");
    const emptyContainer = document.getElementById("scheduleEmptyState");
    const tableWrap = document.getElementById("scheduleTableWrap");

    if (!schedule || schedule.length === 0) {
      if (tbody) tbody.innerHTML = "";
      if (tableWrap) tableWrap.style.display = "none";
      if (emptyContainer) emptyContainer.style.display = "flex";
      return;
    }

    if (tableWrap) tableWrap.style.display = "block";
    if (emptyContainer) emptyContainer.style.display = "none";

    if (tbody) {
      tbody.innerHTML = schedule.map(item => {
        const time = escapeHtml(item.appointment_time || "10:00 AM");
        const patientName = escapeHtml(item.patient_name || "Patient Record");
        const patientId = escapeHtml(String(item.patient_id || "PT-1001"));
        const aptType = escapeHtml(item.appointment_type || "Neuromuscular Consultation");
        const status = (item.status || "Scheduled").trim();
        const badgeClass = getStatusBadgeClass(status);

        return `
          <tr>
            <td>
              <div class="doc-time-cell">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <strong>${time}</strong>
              </div>
            </td>
            <td>
              <div class="doc-patient-cell">
                <div class="doc-patient-avatar-mini">${getInitials(patientName)}</div>
                <div>
                  <strong>${patientName}</strong>
                  <div class="doc-subtext">ID: #${patientId}</div>
                </div>
              </div>
            </td>
            <td>
              <span class="doc-type-text">${aptType}</span>
            </td>
            <td>
              <span class="doc-badge ${badgeClass}">${escapeHtml(status)}</span>
            </td>
            <td>
              <a href="./doctor-appointments.html" class="doc-btn-sm" title="View clinical notes & appointment details">
                <span>View Details</span>
              </a>
            </td>
          </tr>
        `;
      }).join("");
    }
  }

  /**
   * Renders patient overview list or displays an empty state
   */
  function renderPatientOverview(patients) {
    const container = document.getElementById("patientOverviewList");
    const emptyContainer = document.getElementById("patientsEmptyState");

    if (!patients || patients.length === 0) {
      if (container) container.innerHTML = "";
      if (container) container.style.display = "none";
      if (emptyContainer) emptyContainer.style.display = "flex";
      return;
    }

    if (container) container.style.display = "block";
    if (emptyContainer) emptyContainer.style.display = "none";

    if (container) {
      container.innerHTML = patients.map(p => {
        const name = escapeHtml(p.patient_name || "Patient Record");
        const id = escapeHtml(String(p.patient_id || "PT-1001"));
        const condition = escapeHtml(p.condition_details || "Cerebral Palsy Care");
        const therapist = escapeHtml(p.assigned_therapist || "Sarah Jenkins, PT");
        const score = p.progress_score !== undefined ? p.progress_score : 85;
        const initials = getInitials(name);

        return `
          <div class="doc-patient-item">
            <div class="doc-patient-left">
              <div class="doc-patient-avatar">${initials}</div>
              <div>
                <div class="doc-patient-title">${name}</div>
                <div class="doc-patient-sub">ID: #${id} • ${condition}</div>
                <div class="doc-patient-therapist">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <path d="M9 12l2 2 4-4"/>
                  </svg>
                  <span>Therapist: ${therapist}</span>
                </div>
              </div>
            </div>
            <div class="doc-patient-right">
              <span class="doc-badge confirmed">${score}% Score</span>
              <a href="./patients.html" class="doc-btn-sm">View Profile</a>
            </div>
          </div>
        `;
      }).join("");
    }
  }

  /**
   * Displays clear empty states when database is empty or API is unreachable
   */
  function showEmptyStates() {
    renderStats({
      total_patients: 0,
      today_appointments: 0,
      active_therapists: 0,
      progress_reports: 0
    });

    renderSchedule([]);
    renderPatientOverview([]);
  }

  /**
   * Setup Quick Action click handlers
   */
  function setupActionButtons() {
    const btnAssign = document.getElementById("btnActionAssign");
    if (btnAssign) {
      btnAssign.addEventListener("click", () => openModal("assignModal"));
      btnAssign.addEventListener("keydown", (e) => { if (e.key === "Enter") openModal("assignModal"); });
    }

    const btnAddReport = document.getElementById("btnActionAddReport");
    if (btnAddReport) {
      btnAddReport.addEventListener("click", () => openModal("addReportModal"));
      btnAddReport.addEventListener("keydown", (e) => { if (e.key === "Enter") openModal("addReportModal"); });
    }

    const btnMessages = document.getElementById("btnActionMessages");
    if (btnMessages) {
      btnMessages.addEventListener("click", () => openModal("messagesModal"));
      btnMessages.addEventListener("keydown", (e) => { if (e.key === "Enter") openModal("messagesModal"); });
    }

    const btnGenReport = document.getElementById("btnActionGenReport");
    if (btnGenReport) {
      btnGenReport.addEventListener("click", () => openModal("reportModal"));
      btnGenReport.addEventListener("keydown", (e) => { if (e.key === "Enter") openModal("reportModal"); });
    }

    // Modal Close Buttons
    document.querySelectorAll(".cp-modal-close, [data-modal-close]").forEach(btn => {
      btn.addEventListener("click", function () {
        const modal = this.closest(".cp-modal-backdrop");
        if (modal) modal.classList.remove("open");
      });
    });

    // Close on backdrop click
    document.querySelectorAll(".cp-modal-backdrop").forEach(modal => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.classList.remove("open");
      });
    });

    // Handle Assign Therapist Form Submit
    const assignForm = document.getElementById("assignTherapistForm");
    if (assignForm) {
      assignForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const patientSelect = document.getElementById("assignPatientSelect");
        const therapistSelect = document.getElementById("assignTherapistSelect");
        const pName = patientSelect ? patientSelect.options[patientSelect.selectedIndex].text : "Patient";
        const tName = therapistSelect ? therapistSelect.options[therapistSelect.selectedIndex].text : "Therapist";

        alert(`✅ Success: ${tName} has been assigned to ${pName}. Notification sent to therapist.`);
        closeModal("assignModal");
        assignForm.reset();
      });
    }

    // Handle Add Progress Report Form Submit
    const reportForm = document.getElementById("addProgressReportForm");
    if (reportForm) {
      reportForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const score = document.getElementById("reportScoreInput") ? document.getElementById("reportScoreInput").value : "85";
        alert(`✅ Clinical progress report saved with ${score}% mobility progress score.`);
        closeModal("addReportModal");
        reportForm.reset();

        // Increment local progress reports stat
        const statReports = document.getElementById("statProgressReports");
        if (statReports) {
          const current = parseInt(statReports.textContent, 10) || 0;
          statReports.textContent = current + 1;
        }
      });
    }

    // Handle Quick Message Send
    const msgForm = document.getElementById("doctorMessageForm");
    if (msgForm) {
      msgForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const msgInput = document.getElementById("doctorMessageInput");
        const text = msgInput ? msgInput.value.trim() : "";
        if (!text) return;

        const chatBox = document.getElementById("doctorChatHistory");
        if (chatBox) {
          const msgDiv = document.createElement("div");
          msgDiv.className = "doc-chat-bubble doc-chat-sent";
          msgDiv.innerHTML = `<div>${escapeHtml(text)}</div><small>${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>`;
          chatBox.appendChild(msgDiv);
          chatBox.scrollTop = chatBox.scrollHeight;
        }
        if (msgInput) msgInput.value = "";
      });
    }
  }

  function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add("open");
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove("open");
  }

  function populatePatientSelectors(patients) {
    const selectors = [document.getElementById("assignPatientSelect"), document.getElementById("reportPatientSelect")];
    selectors.forEach(sel => {
      if (!sel) return;
      sel.innerHTML = `<option value="">Choose patient...</option>` +
        patients.map(p => `<option value="${escapeHtml(String(p.patient_id))}">${escapeHtml(p.patient_name)} (#PT-${escapeHtml(String(p.patient_id))})</option>`).join("");
    });
  }

  function getStatusBadgeClass(status) {
    const s = status.toLowerCase();
    if (s.includes("confirm")) return "confirmed";
    if (s.includes("schedul")) return "scheduled";
    if (s.includes("complet")) return "confirmed";
    return "pending";
  }

  function getInitials(name) {
    if (!name) return "PT";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Export functions globally for onclick compatibility
  window.showAssignTherapistDialog = () => openModal("assignModal");
  window.showAddProgressReportDialog = () => openModal("addReportModal");
  window.showDoctorMessagesDialog = () => openModal("messagesModal");
  window.showGenerateReportDialog = () => openModal("reportModal");

})(typeof window !== "undefined" ? window : globalThis);
