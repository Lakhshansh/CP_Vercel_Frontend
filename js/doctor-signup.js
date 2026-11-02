/**
 * Doctor Sign Up Client Logic - Multi Therapy
 * Handles doctor registration, client validations, CAPTCHA, password toggles,
 * and OTP verification flow via existing authentication endpoints.
 */

function showDoctorMessage(message, type = "danger") {
  const el = document.getElementById("doctorMessage");
  if (!el) return;
  el.hidden = false;
  el.className = `doctor-alert alert-${type}`;
  el.textContent = message;
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function generateDoctorCaptcha() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = "";
  for (let i = 0; i < 5; i++) {
    value += chars[Math.floor(Math.random() * chars.length)];
  }
  sessionStorage.setItem("doctor_signup_captcha", value);
  const captchaText = document.getElementById("captchaText");
  if (captchaText) captchaText.textContent = value;
  const captchaInput = document.getElementById("captchaInput");
  if (captchaInput) captchaInput.value = "";
}

document.addEventListener("DOMContentLoaded", () => {
  generateDoctorCaptcha();

  const refreshBtn = document.getElementById("refreshCaptcha");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", generateDoctorCaptcha);
  }

  // Toggle Create Password Visibility
  const togglePass = document.getElementById("toggleDoctorPassword");
  if (togglePass) {
    togglePass.addEventListener("click", () => {
      const input = document.getElementById("doctorPassword");
      if (!input) return;
      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      togglePass.textContent = isHidden ? "🙈" : "👁️";
    });
  }

  // Toggle Confirm Password Visibility
  const toggleConfirm = document.getElementById("toggleDoctorConfirm");
  if (toggleConfirm) {
    toggleConfirm.addEventListener("click", () => {
      const input = document.getElementById("doctorConfirm");
      if (!input) return;
      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      toggleConfirm.textContent = isHidden ? "🙈" : "👁️";
    });
  }

  // Form Submission
  const form = document.getElementById("doctorSignupForm");
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      // Clear previous message
      const alertEl = document.getElementById("doctorMessage");
      if (alertEl) alertEl.hidden = true;

      // CAPTCHA verification
      const captchaInput = document.getElementById("captchaInput");
      if (captchaInput) {
        const enteredCaptcha = captchaInput.value.trim().toUpperCase();
        const expectedCaptcha = sessionStorage.getItem("doctor_signup_captcha");
        if (!enteredCaptcha || enteredCaptcha !== expectedCaptcha) {
          showDoctorMessage("Invalid Security Verification code. Please enter the characters shown.");
          generateDoctorCaptcha();
          return;
        }
      }

      const formData = new FormData(form);

      // Extract 9 Doctor Fields
      const fullName = (formData.get("full_name") || "").toString().trim();
      const medicalRegNo = (formData.get("medical_reg_no") || "").toString().trim();
      const specialization = (formData.get("specialization") || "").toString().trim();
      const email = (formData.get("email") || "").toString().trim();
      const phone = (formData.get("phone") || "").toString().trim();
      const hospitalName = (formData.get("hospital_name") || "").toString().trim();
      const address = (formData.get("address") || "").toString().trim();
      const password = (formData.get("password") || "").toString();
      const confirm = (formData.get("confirm_password") || "").toString();

      // Field Validations
      if (!fullName || fullName.length < 2) {
        showDoctorMessage("Please enter your Full Name (e.g., Dr. Sarah Mitchell).");
        return;
      }

      if (!medicalRegNo || medicalRegNo.length < 2) {
        showDoctorMessage("Please enter your Medical Registration Number.");
        return;
      }

      const allowedSpecs = ["Neurology", "Physiotherapy", "Pediatrics", "Occupational Therapy", "Other"];
      if (!specialization || !allowedSpecs.includes(specialization)) {
        showDoctorMessage("Please select a valid Medical Specialization.");
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        showDoctorMessage("Please enter a valid professional email address.");
        return;
      }

      if (!/^[0-9]{10}$/.test(phone)) {
        showDoctorMessage("Please enter a valid 10-digit mobile number.");
        return;
      }

      if (!hospitalName || hospitalName.length < 2) {
        showDoctorMessage("Please enter your Hospital or Clinic Name.");
        return;
      }

      if (!address || address.length < 3) {
        showDoctorMessage("Please provide your Professional Clinic or Hospital Address.");
        return;
      }

      if (password.length < 6) {
        showDoctorMessage("Password must be at least 6 characters in length.");
        return;
      }

      if (password !== confirm) {
        showDoctorMessage("Create Password and Confirm Password do not match.");
        return;
      }

      const agreeTerms = document.getElementById("agreeTerms");
      if (agreeTerms && !agreeTerms.checked) {
        showDoctorMessage("Please accept the Terms and Conditions and Privacy Policy to register.");
        return;
      }

      // Map backend compatibility fields
      formData.set("role", "doctor");
      formData.set("account_type", "Doctor");
      formData.set("doctor_name", fullName);
      formData.set("name", fullName);
      formData.set("full_name", fullName);
      formData.set("medical_reg_no", medicalRegNo);
      formData.set("specialization", specialization);
      formData.set("doctor_specialization", specialization);
      formData.set("hospital_name", hospitalName);
      formData.set("clinic_name", hospitalName);
      formData.set("address", address);
      formData.set("phone", phone);
      formData.set("mobile", phone);

      const username = email.split("@")[0] || fullName.toLowerCase().replace(/[^a-z0-9]/g, "_");
      formData.set("username", username);

      const submitBtn = document.getElementById("doctorSubmitBtn");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>⏳</span> Registering Doctor Account...`;
      }

      try {
        const result = await apiRequest("/api/signup", {
          method: "POST",
          body: formData
        });

        // Backend requires OTP verification
        if (result && result.requires_otp) {
          const emailVal = (result.email || email).toString().trim();
          const nameVal = fullName || "Doctor";
          const otpCode = result.otp;

          sessionStorage.setItem("signup_pending_email", emailVal);
          sessionStorage.setItem("signup_pending_name", nameVal);
          sessionStorage.setItem("signup_pending_role", "doctor");
          sessionStorage.removeItem("signup_demo_otp");

          // Dispatch OTP email to doctor
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
                role: "doctor"
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
            } catch (otpErr) {
              console.warn("Doctor OTP dispatch notice:", otpErr);
            }
          } else if (result.message) {
            sessionStorage.setItem("signup_flash_message", result.message);
          }

          window.location.href = `./verify-email.html?email=${encodeURIComponent(emailVal)}&role=doctor`;
          return;
        }

        // Direct success
        showDoctorMessage(result.message || "Doctor registration successful! Redirecting to doctor login...", "success");

        setTimeout(() => {
          window.location.href = "./doctor-login.html";
        }, 1800);

      } catch (error) {
        // Report backend error directly without fake success messages
        const errMsg = error.message || "Failed to register doctor account. Please verify your details or contact clinical administration.";
        showDoctorMessage(errMsg);
        generateDoctorCaptcha();

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>Register as Doctor</span> <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;
        }
      }
    });
  }
});
