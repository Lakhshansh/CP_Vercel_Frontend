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

  // Load Doctors Table
  await loadDoctors();

  // Modal instance
  const modalEl = document.getElementById("doctorOtpModal");
  const otpModal = modalEl ? new bootstrap.Modal(modalEl) : null;
  let pendingDoctorToken = null;
  let pendingDoctorData = null;

  // Handle Send OTP Form
  const addForm = document.getElementById("addDoctorForm");
  const alertEl = document.getElementById("doctorAlert");
  const sendBtn = document.getElementById("btnSendDoctorOtp");

  if (addForm) {
    addForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = document.getElementById("docName").value.trim();
      const gender = document.getElementById("docGender").value;
      const specialization = document.getElementById("docSpecialization").value;
      const contact = document.getElementById("docContact").value.trim();
      const email = document.getElementById("docEmail").value.trim();

      if (!name || !gender || !specialization || !contact || !email) {
        showPageAlert("Please fill in all doctor details including gender.", "danger");
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

        // Step 2: Send OTP to doctor's email using Resend.com APIs
        let resendResult = null;
        if (otpCode && typeof sendDoctorOtpViaResend === "function") {
          sendBtn.innerHTML = `<span>📨</span> Sending OTP via Resend...`;
          resendResult = await sendDoctorOtpViaResend({
            email,
            name,
            otp: otpCode
          });
        }

        // Populate Modal
        document.getElementById("modalTargetEmail").textContent = email;
        const noticeEl = document.getElementById("modalNoticeAlert");
        const errorEl = document.getElementById("modalErrorAlert");
        const resendSuccessEl = document.getElementById("modalResendSuccessAlert");
        const inputEl = document.getElementById("doctorOtpInput");

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
            noticeEl.innerHTML = `⚠️ <strong>Resend Notice:</strong> ${escapeHtml(resendResult.error || "Could not dispatch via Resend.")} ${res.demo_otp ? "<br>Test verification OTP: <strong>" + res.demo_otp + "</strong>" : ""}`;
          }
        } else if (res.demo_otp && noticeEl) {
          if (resendSuccessEl) resendSuccessEl.hidden = true;
          noticeEl.hidden = false;
          noticeEl.innerHTML = `<strong>Note:</strong> Verification OTP is: <strong>${res.demo_otp}</strong>`;
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

  // Handle Verify OTP Button in Modal
  const verifyBtn = document.getElementById("btnVerifyDoctorOtp");
  if (verifyBtn) {
    verifyBtn.addEventListener("click", async () => {
      const otpInput = document.getElementById("doctorOtpInput");
      const errorEl = document.getElementById("modalErrorAlert");
      const otpVal = otpInput.value.trim();

      if (!otpVal || otpVal.length < 4) {
        if (errorEl) {
          errorEl.hidden = false;
          errorEl.textContent = "Please enter the valid OTP code.";
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

        // Clear form
        document.getElementById("docName").value = "";
        document.getElementById("docGender").value = "";
        document.getElementById("docSpecialization").value = "";
        document.getElementById("docContact").value = "";
        document.getElementById("docEmail").value = "";
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

  // Handle Resend OTP Button in Modal
  const resendBtn = document.getElementById("btnResendDoctorOtp");
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
            noticeEl.innerHTML = `⚠️ <strong>Resend Notice:</strong> ${escapeHtml(resendResult.error || "Email delivery failed.")} ${res.demo_otp ? "<br>New OTP: <strong>" + res.demo_otp + "</strong>" : ""}`;
          }
        } else if (res.demo_otp && noticeEl) {
          if (resendSuccessEl) resendSuccessEl.hidden = true;
          noticeEl.hidden = false;
          noticeEl.innerHTML = `<strong>Note:</strong> New OTP is: <strong>${res.demo_otp}</strong>`;
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

async function loadDoctors() {
  const tbody = document.getElementById("doctorsTableBody");
  if (!tbody) return;

  try {
    const rawUser = localStorage.getItem("currentUser");
    const user = rawUser ? JSON.parse(rawUser) : {};
    const res = await apiRequest(`/api/doctors?user_id=${encodeURIComponent(user.user_id || '')}&role=${encodeURIComponent(user.role || '')}`);

    const doctors = (res && res.doctors) ? res.doctors : [];

    if (doctors.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No doctor records found.</td></tr>`;
      return;
    }

    tbody.innerHTML = doctors.map(d => `
      <tr>
        <td><strong>${escapeHtml(d.name || '-')}</strong></td>
        <td><span class="badge bg-light text-dark border">${escapeHtml(d.gender || '-')}</span></td>
        <td>${escapeHtml(d.specialization || '-')}</td>
        <td>${escapeHtml(d.contact || '-')}</td>
        <td>${escapeHtml(d.email || '-')}</td>
        <td>
          ${d.otp_verified
            ? '<span class="verified-pill">✓ Verified</span>'
            : '<span class="not-verified-pill">Not Verified</span>'}
        </td>
        <td class="sticky-action">
          <button type="button" class="btn-delete-outline" onclick="deleteDoctor(${d.doctor_id})" title="Delete Doctor">
            Delete
          </button>
        </td>
      </tr>
    `).join("");
  } catch (err) {
    console.error("Failed to load doctors:", err);
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Failed to load doctor records.</td></tr>`;
  }
}

async function deleteDoctor(doctorId) {
  if (!confirm("Are you sure you want to delete this doctor?")) return;

  try {
    const res = await apiRequest(`/api/doctors/${doctorId}`, {
      method: "DELETE"
    });

    const alertEl = document.getElementById("doctorAlert");
    if (alertEl) {
      alertEl.hidden = false;
      alertEl.className = "alert alert-info mb-3";
      alertEl.textContent = res.message || "Doctor deleted successfully.";
      setTimeout(() => { alertEl.hidden = true; }, 4000);
    }

    await loadDoctors();
  } catch (err) {
    alert(err.message || "Failed to delete doctor.");
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
