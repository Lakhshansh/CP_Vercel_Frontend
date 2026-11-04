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

      // Direct DOM element references by ID
      const fullNameInput = document.getElementById("signupFullName");
      const emailInput = document.getElementById("signupEmail");
      const phoneInput = document.getElementById("signupPhone");
      const dobInput = document.getElementById("signupDob");
      const genderSelect = document.getElementById("signupGender");
      const addressInput = document.getElementById("signupAddress");
      const passwordInput = document.getElementById("signupPassword");
      const confirmInput = document.getElementById("signupConfirm");
      const captchaInput = document.getElementById("captchaInput");
      const agreeTermsCheck = document.getElementById("agreeTerms");

      const form = event.currentTarget;
      const data = new FormData(form);

      // Extract and trim values from DOM elements, falling back to FormData
      const fullName = (fullNameInput ? fullNameInput.value : data.get("full_name") || "").toString().trim();
      const email = (emailInput ? emailInput.value : data.get("email") || "").toString().trim();
      const phone = (phoneInput ? phoneInput.value : data.get("phone") || "").toString().trim();
      const dob = (dobInput ? dobInput.value : data.get("dob") || "").toString().trim();
      const gender = (genderSelect ? genderSelect.value : data.get("gender") || "").toString().trim();
      const address = (addressInput ? addressInput.value : data.get("address") || "").toString().trim();
      const password = (passwordInput ? passwordInput.value : data.get("password") || "").toString();
      const confirm = (confirmInput ? confirmInput.value : data.get("confirm_password") || "").toString();
      const captchaVal = (captchaInput ? captchaInput.value : data.get("captcha_code") || data.get("captcha") || "").toString().trim();

      // Field-by-Field Specific Validation (Requirement 10: Display specific missing field name instead of a generic message)
      if (!fullName) {
        showSignupMessage("Please fill all required fields: Full Name is required.");
        fullNameInput?.focus();
        return;
      }
      if (fullName.length < 2) {
        showSignupMessage("Full Name must be at least 2 characters.");
        fullNameInput?.focus();
        return;
      }

      if (!email) {
        showSignupMessage("Please fill all required fields: Email Address is required.");
        emailInput?.focus();
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showSignupMessage("Please enter a valid email address (e.g. name@example.com).");
        emailInput?.focus();
        return;
      }

      if (!phone) {
        showSignupMessage("Please fill all required fields: 10-Digit Mobile Number is required.");
        phoneInput?.focus();
        return;
      }
      if (!/^[0-9]{10}$/.test(phone)) {
        showSignupMessage("Mobile number must be exactly 10 digits.");
        phoneInput?.focus();
        return;
      }

      if (!dob) {
        showSignupMessage("Please fill all required fields: Date of Birth is required.");
        dobInput?.focus();
        return;
      }

      if (!gender) {
        showSignupMessage("Please fill all required fields: Gender is required. Please select an option.");
        genderSelect?.focus();
        return;
      }
      const validGenders = ["Male", "Female", "Other", "Prefer not to say"];
      if (!validGenders.includes(gender)) {
        showSignupMessage("Please select a valid Gender option from the list.");
        genderSelect?.focus();
        return;
      }

      if (!address) {
        showSignupMessage("Please fill all required fields: Address is required.");
        addressInput?.focus();
        return;
      }
      if (address.length < 3) {
        showSignupMessage("Address must be at least 3 characters in length.");
        addressInput?.focus();
        return;
      }

      if (!password) {
        showSignupMessage("Please fill all required fields: Create Password is required.");
        passwordInput?.focus();
        return;
      }
      if (password.length < 6) {
        showSignupMessage("Create Password must be at least 6 characters in length.");
        passwordInput?.focus();
        return;
      }

      if (!confirm) {
        showSignupMessage("Please fill all required fields: Confirm Password is required.");
        confirmInput?.focus();
        return;
      }
      if (password !== confirm) {
        showSignupMessage("Create Password and Confirm Password do not match.");
        confirmInput?.focus();
        return;
      }

      // Security CAPTCHA Check
      if (captchaInput) {
        if (!captchaVal) {
          showSignupMessage("Please fill all required fields: Security Verification code is required.");
          captchaInput.focus();
          return;
        }
        const enteredCaptcha = captchaVal.toUpperCase();
        const expectedCaptcha = (sessionStorage.getItem("signup_captcha") || "").trim().toUpperCase();

        if (enteredCaptcha !== expectedCaptcha) {
          showSignupMessage("Invalid Security Verification code. Please enter the characters shown.");
          generateCaptcha();
          captchaInput.focus();
          return;
        }
      }

      // Terms & Conditions Check
      if (agreeTermsCheck && !agreeTermsCheck.checked) {
        showSignupMessage("Please agree to the Terms and Conditions and Privacy Policy to proceed.");
        agreeTermsCheck.focus();
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
      data.set("password", password);
      data.set("confirm_password", confirm);

      // Backend route compatibility: /api/signup historically checked doctor fields
      data.set("doctor_name", fullName);
      data.set("hospital_name", "Multi Therapy Rehabilitation");
      data.set("doctor_specialization", "Patient Care");

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
