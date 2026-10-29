function showSignupMessage(message, type = "danger") {
  const el = document.getElementById("signupMessage");
  if (!el) return;
  el.hidden = false;
  el.className = `alert alert-${type} mb-3`;
  el.textContent = message;
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

      // Security CAPTCHA Check
      const captchaInput = document.getElementById("captchaInput");
      const enteredCaptcha = (captchaInput ? captchaInput.value : "").trim().toUpperCase();
      const expectedCaptcha = sessionStorage.getItem("signup_captcha");

      if (enteredCaptcha !== expectedCaptcha) {
        showSignupMessage("Invalid Security Verification code.");
        generateCaptcha();
        return;
      }

      const form = event.currentTarget;
      const data = new FormData(form);
      const fullName = (data.get("full_name") || data.get("username") || data.get("doctor_name") || "").toString().trim();
      const email = (data.get("email") || "").toString().trim();
      const phone = (data.get("phone") || "").toString().trim();
      const password = (data.get("password") || "").toString();
      const confirm = (data.get("confirm_password") || "").toString();
      const accountType = (data.get("account_type") || "Patient").toString().trim();

      if (!fullName) {
        showSignupMessage("Please enter your Full Name.");
        return;
      }

      if (!email || !email.includes("@")) {
        showSignupMessage("Please enter a valid email address.");
        return;
      }

      if (!/^[0-9]{10}$/.test(phone)) {
        showSignupMessage("Please enter a valid 10-digit mobile number.");
        return;
      }

      if (password.length < 6) {
        showSignupMessage("Password must be at least 6 characters.");
        return;
      }

      if (password !== confirm) {
        showSignupMessage("Passwords do not match.");
        return;
      }

      // Terms & Conditions Check
      const agreeTerms = document.getElementById("agreeTerms");
      if (agreeTerms && !agreeTerms.checked) {
        showSignupMessage("Please accept the Terms & Conditions to proceed.");
        return;
      }

      // Map common identity fields for backend compatibility
      if (!data.has("username") || !data.get("username")) {
        data.set("username", email.split("@")[0] || fullName.toLowerCase().replace(/\s+/g, "_"));
      }
      if (!data.has("role")) {
        data.set("role", accountType.toLowerCase());
      }
      if (accountType.toLowerCase() === "doctor") {
        if (!data.has("doctor_name")) data.set("doctor_name", fullName);
      } else {
        if (!data.has("patient_name")) data.set("patient_name", fullName);
      }

      // Doctor verification document check (only mandatory if Doctor account type)
      const docInput = document.getElementById("document_file");
      const docFile = docInput && docInput.files ? docInput.files[0] : null;
      if (accountType.toLowerCase() === "doctor" && docInput && docInput.required && !docFile) {
        showSignupMessage("Doctor verification document upload is mandatory for doctor accounts.");
        return;
      }

      if (docFile && docFile.size > 5 * 1024 * 1024) {
        showSignupMessage("Uploaded document file size must be 5 MB or less.");
        return;
      }

      const submitBtn = document.getElementById("signupSubmitBtn");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>⏳</span> Registering &amp; Generating OTP...`;
      }

      try {
        const result = await apiRequest("/api/signup", {
          method: "POST",
          body: data
        });

        if (result && result.requires_otp) {
          const emailVal = (result.email || data.get("email") || "").toString().trim();
          const nameVal = (data.get("doctor_name") || data.get("username") || "Doctor").toString().trim();
          const otpCode = result.otp;

          sessionStorage.setItem("signup_pending_email", emailVal);
          sessionStorage.setItem("signup_pending_name", nameVal);

          // Do not store or display demo_otp on screen - OTP is sent ONLY via email
          sessionStorage.removeItem("signup_demo_otp");

          // Dispatch OTP email to recipient using OTP AUTH APIs
          const sendOtpFn = (typeof sendOtpAuthEmail === "function") ? sendOtpAuthEmail : (typeof sendSignupOtpViaResend === "function" ? sendSignupOtpViaResend : null);
          if (otpCode && sendOtpFn) {
            if (submitBtn) {
              submitBtn.innerHTML = `<span>📨</span> Sending OTP via OTP AUTH API...`;
            }

            try {
              const otpAuthResult = await sendOtpFn({
                email: emailVal,
                name: nameVal,
                otp: otpCode
              });

              sessionStorage.setItem("signup_resend_status", JSON.stringify(otpAuthResult));

              if (otpAuthResult && otpAuthResult.success) {
                sessionStorage.setItem(
                  "signup_flash_message",
                  `✅ Verification OTP successfully sent to ${emailVal} via OTP AUTH API!`
                );
              } else if (otpAuthResult && !otpAuthResult.success) {
                sessionStorage.setItem(
                  "signup_flash_message",
                  `⚠️ OTP Auth Notice: ${otpAuthResult.error || "Unable to deliver OTP email."}`
                );
              }
            } catch (otpAuthErr) {
              console.warn("OTP Auth email dispatch error:", otpAuthErr);
            }
          } else if (result.message) {
            sessionStorage.setItem("signup_flash_message", result.message);
          }

          window.location.href = `./verify-signup-otp.html?email=${encodeURIComponent(emailVal)}`;
          return;
        }

        showSignupMessage(result.message || "Account created successfully! Redirecting to login...", "success");

        setTimeout(() => {
          window.location.href = "./index.html";
        }, 1800);
      } catch (error) {
        showSignupMessage(error.message || "Failed to create account. Please try again.");
        generateCaptcha();
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>📧</span> Send OTP &amp; Create Account`;
        }
      }
    });
  }
});
