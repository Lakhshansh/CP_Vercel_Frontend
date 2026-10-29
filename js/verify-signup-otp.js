document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  let email = urlParams.get("email") || sessionStorage.getItem("signup_pending_email") || "";
  let name = sessionStorage.getItem("signup_pending_name") || "";
  const flashMessage = sessionStorage.getItem("signup_flash_message") || "OTP sent to your email.";
  const resendStatusRaw = sessionStorage.getItem("signup_resend_status");

  // DOM Elements
  const userEmailText = document.getElementById("userEmailText");
  const otpInput = document.getElementById("emailOtpInput");
  const otpAlert = document.getElementById("otpAlert");
  const verifyForm = document.getElementById("verifyOtpForm");
  const btnVerify = document.getElementById("btnVerify");
  const btnResend = document.getElementById("btnResend");

  // Always ensure demo OTP, test OTP notes, and banners are permanently removed from DOM and storage
  sessionStorage.removeItem("signup_demo_otp");
  sessionStorage.removeItem("signup_flash_message");
  document.querySelectorAll(".test-otp, #demoOtpBanner, #topFlashBanner, .demo-otp-banner, [id*='demoOtp']").forEach(el => el.remove());

  // Populate target email display
  if (userEmailText) {
    userEmailText.textContent = email || "your registered email";
  }

  // Show status alert if arriving from signup
  if (resendStatusRaw && otpAlert) {
    try {
      const resendStatus = JSON.parse(resendStatusRaw);
      if (resendStatus && resendStatus.success) {
        showAlert(`Verification OTP sent to ${email}. Please check your inbox or spam folder.`, "success");
      } else if (resendStatus && !resendStatus.success) {
        showAlert(resendStatus.error || "Unable to deliver email.", "warning");
      }
      sessionStorage.removeItem("signup_resend_status");
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Numeric only for OTP input
  if (otpInput) {
    otpInput.addEventListener("input", function () {
      this.value = this.value.replace(/[^0-9]/g, "");
    });
  }

  function showAlert(msg, type = "danger") {
    if (!otpAlert) return;

    otpAlert.hidden = false;
    otpAlert.className = `alert alert-${type} mb-3`;

    otpAlert.textContent = String(msg || "Please check your email.");
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

  // Handle Send / Resend OTP to Email
  if (btnResend) {
    btnResend.addEventListener("click", async () => {
      const targetEmail = email || "";
      if (!targetEmail) {
        showAlert("No registered email address found. Please register on the Signup page.", "warning");
        return;
      }

      btnResend.disabled = true;
      btnResend.innerHTML = `<span>⏳</span> Sending OTP to email...`;

      try {
        // Request OTP code generation from backend API
        let response;
        if (typeof requestOtpAuth === "function") {
          response = await requestOtpAuth({ email: targetEmail });
        } else {
          response = await apiRequest("/api/resend-signup-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: targetEmail })
          });
        }

        const otpCode = response.otp;

        // Deliver OTP code exclusively to email
        let deliveryResult = null;
        const sendOtpFn = (typeof sendOtpAuthEmail === "function") ? sendOtpAuthEmail : (typeof sendSignupOtpViaResend === "function" ? sendSignupOtpViaResend : null);

        if (otpCode && sendOtpFn) {
          deliveryResult = await sendOtpFn({
            email: targetEmail,
            name: name || "Doctor",
            otp: otpCode
          });
        }

        if (deliveryResult && deliveryResult.success) {
          showAlert(`6-digit OTP code has been sent directly to your email (${targetEmail}). Please check your inbox or spam folder.`, "success");
        } else if (deliveryResult && !deliveryResult.success) {
          showAlert(deliveryResult.error || "Email delivery failed.", "warning");
        } else {
          showAlert(
            "Please check your email for the verification code.",
            "success"
          );
        }

        if (otpInput) {
          otpInput.value = "";
          otpInput.focus();
        }
      } catch (err) {
        showAlert(err.message || "Failed to send OTP to email. Please try again.", "danger");
      } finally {
        btnResend.disabled = false;
        btnResend.innerHTML = `📧 Send OTP to Email`;
      }
    });
  }

  // Handle Verify Submission
  if (verifyForm) {
    verifyForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const otp = otpInput ? otpInput.value.trim() : "";
      if (!/^[0-9]{6}$/.test(otp)) {
        showAlert("Please enter a valid 6-digit OTP code.", "danger");
        return;
      }

      const targetEmail = email || "";
      if (!targetEmail) {
        showAlert("Email address is missing. Please go back to Signup.", "danger");
        return;
      }

      if (btnVerify) {
        btnVerify.disabled = true;
        btnVerify.textContent = "Verifying code...";
      }

      try {
        let response;
        if (typeof verifyOtpAuth === "function") {
          response = await verifyOtpAuth({ email: targetEmail, otp: otp });
        } else {
          response = await apiRequest("/api/verify-signup-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email_otp: otp,
              email: targetEmail
            })
          });
        }

        showAlert(response.message || "🎉 Account verified & created successfully! Redirecting to login...", "success");

        // Clear temporary signup storage
        sessionStorage.removeItem("signup_pending_email");
        sessionStorage.removeItem("signup_pending_name");
        sessionStorage.removeItem("signup_demo_otp");
        sessionStorage.removeItem("signup_flash_message");
        sessionStorage.removeItem("signup_resend_status");

        setTimeout(() => {
          window.location.href = "./index.html";
        }, 1800);
      } catch (err) {
        showAlert(err.message || "Failed to verify OTP. Please try again.", "danger");
        if (btnVerify) {
          btnVerify.disabled = false;
          btnVerify.textContent = "✅ Verify & Create Account";
        }
      }
    });
  }
});
