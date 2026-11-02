function showSignupMessage(message, type = "danger") {
  const el = document.getElementById("signupMessage");
  if (!el) return;
  el.hidden = false;
  el.className = `patient-alert alert-${type}`;
  el.textContent = message;
  // Scroll message smoothly into view if needed
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function generateCaptcha() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = "";
  for (let i = 0; i < 5; i++) {
    value += chars[Math.floor(Math.random() * chars.length)];
  }
  sessionStorage.setItem("signup_captcha", value);
  const captchaText = document.getElementById("captchaText");
  if (captchaText) captchaText.textContent = value;
  const captchaInput = document.getElementById("captchaInput");
  if (captchaInput) captchaInput.value = "";
}

document.addEventListener("DOMContentLoaded", () => {
  generateCaptcha();

  const refreshBtn = document.getElementById("refreshCaptcha");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", generateCaptcha);
  }

  // Toggle Password Visibility
  const togglePass = document.getElementById("toggleSignupPassword");
  if (togglePass) {
    togglePass.addEventListener("click", () => {
      const input = document.getElementById("signupPassword");
      if (!input) return;
      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      togglePass.textContent = isHidden ? "🙈" : "👁️";
    });
  }

  // Toggle Confirm Password Visibility
  const toggleConfirm = document.getElementById("toggleSignupConfirm");
  if (toggleConfirm) {
    toggleConfirm.addEventListener("click", () => {
      const input = document.getElementById("signupConfirm");
      if (!input) return;
      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      toggleConfirm.textContent = isHidden ? "🙈" : "👁️";
    });
  }

  // Form submission
  const signupForm = document.getElementById("signupForm");
  if (signupForm) {
    signupForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      // Clear any prior alert message
      const alertEl = document.getElementById("signupMessage");
      if (alertEl) alertEl.hidden = true;

      // Security CAPTCHA Check (if present in DOM)
      const captchaInput = document.getElementById("captchaInput");
      if (captchaInput) {
        const enteredCaptcha = captchaInput.value.trim().toUpperCase();
        const expectedCaptcha = sessionStorage.getItem("signup_captcha");

        if (!enteredCaptcha || enteredCaptcha !== expectedCaptcha) {
          showSignupMessage("Invalid Security Verification code. Please enter the characters shown.");
          generateCaptcha();
          return;
        }
      }

      const form = event.currentTarget;
      const data = new FormData(form);

      // Extract 8 Patient Fields
      const fullName = (data.get("full_name") || "").toString().trim();
      const email = (data.get("email") || "").toString().trim();
      const phone = (data.get("phone") || "").toString().trim();
      const dob = (data.get("dob") || "").toString().trim();
      const gender = (data.get("gender") || "").toString().trim();
      const address = (data.get("address") || "").toString().trim();
      const password = (data.get("password") || "").toString();
      const confirm = (data.get("confirm_password") || "").toString();

      // Field Validations
      if (!fullName || fullName.length < 2) {
        showSignupMessage("Please enter your Full Name (minimum 2 characters).");
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        showSignupMessage("Please enter a valid email address (e.g. name@example.com).");
        return;
      }

      if (!/^[0-9]{10}$/.test(phone)) {
        showSignupMessage("Please enter a valid 10-digit mobile number.");
        return;
      }

      if (!dob) {
        showSignupMessage("Please enter your Date of Birth.");
        return;
      }

      const validGenders = ["Male", "Female", "Other", "Prefer not to say"];
      if (!gender || !validGenders.includes(gender)) {
        showSignupMessage("Please select a valid Gender option.");
        return;
      }

      if (!address || address.length < 3) {
        showSignupMessage("Please provide your Address.");
        return;
      }

      if (password.length < 6) {
        showSignupMessage("Password must be at least 6 characters in length.");
        return;
      }

      if (password !== confirm) {
        showSignupMessage("Create Password and Confirm Password do not match.");
        return;
      }

      // Terms & Conditions Check
      const agreeTerms = document.getElementById("agreeTerms");
      if (agreeTerms && !agreeTerms.checked) {
        showSignupMessage("Please accept the Terms and Conditions to proceed.");
        return;
      }

      // Set Patient Identity & Compatibility fields for Backend
      data.set("role", "patient");
      data.set("account_type", "Patient");
      data.set("full_name", fullName);
      data.set("patient_name", fullName);
      data.set("name", fullName);
      data.set("phone", phone);
      data.set("mobile", phone);
      data.set("dob", dob);
      data.set("date_of_birth", dob);
      data.set("gender", gender);
      data.set("address", address);

      // Auto-generate fallback username if backend requires it
      const defaultUsername = email.split("@")[0] || fullName.toLowerCase().replace(/[^a-z0-9]/g, "_");
      data.set("username", defaultUsername);

      const submitBtn = document.getElementById("signupSubmitBtn");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>⏳</span> Registering Patient Account...`;
      }

      try {
        const result = await apiRequest("/api/signup", {
          method: "POST",
          body: data
        });

        // Backend requires OTP verification
        if (result && result.requires_otp) {
          const emailVal = (result.email || email).toString().trim();
          const nameVal = fullName || "Patient";
          const otpCode = result.otp;

          sessionStorage.setItem("signup_pending_email", emailVal);
          sessionStorage.setItem("signup_pending_name", nameVal);
          sessionStorage.setItem("signup_pending_role", "patient");

          // Never display demo OTP in production - OTP is sent via email
          sessionStorage.removeItem("signup_demo_otp");

          // Dispatch OTP email to patient using OTP Auth API
          const sendOtpFn = (typeof sendOtpAuthEmail === "function")
            ? sendOtpAuthEmail
            : (typeof sendSignupOtpViaResend === "function" ? sendSignupOtpViaResend : null);

          if (otpCode && sendOtpFn) {
            if (submitBtn) {
              submitBtn.innerHTML = `<span>📨</span> Sending Verification Code...`;
            }

            try {
              const otpAuthResult = await sendOtpFn({
                email: emailVal,
                name: nameVal,
                otp: otpCode,
                role: "patient"
              });

              sessionStorage.setItem("signup_resend_status", JSON.stringify(otpAuthResult));

              if (otpAuthResult && otpAuthResult.success) {
                sessionStorage.setItem(
                  "signup_flash_message",
                  `✅ Verification OTP sent to ${emailVal}. Please check your inbox.`
                );
              } else if (otpAuthResult && !otpAuthResult.success) {
                sessionStorage.setItem(
                  "signup_flash_message",
                  `⚠️ Notice: ${otpAuthResult.error || "Unable to deliver OTP email."}`
                );
              }
            } catch (otpAuthErr) {
              console.warn("OTP Auth email dispatch notice:", otpAuthErr);
            }
          } else if (result.message) {
            sessionStorage.setItem("signup_flash_message", result.message);
          }

          window.location.href = `./verify-email.html?email=${encodeURIComponent(emailVal)}&role=patient`;
          return;
        }

        // Direct registration success
        showSignupMessage(result.message || "Account created successfully! Redirecting to login...", "success");

        setTimeout(() => {
          window.location.href = "./login.html";
        }, 1800);

      } catch (error) {
        showSignupMessage(error.message || "Failed to create patient account. Please check your details and try again.");
        generateCaptcha();
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>Create Patient Account</span> <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;
        }
      }
    });
  }
});
