function showForgotMessage(message, type = "danger") {
  const el = document.getElementById("forgotMessage");
  if (!el) return;
  el.hidden = false;
  el.className = `alert alert-${type} mb-3`;
  el.textContent = message;
}

function clearForgotMessage() {
  const el = document.getElementById("forgotMessage");
  if (!el) return;
  el.hidden = true;
  el.textContent = "";
}

function setActiveStep(stepNumber) {
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

let savedIdentifier = "";
let savedResetToken = "";
let savedVerifiedToken = "";

document.addEventListener("DOMContentLoaded", () => {
  const step1Form = document.getElementById("step1Form");
  const step2Form = document.getElementById("step2Form");
  const step3Form = document.getElementById("step3Form");
  const demoOtpBox = document.getElementById("demoOtpBox");

  // Initial step 1 active
  setActiveStep(1);

  // STEP 1: Request OTP
  if (step1Form) {
    step1Form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearForgotMessage();

      const identifierInput = document.getElementById("identifier");
      const identifier = identifierInput ? identifierInput.value.trim() : "";
      if (!identifier) {
        showForgotMessage("Please enter your username or registered email.");
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

        savedIdentifier = identifier;
        savedResetToken = res.reset_token || "";
        showForgotMessage(res.message || "Recovery code sent successfully!", "info");

        if (demoOtpBox) {
          demoOtpBox.hidden = true;
        }

        step1Form.hidden = true;
        step2Form.hidden = false;
        setActiveStep(2);

        const otpInput = document.getElementById("otpInput");
        if (otpInput) otpInput.focus();
      } catch (err) {
        showForgotMessage(err.message || "Failed to send recovery code. Please check your username/email.");
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
      clearForgotMessage();

      const otpInput = document.getElementById("otpInput");
      const otp = otpInput ? otpInput.value.trim() : "";
      if (!/^[0-9]{6}$/.test(otp)) {
        showForgotMessage("Please enter a valid 6-digit verification code.");
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
            identifier: savedIdentifier,
            reset_token: savedResetToken
          })
        });

        savedVerifiedToken = res.verified_token || "";
        showForgotMessage(res.message || "Verification code confirmed!", "success");
        if (demoOtpBox) demoOtpBox.hidden = true;

        step2Form.hidden = true;
        step3Form.hidden = false;
        setActiveStep(3);

        const newPassInput = document.getElementById("newPassword");
        if (newPassInput) newPassInput.focus();
      } catch (err) {
        showForgotMessage(err.message || "Invalid or expired recovery code.");
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
      clearForgotMessage();
      btnResend.disabled = true;
      btnResend.textContent = "Resending...";

      try {
        const res = await apiRequest("/api/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: savedIdentifier })
        });

        savedResetToken = res.reset_token || "";
        showForgotMessage("A fresh recovery code has been sent to your email.", "info");
        if (demoOtpBox) demoOtpBox.hidden = true;
      } catch (err) {
        showForgotMessage(err.message || "Failed to resend code.");
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
      clearForgotMessage();

      const newPassInput = document.getElementById("newPassword");
      const confirmPassInput = document.getElementById("confirmPassword");
      const password = newPassInput ? newPassInput.value : "";
      const confirm = confirmPassInput ? confirmPassInput.value : "";

      if (password.length < 6) {
        showForgotMessage("Password must be at least 6 characters.");
        return;
      }

      if (password !== confirm) {
        showForgotMessage("Passwords do not match. Please re-enter.");
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
            verified_token: savedVerifiedToken
          })
        });

        showForgotMessage(res.message || "Password updated successfully! Redirecting to login...", "success");
        setTimeout(() => {
          window.location.href = "./login.html";
        }, 1200);
      } catch (err) {
        showForgotMessage(err.message || "Failed to update password.");
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      }
    });
  }
});
