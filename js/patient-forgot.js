/**
 * Multi Therapy - Patient Password Recovery Client
 * Manages 3-step verification, OTP confirmation, and redirects back to patient login.
 */

function showPatientForgotMessage(message, type = "danger") {
  const el = document.getElementById("forgotMessage");
  if (!el) return;
  el.hidden = false;
  el.className = `alert alert-${type} mb-3`;
  el.textContent = message;
}

function clearPatientForgotMessage() {
  const el = document.getElementById("forgotMessage");
  if (!el) return;
  el.hidden = true;
  el.textContent = "";
}

function setActivePatientStep(stepNumber) {
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

let savedPatientIdentifier = "";
let savedPatientResetToken = "";
let savedPatientVerifiedToken = "";

document.addEventListener("DOMContentLoaded", () => {
  const step1Form = document.getElementById("step1Form");
  const step2Form = document.getElementById("step2Form");
  const step3Form = document.getElementById("step3Form");

  // Initial step 1 active
  setActivePatientStep(1);

  // STEP 1: Request OTP
  if (step1Form) {
    step1Form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearPatientForgotMessage();

      const identifierInput = document.getElementById("identifier");
      const identifier = identifierInput ? identifierInput.value.trim() : "";
      if (!identifier) {
        showPatientForgotMessage("Please enter your patient username or registered email.");
        return;
      }

      const btn = document.getElementById("btnSendOtp");
      const originalText = btn ? btn.innerHTML : "";
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `
          <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          <span>Sending Recovery Code...</span>
        `;
      }

      try {
        const res = await apiRequest("/api/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier })
        });

        savedPatientIdentifier = identifier;
        savedPatientResetToken = res.reset_token || "";
        showPatientForgotMessage(res.message || "Recovery code sent! Please check your email inbox.", "info");

        step1Form.hidden = true;
        step2Form.hidden = false;
        setActivePatientStep(2);

        const otpInput = document.getElementById("otpInput");
        if (otpInput) otpInput.focus();
      } catch (err) {
        showPatientForgotMessage(err.message || "Failed to send recovery code. Please check your patient username/email.");
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
      clearPatientForgotMessage();

      const otpInput = document.getElementById("otpInput");
      const otp = otpInput ? otpInput.value.trim() : "";
      if (!/^[0-9]{6}$/.test(otp)) {
        showPatientForgotMessage("Please enter a valid 6-digit verification code.");
        return;
      }

      const btn = document.getElementById("btnVerifyOtp");
      const originalText = btn ? btn.innerHTML : "";
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `
          <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          <span>Verifying Code...</span>
        `;
      }

      try {
        const res = await apiRequest("/api/verify-reset-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            otp,
            identifier: savedPatientIdentifier,
            reset_token: savedPatientResetToken
          })
        });

        savedPatientVerifiedToken = res.verified_token || "";
        showPatientForgotMessage(res.message || "Verification code confirmed successfully!", "success");

        step2Form.hidden = true;
        step3Form.hidden = false;
        setActivePatientStep(3);

        const newPassInput = document.getElementById("newPassword");
        if (newPassInput) newPassInput.focus();
      } catch (err) {
        showPatientForgotMessage(err.message || "Invalid or expired recovery code. Please try again.");
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
      clearPatientForgotMessage();
      btnResend.disabled = true;
      btnResend.textContent = "Resending...";

      try {
        const res = await apiRequest("/api/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: savedPatientIdentifier })
        });

        savedPatientResetToken = res.reset_token || "";
        showPatientForgotMessage("A fresh recovery code has been sent to your email.", "info");
      } catch (err) {
        showPatientForgotMessage(err.message || "Failed to resend code.");
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
      clearPatientForgotMessage();

      const newPassInput = document.getElementById("newPassword");
      const confirmPassInput = document.getElementById("confirmPassword");
      const password = newPassInput ? newPassInput.value : "";
      const confirm = confirmPassInput ? confirmPassInput.value : "";

      if (password.length < 6) {
        showPatientForgotMessage("Password must be at least 6 characters.");
        return;
      }

      if (password !== confirm) {
        showPatientForgotMessage("Passwords do not match. Please re-enter.");
        return;
      }

      const btn = document.getElementById("btnResetPassword");
      const originalText = btn ? btn.innerHTML : "";
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `
          <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          <span>Updating Password...</span>
        `;
      }

      try {
        const res = await apiRequest("/api/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            password,
            confirm_password: confirm,
            verified_token: savedPatientVerifiedToken
          })
        });

        showPatientForgotMessage(res.message || "Password updated successfully! Redirecting to Patient Login...", "success");
        setTimeout(() => {
          window.location.href = "./login.html";
        }, 1200);
      } catch (err) {
        showPatientForgotMessage(err.message || "Failed to update password. Please try again.");
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      }
    });
  }
});

