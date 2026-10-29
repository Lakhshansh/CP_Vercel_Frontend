document.addEventListener("DOMContentLoaded", async () => {
  // Check auth
  const rawUser = localStorage.getItem("currentUser");
  let user = null;
  if (rawUser) {
    try { user = JSON.parse(rawUser); } catch (e) { user = null; }
  }

  if (!user) {
    window.location.href = "./index.html";
    return;
  }

  // Populate Navbar
  if (typeof renderNavbarUser === "function") {
    renderNavbarUser(user);
  }

  // Logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try { await apiRequest("/api/logout", { method: "POST" }); } catch (e) {}
      localStorage.removeItem("currentUser");
      window.location.href = "./index.html";
    });
  }

  // Load Therapists Table
  await loadTherapists();

  // Modal instance & Pending OTP state
  const modalEl = document.getElementById("therapistOtpModal");
  const otpModal = modalEl ? new bootstrap.Modal(modalEl) : null;
  let pendingTherapistData = null;
  let pendingOtpCode = null;
  let pendingOtpExpires = 0;

  // Handle Add Therapist Form (Sends OTP via Resend)
  const addForm = document.getElementById("addTherapistForm");
  const alertEl = document.getElementById("therapistAlert");
  const sendBtn = document.getElementById("btnSendTherapistOtp") || document.getElementById("btnAddTherapist");

  if (addForm) {
    addForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = document.getElementById("tName").value.trim();
      const specialization = document.getElementById("tSpecialization").value.trim();
      const contact = document.getElementById("tContact").value.trim();
      const email = document.getElementById("tEmail").value.trim();

      if (!name || !specialization || !contact || !email) {
        showPageAlert("Please fill in all therapist details including email address.", "danger");
        return;
      }

      if (contact.length !== 10 || !/^\d+$/.test(contact)) {
        showPageAlert("Contact number must contain exactly 10 digits.", "danger");
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showPageAlert("Please enter a valid email address.", "danger");
        return;
      }

      pendingTherapistData = {
        name,
        specialization,
        contact,
        email,
        user_id: user.user_id
      };

      // Generate 6-digit OTP code (valid for 10 minutes)
      pendingOtpCode = Math.floor(100000 + Math.random() * 900000).toString();
      pendingOtpExpires = Date.now() + 10 * 60 * 1000;

      if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.innerHTML = `<span>⏳</span> Sending OTP via Resend...`;
      }

      try {
        let resendResult = null;
        if (typeof sendTherapistOtpViaResend === "function") {
          resendResult = await sendTherapistOtpViaResend({
            email,
            name,
            otp: pendingOtpCode
          });
        }

        // Populate Modal
        const modalEmailEl = document.getElementById("modalTargetEmail");
        if (modalEmailEl) modalEmailEl.textContent = email;

        const noticeEl = document.getElementById("modalNoticeAlert");
        const errorEl = document.getElementById("modalErrorAlert");
        const resendSuccessEl = document.getElementById("modalResendSuccessAlert");
        const inputEl = document.getElementById("therapistOtpInput");

        if (errorEl) errorEl.hidden = true;
        if (inputEl) inputEl.value = "";

        if (resendResult && resendResult.success) {
          if (resendSuccessEl) {
            resendSuccessEl.hidden = false;
            resendSuccessEl.innerHTML = `✅ <strong>Sent via Resend:</strong> Verification OTP delivered to <strong>${escapeHtml(email)}</strong>. Please check inbox/spam.`;
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
        showPageAlert(err.message || "Failed to send therapist OTP.", "danger");
      } finally {
        if (sendBtn) {
          sendBtn.disabled = false;
          sendBtn.innerHTML = `<span>📧</span> Send OTP &amp; Add Therapist`;
        }
      }
    });
  }

  // Handle Verify OTP Button in Modal
  const verifyBtn = document.getElementById("btnVerifyTherapistOtp");
  if (verifyBtn) {
    verifyBtn.addEventListener("click", async () => {
      const otpInput = document.getElementById("therapistOtpInput");
      const errorEl = document.getElementById("modalErrorAlert");
      const enteredOtp = otpInput ? otpInput.value.trim() : "";

      if (!enteredOtp || enteredOtp.length !== 6) {
        if (errorEl) {
          errorEl.hidden = false;
          errorEl.textContent = "Please enter the valid 6-digit OTP code.";
        }
        return;
      }

      if (Date.now() > pendingOtpExpires) {
        if (errorEl) {
          errorEl.hidden = false;
          errorEl.textContent = "This OTP code has expired. Please click Resend OTP.";
        }
        return;
      }

      if (enteredOtp !== pendingOtpCode) {
        if (errorEl) {
          errorEl.hidden = false;
          errorEl.textContent = "Incorrect OTP code. Please check your email and try again.";
        }
        return;
      }

      verifyBtn.disabled = true;
      verifyBtn.textContent = "Verifying & Adding...";

      try {
        const payload = {
          ...pendingTherapistData,
          otp_verified: 1
        };

        const res = await apiRequest("/api/therapists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (otpModal) otpModal.hide();
        showPageAlert(res.message || "Therapist verified and added successfully!", "success");

        // Clear form
        document.getElementById("tName").value = "";
        document.getElementById("tSpecialization").value = "";
        document.getElementById("tContact").value = "";
        document.getElementById("tEmail").value = "";
        pendingTherapistData = null;
        pendingOtpCode = null;

        await loadTherapists();
      } catch (err) {
        if (errorEl) {
          errorEl.hidden = false;
          errorEl.textContent = err.message || "Failed to add therapist record.";
        }
      } finally {
        verifyBtn.disabled = false;
        verifyBtn.textContent = "✓ Verify & Add Therapist";
      }
    });
  }

  // Handle Resend OTP Button in Modal
  const resendBtn = document.getElementById("btnResendTherapistOtp");
  if (resendBtn) {
    resendBtn.addEventListener("click", async () => {
      if (!pendingTherapistData) return;
      resendBtn.disabled = true;
      resendBtn.textContent = "Resending via Resend...";

      // Generate fresh OTP
      pendingOtpCode = Math.floor(100000 + Math.random() * 900000).toString();
      pendingOtpExpires = Date.now() + 10 * 60 * 1000;

      const noticeEl = document.getElementById("modalNoticeAlert");
      const errorEl = document.getElementById("modalErrorAlert");
      const resendSuccessEl = document.getElementById("modalResendSuccessAlert");
      if (errorEl) errorEl.hidden = true;

      try {
        let resendResult = null;
        if (typeof sendTherapistOtpViaResend === "function") {
          resendResult = await sendTherapistOtpViaResend({
            email: pendingTherapistData.email,
            name: pendingTherapistData.name,
            otp: pendingOtpCode
          });
        }

        if (resendResult && resendResult.success) {
          if (resendSuccessEl) {
            resendSuccessEl.hidden = false;
            resendSuccessEl.innerHTML = `✅ <strong>Sent via Resend:</strong> New OTP delivered to <strong>${escapeHtml(pendingTherapistData.email)}</strong>.`;
          }
          if (noticeEl) noticeEl.hidden = true;
        } else if (resendResult && !resendResult.success) {
          if (resendSuccessEl) resendSuccessEl.hidden = true;
          if (noticeEl) {
            noticeEl.hidden = false;
            noticeEl.innerHTML = `⚠️ <strong>Resend Notice:</strong> ${escapeHtml(resendResult.error || "Email delivery failed.")}`;
          }
        } else if (noticeEl) {
          noticeEl.hidden = true;
        }
      } catch (err) {
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

  // Handle Resend Settings Modal
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

  function showPageAlert(message, type = "success") {
    if (!alertEl) return;
    alertEl.hidden = false;
    alertEl.className = `alert alert-${type} mb-3`;
    alertEl.textContent = message;
    setTimeout(() => { alertEl.hidden = true; }, 5000);
  }
});

async function loadTherapists() {
  const tbody = document.getElementById("therapistsTableBody");
  if (!tbody) return;

  try {
    const rawUser = localStorage.getItem("currentUser");
    const user = rawUser ? JSON.parse(rawUser) : {};
    const res = await apiRequest(`/api/therapists?user_id=${encodeURIComponent(user.user_id || '')}&role=${encodeURIComponent(user.role || '')}`);

    const therapists = (res && res.therapists) ? res.therapists : [];

    if (therapists.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No therapist records found.</td></tr>`;
      return;
    }

    tbody.innerHTML = therapists.map(t => `
      <tr>
        <td><strong>${escapeHtml(t.name || '-')}</strong></td>
        <td>${escapeHtml(t.specialization || '-')}</td>
        <td>${escapeHtml(t.contact || '-')}</td>
        <td>${escapeHtml(t.email || '-')}</td>
        <td>
          ${t.otp_verified
            ? '<span class="verified-pill">✓ Verified</span>'
            : '<span class="not-verified-pill">Not Verified</span>'}
        </td>
        <td class="sticky-action">
          <button type="button" class="btn-delete-outline" onclick="deleteTherapist(${t.therapist_id})" title="Delete Therapist">
            Delete
          </button>
        </td>
      </tr>
    `).join("");
  } catch (err) {
    console.error("Failed to load therapists:", err);
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Failed to load therapist records.</td></tr>`;
  }
}

async function deleteTherapist(therapistId) {
  if (!confirm("Are you sure you want to delete this therapist?")) return;

  try {
    const res = await apiRequest(`/api/therapists/${therapistId}`, {
      method: "DELETE"
    });

    const alertEl = document.getElementById("therapistAlert");
    if (alertEl) {
      alertEl.hidden = false;
      alertEl.className = "alert alert-info mb-3";
      alertEl.textContent = res.message || "Therapist deleted successfully.";
      setTimeout(() => { alertEl.hidden = true; }, 4000);
    }

    await loadTherapists();
  } catch (err) {
    alert(err.message || "Failed to delete therapist.");
  }
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
