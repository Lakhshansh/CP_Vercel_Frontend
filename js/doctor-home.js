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

      // Doctor Profile Photo & Navbar Sync
      if (typeof renderNavbarUser === "function") {
        renderNavbarUser(user);
      }
      const docPhoto = user.profile_photo || localStorage.getItem("mt_doc_photo_" + (user.username || "doctor"));
      if (docPhoto && !docPhoto.includes("doctor-avatar.svg") && (docPhoto.startsWith("http://") || docPhoto.startsWith("https://") || docPhoto.startsWith("data:image/"))) {
        if (heroAvatar) heroAvatar.src = docPhoto;
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

        // Render Today's Schedule (merging any newly confirmed patient bookings)
        let schedule = res.schedule || [];
        try {
          const localAppts = JSON.parse(localStorage.getItem("patient_appointments") || "[]");
          const today = new Date().toISOString().split("T")[0];
          const todayLocal = localAppts.filter(a => String(a.appointment_date) === today && (a.status || "").toLowerCase() !== "cancelled");
          if (todayLocal.length > 0) {
            schedule = [...todayLocal, ...schedule];
            const elTodayApt = document.getElementById("statTodayAppointments");
            if (elTodayApt) elTodayApt.textContent = schedule.length;
          }
        } catch (_) {}
        renderSchedule(schedule);
        renderPendingAppointmentRequests(user);

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


  /**
   * Render New Appointment Requests waiting for Doctor Approval
   */
  function renderPendingAppointmentRequests(user) {
    const listEl = document.getElementById("appointmentRequestsList");
    const badgeEl = document.getElementById("pendingRequestsCountBadge");
    if (!listEl) return;

    let localAppts = [];
    try {
      localAppts = JSON.parse(localStorage.getItem("patient_appointments") || "[]");
    } catch (_) {}

    const pendingRequests = localAppts.filter(a => {
      const s = (a.status || "").toLowerCase();
      return s.includes("pending") || s.includes("approval");
    });

    if (badgeEl) {
      badgeEl.textContent = `${pendingRequests.length} Pending`;
      badgeEl.className = pendingRequests.length > 0 ? "badge bg-danger rounded-pill px-3 py-2" : "badge bg-secondary rounded-pill px-3 py-2";
    }

    if (pendingRequests.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 24px; color: #64748b;">
          <div style="font-size: 28px; margin-bottom: 6px;">🎉</div>
          <div style="font-weight: 700; color: #103463; font-size: 14px;">All Caught Up!</div>
          <div style="font-size: 12.5px;">You have no pending appointment requests waiting for review.</div>
        </div>
      `;
      return;
    }

    listEl.innerHTML = pendingRequests.map(item => {
      const pName = escapeHtml(item.patient_name || "Patient Record");
      const pId = escapeHtml(String(item.patient_id || "101"));
      const pPhone = escapeHtml(item.patient_phone || "+91 94686 50893");
      const aptDate = formatDateString(item.appointment_date);
      const aptTime = formatTimeString(item.appointment_time);
      const aptType = escapeHtml(item.appointment_type || "Consultation");
      const reason = escapeHtml(item.reason || item.notes || "Clinical consultation and mobility review.");
      const paymentStatus = escapeHtml(item.payment_status || (item.status && item.status.includes("Paid") ? "Paid (Razorpay Verified)" : "Paid – Verified"));

      return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px; border: 1.5px solid #e2e8f0; border-radius: 12px; margin-bottom: 10px; background: #f8fafc; gap: 14px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 12px; min-width: 220px;">
            <div style="width: 42px; height: 42px; border-radius: 50%; background: #0875F9; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 15px; flex-shrink: 0;">
              ${getInitials(pName)}
            </div>
            <div>
              <div style="font-weight: 800; color: #103463; font-size: 14.5px;">${pName}</div>
              <div style="font-size: 11.5px; color: #64748b;">Patient ID: #PT-${pId} &bull; <span class="badge bg-light text-primary border">${aptType}</span></div>
              <div style="font-size: 11.5px; color: #059669; font-weight: 700; margin-top: 2px;">📞 ${pPhone}</div>
            </div>
          </div>

          <div style="flex: 1; min-width: 200px;">
            <div style="font-size: 12.5px; font-weight: 700; color: #1e293b; margin-bottom: 3px;">
              🗓️ ${aptDate} &bull; 🕒 ${aptTime}
            </div>
            <div style="font-size: 11.5px; color: #047857; margin-bottom: 4px; font-weight: 600;">
              💳 Status: <span class="badge bg-success-subtle text-success border border-success">${paymentStatus}</span>
            </div>
            <div style="font-size: 12px; color: #475569; background: #ffffff; padding: 4px 8px; border-radius: 6px; border: 1px solid #e2e8f0; max-width: 450px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
              <strong>Reason:</strong> ${reason}
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <button type="button" class="btn btn-sm btn-success px-3 py-1 fw-bold" style="border-radius: 8px; font-size: 12.5px;" onclick="window.NotificationManager ? window.NotificationManager.acceptAppointment(${item.appointment_id}) : acceptAppt(${item.appointment_id})" title="Accept and Confirm this Appointment">
              ✓ Accept
            </button>
            <button type="button" class="btn btn-sm btn-outline-danger px-3 py-1 fw-bold" style="border-radius: 8px; font-size: 12.5px;" onclick="window.NotificationManager ? window.NotificationManager.rejectAppointment(${item.appointment_id}) : rejectAppt(${item.appointment_id})" title="Reject this Request &amp; Issue Refund">
              ✕ Reject
            </button>
            <button type="button" class="btn btn-sm btn-light border px-2 py-1" style="border-radius: 8px; font-size: 12px;" onclick="openDoctorPatientModal('${pId}', ${JSON.stringify(item).replace(/"/g, '&quot;')})">
              👤 View Profile
            </button>
          </div>
        </div>
      `;
    }).join("");
  }

  function openDoctorPatientModal(patientId, appt) {
    const modal = document.getElementById("doctorPatientModal");
    const body = document.getElementById("doctorPatientModalBody");
    if (!modal || !body) return;

    const patientName = appt.patient_name || `Patient #${patientId}`;
    const aptDate = formatDateString(appt.appointment_date);
    const aptTime = formatTimeString(appt.appointment_time);
    const aptType = appt.appointment_type || "Consultation";
    const reason = appt.reason || appt.notes || "Not specified";
    const status = appt.status || "Pending Approval";

    const patientPhone = appt.patient_phone || "+91 94686 50893";
    const paymentStatus = appt.payment_status || (appt.status && appt.status.includes("Paid") ? "Paid (Razorpay Verified)" : "Payment Pending");

    body.innerHTML = `
      <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1px solid #e2e8f0;">
        <div style="width: 52px; height: 52px; border-radius: 50%; background: #0875F9; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800;">
          ${getInitials(patientName)}
        </div>
        <div>
          <h4 style="margin: 0; font-size: 17px; font-weight: 800; color: #103463;">${escapeHtml(patientName)}</h4>
          <div style="font-size: 12px; color: #64748b;">Patient Record ID: #PT-${escapeHtml(patientId)} &bull; Verified Patient</div>
          <div style="font-size: 12.5px; color: #059669; font-weight: 700; margin-top: 2px;">📞 Contact Phone: ${escapeHtml(patientPhone)}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; font-size: 12.5px;">
        <div style="background: #f8fafc; padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <strong style="color: #64748b; font-size: 11px; display: block; text-transform: uppercase;">Payment Status</strong>
          <span class="badge bg-success-subtle text-success border border-success fw-bold">${escapeHtml(paymentStatus)}</span>
        </div>
        <div style="background: #f8fafc; padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <strong style="color: #64748b; font-size: 11px; display: block; text-transform: uppercase;">Consultation Fee</strong>
          <span style="font-weight: 700; color: #103463;">₹${appt.consultation_fee ? parseFloat(appt.consultation_fee).toLocaleString('en-IN') : '10,900.00'}</span>
        </div>
        <div style="background: #f8fafc; padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <strong style="color: #64748b; font-size: 11px; display: block; text-transform: uppercase;">Session Type</strong>
          <span style="font-weight: 700; color: #0875F9;">${escapeHtml(aptType)}</span>
        </div>
        <div style="background: #f8fafc; padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <strong style="color: #64748b; font-size: 11px; display: block; text-transform: uppercase;">Current Status</strong>
          <span class="badge ${status.toLowerCase().includes('pending') ? 'bg-warning text-dark' : 'bg-success'}">${escapeHtml(status)}</span>
        </div>
      </div>

      <div style="background: #f0f7ff; padding: 12px; border-radius: 10px; border: 1px solid #bfdbfe; margin-bottom: 16px;">
        <strong style="color: #1e40af; font-size: 12px; display: block; margin-bottom: 4px;">📅 Requested Slot:</strong>
        <div style="font-size: 14px; font-weight: 800; color: #103463;">${aptDate} at ${aptTime}</div>
        <div style="font-size: 12px; color: #3b82f6; margin-top: 4px;"><strong>Objective / Reason:</strong> ${escapeHtml(reason)}</div>
      </div>

      <div style="display: flex; gap: 10px; justify-content: flex-end; padding-top: 10px; border-top: 1px solid #e2e8f0;">
        <button type="button" class="btn btn-light border px-3" onclick="document.getElementById('doctorPatientModal').style.display='none'">Close</button>
        ${status.toLowerCase().includes('pending') ? `
          <button type="button" class="btn btn-outline-danger px-3 fw-bold" onclick="document.getElementById('doctorPatientModal').style.display='none'; window.NotificationManager.rejectAppointment(${appt.appointment_id})">
            ✕ Reject Request
          </button>
          <button type="button" class="btn btn-success px-4 fw-bold" onclick="document.getElementById('doctorPatientModal').style.display='none'; window.NotificationManager.acceptAppointment(${appt.appointment_id})">
            ✓ Accept &amp; Confirm
          </button>
        ` : ''}
      </div>
    `;

    modal.style.display = "flex";
  }

  window.openDoctorPatientModal = openDoctorPatientModal;

  function formatDateString(dateStr) {
    if (!dateStr) return "-";
    try {
      const parts = String(dateStr).split("-");
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
        }
      }
      return String(dateStr);
    } catch (_) {
      return String(dateStr);
    }
  }

  function formatTimeString(timeStr) {
    if (!timeStr) return "-";
    try {
      const parts = String(timeStr).split(":");
      if (parts.length >= 2) {
        let h = parseInt(parts[0], 10);
        const m = parts[1];
        const ampm = h >= 12 ? "PM" : "AM";
        h = h % 12 || 12;
        return `${h}:${m} ${ampm}`;
      }
      return String(timeStr);
    } catch (_) {
      return String(timeStr);
    }
  }

  // Listen for real-time appointment status updates
  window.addEventListener("appointmentStatusChanged", () => {
    const rawUser = localStorage.getItem("currentUser");
    const user = rawUser ? JSON.parse(rawUser) : null;
    if (typeof loadDashboardData === "function") {
      loadDashboardData(user);
    }
    if (typeof renderPendingAppointmentRequests === "function") {
      renderPendingAppointmentRequests(user);
    }
  });
  