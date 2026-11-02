/**
 * Multi Therapy - Doctor Password Recovery Client
 * Manages 3-step verification, OTP confirmation, and redirects back to doctor portal login.
 */

function showDoctorForgotMessage(message, type = "danger") {
  const el = document.getElementById("forgotMessage");
  if (!el) return;
  el.hidden = false;
  el.className = `alert alert-${type} mb-3`;
  el.textContent = message;
}

function clearDoctorForgotMessage() {
  const el = document.getElementById("forgotMessage");
  if (!el) return;
  el.hidden = true;
  el.textContent = "";
}

function setActiveDoctorStep(stepNumber) {
  for (let i = 1; i <= 3; i++) {
    const stepEl = document.getElementById(`stepIndicator${i}`);
    if (stepEl) {
      if (i === stepNumber) {
        stepEl.classList.add("active");
        stepEl.classList.remove("completed");
      } else if (i < stepNumber) {
        stepEl.classList.remove("active");
        stepEl.classList.add("completed");
      } else {
        stepEl.classList.remove("active", "completed");
      }
    }
  }
}

let savedDoctorIdentifier = "";
let savedDoctorResetToken = "";
let savedDoctorVerifiedToken = "";

document.addEventListener("DOMContentLoaded", () => {
  const step1Form = document.getElementById("step1Form");
  const step2Form = document.getElementById("step2Form");
  const step3Form = document.getElementById("step3Form");

  // Initial step 1 active
  setActiveDoctorStep(1);

  // STEP 1: Request OTP
  if (step1Form) {
    step1Form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearDoctorForgotMessage();

      const identifierInput = document.getElementById("identifier");
      const identifier = identifierInput ? identifierInput.value.trim() : "";
      if (!identifier) {
        showDoctorForgotMessage("Please enter your doctor username or registered email.");
        return;
      }

      const btn = document.getElementById("btnSendOtp");
      const originalText = btn ? btn.innerHTML : "";
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `
          <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          <span>Sending Security Code...</span>
        `;
      }

      try {
        const res = await apiRequest("/api/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier })
        });

        savedDoctorIdentifier = identifier;
        savedDoctorResetToken = res.reset_token || "";
        showDoctorForgotMessage(res.message || "Security code sent! Please check your doctor email inbox.", "info");

        step1Form.hidden = true;
        step2Form.hidden = false;
        setActiveDoctorStep(2);

        const otpInput = document.getElementById("otpInput");
        if (otpInput) otpInput.focus();
      } catch (err) {
        showDoctorForgotMessage(err.message || "Failed to send security code. Please check your doctor username/email.");
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      }
    });
  }

  // STEP 2: Verify OTP
  if (step2Form) {
    step2Form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearDoctorForgotMessage();

      const otpInput = document.getElementById("otpInput");
      const otp = otpInput ? otpInput.value.trim() : "";
      if (!/^[0-9]{6}$/.test(otp)) {
        showDoctorForgotMessage("Please enter a valid 6-digit security code.");
        return;
      }

      const btn = document.getElementById("btnVerifyOtp");
      const originalText = btn ? btn.innerHTML : "";
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `
          <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          <span>Verifying Security Code...</span>
        `;
      }

      try {
        const res = await apiRequest("/api/verify-reset-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            otp,
            identifier: savedDoctorIdentifier,
            reset_token: savedDoctorResetToken
          })
        });

        savedDoctorVerifiedToken = res.verified_token || "";
        showDoctorForgotMessage(res.message || "Security code confirmed successfully!", "success");

        step2Form.hidden = true;
        step3Form.hidden = false;
        setActiveDoctorStep(3);

        const newPassInput = document.getElementById("newPassword");
        if (newPassInput) newPassInput.focus();
      } catch (err) {
        showDoctorForgotMessage(err.message || "Invalid or expired security code. Please try again.");
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      }
    });
  }

  // Resend OTP
  const btnResend = document.getElementById("btnResend");
  if (btnResend) {
    btnResend.addEventListener("click", async () => {
      clearDoctorForgotMessage();
      btnResend.disabled = true;
      btnResend.textContent = "Resending...";

      try {
        const res = await apiRequest("/api/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: savedDoctorIdentifier })
        });

        savedDoctorResetToken = res.reset_token || "";
        showDoctorForgotMessage("A fresh security code has been sent to your doctor email.", "info");
      } catch (err) {
        showDoctorForgotMessage(err.message || "Failed to resend security code.");
      } finally {
        btnResend.disabled = false;
        btnResend.textContent = "Resend Code";
      }
    });
  }

  // STEP 3: Reset Password
  if (step3Form) {
    step3Form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearDoctorForgotMessage();

      const newPassInput = document.getElementById("newPassword");
      const confirmPassInput = document.getElementById("confirmPassword");
      const password = newPassInput ? newPassInput.value : "";
      const confirm = confirmPassInput ? confirmPassInput.value : "";

      if (password.length < 6) {
        showDoctorForgotMessage("Password must be at least 6 characters.");
        return;
      }

      if (password !== confirm) {
        showDoctorForgotMessage("Passwords do not match. Please re-enter.");
        return;
      }

      const btn = document.getElementById("btnResetPassword");
      const originalText = btn ? btn.innerHTML : "";
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `
          <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          <span>Updating Credentials...</span>
        `;
      }

      try {
        const res = await apiRequest("/api/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            password,
            confirm_password: confirm,
            verified_token: savedDoctorVerifiedToken
          })
        });

        showDoctorForgotMessage(res.message || "Credentials updated successfully! Redirecting to Doctor Portal Login...", "success");
        setTimeout(() => {
          window.location.href = "./doctor-login.html";
        }, 1200);
      } catch (err) {
        showDoctorForgotMessage(err.message || "Failed to update password. Please try again.");
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      }
    });
  }
});

