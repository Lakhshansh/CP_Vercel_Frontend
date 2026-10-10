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

  // Pre-fill today's date in registration date input
  const regDateInput = document.getElementById("pRegDate");
  if (regDateInput) {
    const today = new Date().toISOString().split("T")[0];
    regDateInput.value = today;
  }

  // Load Patients
  await loadPatients();

  // Modal instance & Pending OTP state
  const modalEl = document.getElementById("patientOtpModal");
  const otpModal = modalEl ? new bootstrap.Modal(modalEl) : null;
  let pendingPatientData = null;
  let pendingOtpCode = null;
  let pendingOtpExpires = 0;

  // Handle Add Patient Form (Sends OTP via Resend)
  const addForm = document.getElementById("addPatientForm");
  const alertEl = document.getElementById("patientAlert");
  const sendBtn = document.getElementById("btnSendPatientOtp") || document.getElementById("btnAddPatient");

  if (addForm) {
    addForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = document.getElementById("pName").value.trim();
      const ageVal = document.getElementById("pAge").value;
      const age = parseInt(ageVal, 10);
      const gender = document.getElementById("pGender").value;
      const contact = document.getElementById("pContact").value.trim();
      const address = document.getElementById("pAddress").value.trim();
      const disability_details = document.getElementById("pDisability").value.trim();
      const registration_date = document.getElementById("pRegDate").value;
      const email = document.getElementById("pEmail").value.trim();

      if (!name || isNaN(age) || !gender || !contact || !address || !disability_details || !registration_date || !email) {
        showPatientAlert("Please fill in all required patient details including email.", "danger");
        return;
      }

      if (contact.length !== 10 || !/^\d+$/.test(contact)) {
        showPatientAlert("Contact number must contain exactly 10 digits.", "danger");
        return;
      }

      pendingPatientData = {
        name,
        age,
        gender,
        contact,
        address,
        disability_details,
        registration_date,
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
        if (typeof sendPatientOtpViaResend === "function") {
          resendResult = await sendPatientOtpViaResend({
            email,
            name,
            otp: pendingOtpCode
          });
        }

        // Populate Modal
        document.getElementById("modalTargetEmail").textContent = email;
        const noticeEl = document.getElementById("modalNoticeAlert");
        const errorEl = document.getElementById("modalErrorAlert");
        const resendSuccessEl = document.getElementById("modalResendSuccessAlert");
        const inputEl = document.getElementById("patientOtpInput");

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
            noticeEl.innerHTML = `⚠️ <strong>Resend Notice:</strong> ${escapeHtml(resendResult.error || "Could not dispatch via Resend.")} <br>Test verification OTP: <strong>${pendingOtpCode}</strong>`;
          }
        } else if (noticeEl) {
          if (resendSuccessEl) resendSuccessEl.hidden = true;
          noticeEl.hidden = false;
          noticeEl.innerHTML = `<strong>Note:</strong> Verification OTP is: <strong>${pendingOtpCode}</strong>`;
        }

        if (otpModal) {
          otpModal.show();
          setTimeout(() => { if (inputEl) inputEl.focus(); }, 400);
        }
      } catch (err) {
        showPatientAlert(err.message || "Failed to send patient OTP.", "danger");
      } finally {
        if (sendBtn) {
          sendBtn.disabled = false;
          sendBtn.innerHTML = `<span>📧</span> Send OTP &amp; Add Patient`;
        }
      }
    });
  }

  // Handle Verify OTP Button in Modal
  const verifyBtn = document.getElementById("btnVerifyPatientOtp");
  if (verifyBtn) {
    verifyBtn.addEventListener("click", async () => {
      const otpInput = document.getElementById("patientOtpInput");
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
          ...pendingPatientData,
          otp_verified: 1
        };

        const res = await apiRequest("/api/patients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (otpModal) otpModal.hide();
        showPatientAlert(res.message || "Patient verified and added successfully!", "success");

        // Clear form
        document.getElementById("pName").value = "";
        document.getElementById("pAge").value = "";
        document.getElementById("pGender").value = "";
        document.getElementById("pContact").value = "";
        document.getElementById("pAddress").value = "";
        document.getElementById("pDisability").value = "";
        document.getElementById("pEmail").value = "";
        pendingPatientData = null;
        pendingOtpCode = null;

        await loadPatients();
      } catch (err) {
        if (errorEl) {
          errorEl.hidden = false;
          errorEl.textContent = err.message || "Failed to add patient record.";
        }
      } finally {
        verifyBtn.disabled = false;
        verifyBtn.textContent = "✓ Verify & Add Patient";
      }
    });
  }

  // Handle Resend OTP Button in Modal
  const resendBtn = document.getElementById("btnResendPatientOtp");
  if (resendBtn) {
    resendBtn.addEventListener("click", async () => {
      if (!pendingPatientData) return;
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
        if (typeof sendPatientOtpViaResend === "function") {
          resendResult = await sendPatientOtpViaResend({
            email: pendingPatientData.email,
            name: pendingPatientData.name,
            otp: pendingOtpCode
          });
        }

        if (resendResult && resendResult.success) {
          if (resendSuccessEl) {
            resendSuccessEl.hidden = false;
            resendSuccessEl.innerHTML = `✅ <strong>Sent via Resend:</strong> New OTP delivered to <strong>${escapeHtml(pendingPatientData.email)}</strong>.`;
          }
          if (noticeEl) noticeEl.hidden = true;
        } else if (resendResult && !resendResult.success) {
          if (resendSuccessEl) resendSuccessEl.hidden = true;
          if (noticeEl) {
            noticeEl.hidden = false;
            noticeEl.innerHTML = `⚠️ <strong>Resend Notice:</strong> ${escapeHtml(resendResult.error || "Email delivery failed.")} <br>New OTP: <strong>${pendingOtpCode}</strong>`;
          }
        } else if (noticeEl) {
          if (resendSuccessEl) resendSuccessEl.hidden = true;
          noticeEl.hidden = false;
          noticeEl.innerHTML = `<strong>Note:</strong> New OTP is: <strong>${pendingOtpCode}</strong>`;
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

  function showPatientAlert(message, type = "success") {
    if (!alertEl) return;
    alertEl.hidden = false;
    alertEl.className = `alert alert-${type} mb-3`;
    alertEl.textContent = message;
    setTimeout(() => { alertEl.hidden = true; }, 5000);
  }
});

async function loadPatients() {
  const tbody = document.getElementById("patientsTableBody");
  if (!tbody) return;

  try {
    const rawUser = localStorage.getItem("currentUser");
    const user = rawUser ? JSON.parse(rawUser) : {};
    const res = await apiRequest(`/api/patients?user_id=${encodeURIComponent(user.user_id || '')}&role=${encodeURIComponent(user.role || '')}`);

    const patients = (res && res.patients) ? res.patients : [];

    if (patients.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-4">No patient records found.</td></tr>`;
      return;
    }

    tbody.innerHTML = patients.map(p => `
      <tr>
        <td><strong>${escapeHtml(p.name || '-')}</strong></td>
        <td>${p.age ?? '-'}</td>
        <td>${escapeHtml(p.gender || '-')}</td>
        <td>${escapeHtml(p.contact || '-')}</td>
        <td>${escapeHtml(p.address || '-')}</td>
        <td>${escapeHtml(p.disability_details || '-')}</td>
        <td>${escapeHtml(p.registration_date || '-')}</td>
        <td>${escapeHtml(p.email || '-')}</td>
        <td>
          ${p.otp_verified
            ? '<span class="verified-pill">✓ Verified</span>'
            : '<span class="not-verified-pill">Not Verified</span>'}
        </td>
        <td class="sticky-action">
          <button type="button" class="btn-delete-patient" onclick="deletePatient(${p.patient_id})" title="Delete Patient Record">
            🗑️ Delete
          </button>
        </td>
      </tr>
    `).join("");
  } catch (err) {
    console.error("Failed to load patients:", err);
    tbody.innerHTML = `<tr><td colspan="10" class="text-center text-danger py-4">Failed to load patient records.</td></tr>`;
  }
}

async function deletePatient(patientId) {
  if (!confirm("Are you sure you want to delete this patient record?")) return;

  try {
    const res = await apiRequest(`/api/patients/${patientId}`, {
      method: "DELETE"
    });

    const alertEl = document.getElementById("patientAlert");
    if (alertEl) {
      alertEl.hidden = false;
      alertEl.className = "alert alert-info mb-3";
      alertEl.textContent = res.message || "Patient deleted successfully.";
      setTimeout(() => { alertEl.hidden = true; }, 4000);
    }

    await loadPatients();
  } catch (err) {
    alert(err.message || "Failed to delete patient.");
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
