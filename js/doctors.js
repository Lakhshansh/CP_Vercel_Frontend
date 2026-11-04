/**
 * Multi Therapy - Doctors Management & Clinical Specialists Controller
 * Handles database doctor rosters, real-time metrics, live search & filtering,
 * Resend.com email OTP onboarding, and credential verifications.
 */

(function () {
  let allDoctors = [];
  let pendingDoctorToken = null;
  let pendingDoctorData = null;
  let otpModal = null;

  document.addEventListener("DOMContentLoaded", async () => {
    // 1. Authenticate user
    const rawUser = localStorage.getItem("currentUser");
    let user = null;
    if (rawUser) {
      try { user = JSON.parse(rawUser); } catch (e) { user = null; }
    }

    if (!user) {
      window.location.href = "./index.html";
      return;
    }

    // 2. Populate Navbar Profile
    if (typeof renderNavbarUser === "function") {
      renderNavbarUser(user);
    } else {
      const nameEl = document.getElementById("navUsername");
      const roleEl = document.getElementById("navRole");
      if (nameEl) nameEl.textContent = user.name || user.username || "User";
      if (roleEl) roleEl.textContent = user.role || "Admin";
    }

    // 3. Logout handler
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        try { await apiRequest("/api/logout", { method: "POST" }); } catch (e) {}
        localStorage.removeItem("currentUser");
        window.location.href = "./index.html";
      });
    }

    // 4. Notifications Bell Toggle
    const notifBtn = document.getElementById("docNotifBtn");
    const notifDropdown = document.getElementById("docNotifDropdown");
    if (notifBtn && notifDropdown) {
      notifBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        notifDropdown.classList.toggle("show");
      });

      document.addEventListener("click", (e) => {
        if (!notifDropdown.contains(e.target) && e.target !== notifBtn) {
          notifDropdown.classList.remove("show");
        }
      });
    }

    // 5. Mobile Navigation / Sidebar Toggle
    const navToggle = document.getElementById("docNavToggle");
    const mobileMenu = document.getElementById("docMobileNavMenu");
    if (navToggle && mobileMenu) {
      navToggle.addEventListener("click", () => {
        mobileMenu.classList.toggle("d-none");
      });
    }

    // 6. Modal instances
    const modalEl = document.getElementById("doctorOtpModal");
    if (modalEl && typeof bootstrap !== "undefined") {
      otpModal = new bootstrap.Modal(modalEl);
    }

    // 7. Initialize Form Submission
    initAddDoctorForm(user);

    // 8. Initialize OTP Verification Handlers
    initOtpHandlers();

    // 9. Initialize Resend Settings Modal
    initResendSettingsModal();

    // 10. Initialize Search & Filter Controls
    initFilterControls();

    // 11. Load Doctors from Backend API
    await loadDoctors();
  });

  /**
   * Fetch doctors list from backend database and refresh dashboard
   */
  async function loadDoctors() {
    const tbody = document.getElementById("doctorsTableBody");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">
        <div class="d-inline-flex align-items-center gap-2">
          <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
          <span>Loading verified doctor records from database...</span>
        </div>
      </td></tr>`;
    }

    try {
      const rawUser = localStorage.getItem("currentUser");
      const user = rawUser ? JSON.parse(rawUser) : {};
      const res = await apiRequest(`/api/doctors?user_id=${encodeURIComponent(user.user_id || '')}&role=${encodeURIComponent(user.role || '')}`);

      allDoctors = (res && Array.isArray(res.doctors)) ? res.doctors : [];

      // Update real statistics from actual database records
      updateDoctorStatistics(allDoctors);

      // Render table with filtered doctors
      filterAndRenderDoctors();
    } catch (err) {
      console.error("Failed to load doctors:", err);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">
          ⚠️ Failed to load doctor records. Please check database connectivity.
        </td></tr>`;
      }
    }
  }

  /**
   * Calculate and render real KPI statistics from database doctors
   */
  function updateDoctorStatistics(doctors) {
    const total = doctors.length;
    const verified = doctors.filter(d => Boolean(d.otp_verified)).length;
    const pending = total - verified;

    const specializations = new Set();
    doctors.forEach(d => {
      if (d.specialization && d.specialization.trim()) {
        specializations.add(d.specialization.trim());
      }
    });

    const elTotal = document.getElementById("statTotalDoctors");
    const elVerified = document.getElementById("statVerifiedDoctors");
    const elPending = document.getElementById("statPendingDoctors");
    const elSpecs = document.getElementById("statSpecializations");
    const elVerifiedPct = document.getElementById("statVerifiedPctBadge");
    const elTableCount = document.getElementById("tableCountBadge");

    if (elTotal) elTotal.textContent = total;
    if (elVerified) elVerified.textContent = verified;
    if (elPending) elPending.textContent = pending;
    if (elSpecs) elSpecs.textContent = specializations.size;

    if (elVerifiedPct) {
      const pct = total > 0 ? Math.round((verified / total) * 100) : 0;
      elVerifiedPct.textContent = `${pct}% Verified`;
    }

    if (elTableCount) {
      elTableCount.textContent = `${total} ${total === 1 ? 'Doctor' : 'Doctors'}`;
    }
  }

  /**
   * Filter and render doctors table according to search and dropdowns
   */
  function filterAndRenderDoctors() {
    const searchInput = document.getElementById("searchDoctorInput");
    const specSelect = document.getElementById("filterSpecialization");
    const statusSelect = document.getElementById("filterStatus");

    const term = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const specVal = specSelect ? specSelect.value : "all";
    const statusVal = statusSelect ? statusSelect.value : "all";

    const filtered = allDoctors.filter(d => {
      // 1. Text Search across name, specialization, contact, email
      const name = (d.name || "").toLowerCase();
      const specialization = (d.specialization || "").toLowerCase();
      const contact = (d.contact || "").toLowerCase();
      const email = (d.email || "").toLowerCase();

      const matchesSearch = !term ||
        name.includes(term) ||
        specialization.includes(term) ||
        contact.includes(term) ||
        email.includes(term);

      // 2. Specialization filter
      const matchesSpec = specVal === "all" || (d.specialization === specVal);

      // 3. Status filter
      let matchesStatus = true;
      if (statusVal === "verified") {
        matchesStatus = Boolean(d.otp_verified);
      } else if (statusVal === "pending") {
        matchesStatus = !d.otp_verified;
      }

      return matchesSearch && matchesSpec && matchesStatus;
    });

    renderDoctorsTable(filtered, term || specVal !== "all" || statusVal !== "all");
  }

  /**
   * Render doctors into the table or show improved empty state
   */
  function renderDoctorsTable(doctors, isFiltered) {
    const tbody = document.getElementById("doctorsTableBody");
    if (!tbody) return;

    if (doctors.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="doc-empty-state">
              <div class="doc-empty-illustration">
                <svg width="150" height="130" viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <defs>
                    <linearGradient id="emptyGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#eff6ff" />
                      <stop offset="100%" stop-color="#e0f2fe" />
                    </linearGradient>
                  </defs>
                  <!-- Background Glow Circle -->
                  <circle cx="80" cy="70" r="58" fill="url(#emptyGlow)" />
                  <!-- Medical Clipboard / Roster Board -->
                  <rect x="42" y="30" width="76" height="92" rx="10" fill="#ffffff" stroke="#bfdbfe" stroke-width="2.5" />
                  <rect x="62" y="22" width="36" height="14" rx="4" fill="#0d6efd" />
                  <circle cx="80" cy="28" r="3" fill="#ffffff" />
                  <!-- Cross icon on board -->
                  <rect x="76" y="48" width="8" height="24" rx="2" fill="#078B69" />
                  <rect x="68" y="56" width="24" height="8" rx="2" fill="#078B69" />
                  <!-- List item placeholder lines -->
                  <rect x="54" y="82" width="52" height="5" rx="2.5" fill="#cbd5e1" />
                  <rect x="54" y="93" width="40" height="5" rx="2.5" fill="#e2e8f0" />
                  <rect x="54" y="104" width="46" height="5" rx="2.5" fill="#e2e8f0" />
                  <!-- Stethoscope loop around clipboard -->
                  <path d="M30 65 C30 115 50 126 70 126 C85 126 95 118 100 110" stroke="#0875F9" stroke-width="3" stroke-linecap="round" fill="none" />
                  <circle cx="30" cy="62" r="5" fill="#0875F9" />
                  <circle cx="103" cy="107" r="7" fill="#ffffff" stroke="#0875F9" stroke-width="2.5" />
                  <circle cx="103" cy="107" r="3" fill="#078B69" />
                </svg>
              </div>
              <h3 class="doc-empty-title">No doctor records found</h3>
              <p class="doc-empty-subtitle">
                ${isFiltered
                  ? 'No healthcare specialists match your filter or search query. Try clearing your filters.'
                  : 'No doctors have been registered in the system yet. Onboard a certified doctor using the form above.'}
              </p>
              ${isFiltered
                ? `<button type="button" class="btn btn-outline-primary btn-sm px-3 fw-bold" onclick="window.clearDoctorFilters()">
                    <span>🔄</span> Clear Search Filters
                   </button>`
                : `<a href="#addDoctorForm" class="btn btn-primary btn-sm px-3 fw-bold">
                    <span>➕</span> Add New Doctor
                   </a>`
              }
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = doctors.map(d => {
      const initial = (d.name || "D").replace(/^Dr\.?\s*/i, "").charAt(0).toUpperCase();
      const photoUrl = d.profile_photo || d.photo;

      return `
        <tr>
          <td>
            <div class="d-flex align-items-center gap-3">
              ${photoUrl
                ? `<img src="${typeof CdnManager !== 'undefined' ? CdnManager.buildCdnUrl(photoUrl, { width: 72, height: 72, crop: 'fill' }) : photoUrl}" class="doc-cell-avatar" alt="${escapeHtml(d.name)}" onerror="this.outerHTML='<div class=\\'doc-cell-avatar\\'>${initial}</div>';">`
                : `<div class="doc-cell-avatar">${initial}</div>`
              }
              <div>
                <strong style="color: var(--doc-navy-dark); font-size: 14.5px;">${escapeHtml(d.name || '-')}</strong>
                <div style="font-size: 12px; color: #64748b;">ID: #DOC-${escapeHtml(String(d.doctor_id || '').padStart(3, '0'))}</div>
              </div>
            </div>
          </td>
          <td>
            <span class="badge bg-light text-secondary border px-2 py-1" style="font-size: 12px;">
              ${escapeHtml(d.gender || '-')}
            </span>
          </td>
          <td>
            <span class="doc-spec-badge">
              <span>🩺</span> ${escapeHtml(d.specialization || 'General Practice')}
            </span>
          </td>
          <td>
            <a href="tel:${escapeHtml(d.contact || '')}" class="text-decoration-none" style="color: #0f172a; font-weight: 600;">
              ${escapeHtml(d.contact || '-')}
            </a>
          </td>
          <td>
            <a href="mailto:${escapeHtml(d.email || '')}" class="text-decoration-none" style="color: #0284c7; font-weight: 500;">
              ${escapeHtml(d.email || '-')}
            </a>
          </td>
          <td>
            ${d.otp_verified
              ? '<span class="verified-pill">✓ Verified</span>'
              : '<span class="not-verified-pill">⏳ Pending OTP</span>'}
          </td>
          <td class="sticky-action">
            <button type="button" class="btn-delete-outline" onclick="window.deleteDoctor(${d.doctor_id})" title="Delete Doctor Record">
              <span>🗑️</span> <span>Delete</span>
            </button>
          </td>
        </tr>
      `;
    }).join("");
  }

  /**
   * Set up Search input and filter select listeners
   */
  function initFilterControls() {
    const searchInput = document.getElementById("searchDoctorInput");
    const specSelect = document.getElementById("filterSpecialization");
    const statusSelect = document.getElementById("filterStatus");
    const resetBtn = document.getElementById("btnResetFilters");

    if (searchInput) {
      searchInput.addEventListener("input", filterAndRenderDoctors);
    }

    if (specSelect) {
      specSelect.addEventListener("change", filterAndRenderDoctors);
    }

    if (statusSelect) {
      statusSelect.addEventListener("change", filterAndRenderDoctors);
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        window.clearDoctorFilters();
      });
    }

    window.clearDoctorFilters = () => {
      if (searchInput) searchInput.value = "";
      if (specSelect) specSelect.value = "all";
      if (statusSelect) statusSelect.value = "all";
      filterAndRenderDoctors();
    };
  }

  /**
   * Add Doctor Form submission and OTP generation
   */
  function initAddDoctorForm(user) {
    const addForm = document.getElementById("addDoctorForm");
    const sendBtn = document.getElementById("btnSendDoctorOtp");

    if (!addForm || !sendBtn) return;

    addForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = document.getElementById("docName").value.trim();
      const gender = document.getElementById("docGender").value;
      const specialization = document.getElementById("docSpecialization").value;
      const contact = document.getElementById("docContact").value.trim();
      const email = document.getElementById("docEmail").value.trim();

      if (!name || !gender || !specialization || !contact || !email) {
        showPageAlert("Please complete all doctor fields including gender.", "danger");
        return;
      }

      if (contact.length !== 10 || !/^\d+$/.test(contact)) {
        showPageAlert("Contact number must contain exactly 10 digits.", "danger");
        return;
      }

      pendingDoctorData = { name, gender, specialization, contact, email, user_id: user.user_id };

      sendBtn.disabled = true;
      sendBtn.innerHTML = `<span>⏳</span> Generating OTP...`;

      try {
        // Step 1: Request OTP from backend API
        const res = await apiRequest("/api/doctors/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pendingDoctorData)
        });

        pendingDoctorToken = res.doctor_token;
        const otpCode = res.demo_otp || res.otp;

        // Step 2: Send OTP via Resend.com API
        let resendResult = null;
        if (otpCode && typeof sendDoctorOtpViaResend === "function") {
          sendBtn.innerHTML = `<span>📨</span> Delivering OTP via Resend...`;
          resendResult = await sendDoctorOtpViaResend({
            email,
            name,
            otp: otpCode
          });
        }

        // Step 3: Populate and display Modal
        const targetEmailEl = document.getElementById("modalTargetEmail");
        if (targetEmailEl) targetEmailEl.textContent = email;

        const noticeEl = document.getElementById("modalNoticeAlert");
        const errorEl = document.getElementById("modalErrorAlert");
        const resendSuccessEl = document.getElementById("modalResendSuccessAlert");
        const inputEl = document.getElementById("doctorOtpInput");

        if (errorEl) errorEl.hidden = true;
        if (inputEl) inputEl.value = "";

        if (resendResult && resendResult.success) {
          if (resendSuccessEl) {
            resendSuccessEl.hidden = false;
            resendSuccessEl.innerHTML = `✅ <strong>Sent via Resend:</strong> Verification OTP delivered to <strong>${escapeHtml(email)}</strong>.`;
          }
          if (noticeEl) noticeEl.hidden = true;
        } else if (resendResult && !resendResult.success) {
          if (resendSuccessEl) resendSuccessEl.hidden = true;
          if (noticeEl) {
            noticeEl.hidden = false;
            noticeEl.innerHTML = `⚠️ <strong>Resend Notice:</strong> ${escapeHtml(resendResult.error || "Could not dispatch via Resend.")}`;
          }
        } else if (noticeEl) {
          noticeEl.hidden = true;
        }

        if (otpModal) {
          otpModal.show();
          setTimeout(() => { if (inputEl) inputEl.focus(); }, 400);
        }
      } catch (err) {
        showPageAlert(err.message || "Failed to send doctor OTP.", "danger");
      } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = `<span>📧</span> Send OTP &amp; Add Doctor`;
      }
    });
  }

  /**
   * Initialize OTP verification and Resend OTP buttons
   */
  function initOtpHandlers() {
    const verifyBtn = document.getElementById("btnVerifyDoctorOtp");
    const resendBtn = document.getElementById("btnResendDoctorOtp");

    if (verifyBtn) {
      verifyBtn.addEventListener("click", async () => {
        const otpInput = document.getElementById("doctorOtpInput");
        const errorEl = document.getElementById("modalErrorAlert");
        const otpVal = otpInput ? otpInput.value.trim() : "";

        if (!otpVal || otpVal.length < 4) {
          if (errorEl) {
            errorEl.hidden = false;
            errorEl.textContent = "Please enter the valid 6-digit OTP code.";
          }
          return;
        }

        verifyBtn.disabled = true;
        verifyBtn.textContent = "Verifying...";

        try {
          const res = await apiRequest("/api/doctors/verify-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              doctor_token: pendingDoctorToken,
              otp: otpVal
            })
          });

          if (otpModal) otpModal.hide();
          showPageAlert(res.message || "Doctor verified and added successfully!", "success");

          // Reset form fields
          const nameEl = document.getElementById("docName");
          const genderEl = document.getElementById("docGender");
          const specEl = document.getElementById("docSpecialization");
          const contactEl = document.getElementById("docContact");
          const emailEl = document.getElementById("docEmail");

          if (nameEl) nameEl.value = "";
          if (genderEl) genderEl.value = "";
          if (specEl) specEl.value = "";
          if (contactEl) contactEl.value = "";
          if (emailEl) emailEl.value = "";

          pendingDoctorToken = null;
          pendingDoctorData = null;

          await loadDoctors();
        } catch (err) {
          if (errorEl) {
            errorEl.hidden = false;
            errorEl.textContent = err.message || "OTP verification failed. Please try again.";
          }
        } finally {
          verifyBtn.disabled = false;
          verifyBtn.textContent = "✓ Verify & Add Doctor";
        }
      });
    }

    if (resendBtn) {
      resendBtn.addEventListener("click", async () => {
        if (!pendingDoctorData) return;
        resendBtn.disabled = true;
        resendBtn.textContent = "Resending via Resend...";

        try {
          const res = await apiRequest("/api/doctors/send-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(pendingDoctorData)
          });

          pendingDoctorToken = res.doctor_token;
          const otpCode = res.demo_otp || res.otp;

          const noticeEl = document.getElementById("modalNoticeAlert");
          const errorEl = document.getElementById("modalErrorAlert");
          const resendSuccessEl = document.getElementById("modalResendSuccessAlert");
          if (errorEl) errorEl.hidden = true;

          let resendResult = null;
          if (otpCode && typeof sendDoctorOtpViaResend === "function") {
            resendResult = await sendDoctorOtpViaResend({
              email: pendingDoctorData.email,
              name: pendingDoctorData.name,
              otp: otpCode
            });
          }

          if (resendResult && resendResult.success) {
            if (resendSuccessEl) {
              resendSuccessEl.hidden = false;
              resendSuccessEl.innerHTML = `✅ <strong>Sent via Resend:</strong> New OTP delivered to <strong>${escapeHtml(pendingDoctorData.email)}</strong>.`;
            }
            if (noticeEl) noticeEl.hidden = true;
          } else if (resendResult && !resendResult.success) {
            if (resendSuccessEl) resendSuccessEl.hidden = true;
            if (noticeEl) {
              noticeEl.hidden = false;
              noticeEl.innerHTML = `⚠️ <strong>Resend Notice:</strong> ${escapeHtml(resendResult.error || "Email delivery failed.")}`;
            }
          }
        } catch (err) {
          const errorEl = document.getElementById("modalErrorAlert");
          if (errorEl) {
            errorEl.hidden = false;
            errorEl.textContent = err.message || "Could not resend OTP.";
          }
        } finally {
          resendBtn.disabled = false;
          resendBtn.textContent = "🔄 Resend OTP";
        }
      });
    }
  }

  /**
   * Resend.com Settings Modal configuration
   */
  function initResendSettingsModal() {
    const resendConfigModalEl = document.getElementById("resendConfigModal");
    if (resendConfigModalEl && typeof getResendConfig === "function") {
      const inputApiKey = document.getElementById("inputResendApiKey");
      const inputFromEmail = document.getElementById("inputResendFromEmail");
      const btnSaveResend = document.getElementById("btnSaveResendConfig");
      const btnToggleKey = document.getElementById("btnToggleResendKey");
      const resendAlert = document.getElementById("resendConfigAlert");

      resendConfigModalEl.addEventListener("show.bs.modal", () => {
        const cfg = getResendConfig();
        if (inputApiKey) inputApiKey.value = cfg.apiKey || "";
        if (inputFromEmail) inputFromEmail.value = cfg.fromEmail || "";
        if (resendAlert) resendAlert.hidden = true;
      });

      if (btnToggleKey && inputApiKey) {
        btnToggleKey.addEventListener("click", () => {
          if (inputApiKey.type === "password") {
            inputApiKey.type = "text";
            btnToggleKey.textContent = "🔒";
          } else {
            inputApiKey.type = "password";
            btnToggleKey.textContent = "👁️";
          }
        });
      }

      if (btnSaveResend) {
        btnSaveResend.addEventListener("click", () => {
          const apiKey = inputApiKey ? inputApiKey.value.trim() : "";
          const fromEmail = inputFromEmail ? inputFromEmail.value.trim() : "";
          saveResendConfig(apiKey, fromEmail);

          if (resendAlert) {
            resendAlert.hidden = false;
            resendAlert.className = "alert alert-success py-2 small mb-3";
            resendAlert.textContent = "✓ Resend settings saved successfully!";
            setTimeout(() => { resendAlert.hidden = true; }, 3000);
          }
        });
      }
    }
  }

  /**
   * Global delete doctor action with confirmation
   */
  window.deleteDoctor = async function (doctorId) {
    if (!confirm("Are you sure you want to delete this doctor from the registry?")) return;

    try {
      const res = await apiRequest(`/api/doctors/${doctorId}`, {
        method: "DELETE"
      });

      showPageAlert(res.message || "Doctor deleted successfully.", "info");
      await loadDoctors();
    } catch (err) {
      alert(err.message || "Failed to delete doctor.");
    }
  };

  /**
   * Toast / Alert banner helper
   */
  function showPageAlert(message, type = "success") {
    const alertEl = document.getElementById("doctorAlert");
    if (!alertEl) return;
    alertEl.hidden = false;
    alertEl.className = `alert alert-${type} mb-4 shadow-sm border`;
    alertEl.innerHTML = `
      <div class="d-flex align-items-center justify-content-between">
        <span>${escapeHtml(message)}</span>
        <button type="button" class="btn-close" aria-label="Close" onclick="this.closest('.alert').hidden=true;"></button>
      </div>
    `;
    setTimeout(() => { alertEl.hidden = true; }, 6000);
  }

  /**
   * HTML entity escaping
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

})();
