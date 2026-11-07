/**
 * Doctor Sign Up Client Logic - Multi Therapy
 * Handles doctor registration, client validations, CAPTCHA, password toggles,
 * and OTP verification flow via existing authentication endpoints.
 */


// ============================================================================
// 📄 Doctor Documents Upload & Verification Controller
// ============================================================================
const doctorDocuments = {
  med_reg: null,
  degree: null,
  id_proof: null,
  clinic_cert: null
};

const DOC_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB per document
const DOC_ALLOWED_EXTS = ["pdf", "jpg", "jpeg", "png", "webp"];

function setupDoctorDocumentUploads() {
  const docKeys = ["med_reg", "degree", "id_proof", "clinic_cert"];

  docKeys.forEach((key) => {
    const input = document.getElementById(`doc_${key}`);
    const dropzone = document.getElementById(`dropzone_${key}`);

    if (input) {
      input.addEventListener("change", function () {
        if (this.files && this.files[0]) {
          handleDoctorFileSelected(key, this.files[0]);
        }
      });
    }

    if (dropzone) {
      ["dragenter", "dragover"].forEach((evtName) => {
        dropzone.addEventListener(evtName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add("drag-over");
        });
      });

      ["dragleave", "drop"].forEach((evtName) => {
        dropzone.addEventListener(evtName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove("drag-over");
        });
      });

      dropzone.addEventListener("drop", (e) => {
        const files = e.dataTransfer && e.dataTransfer.files;
        if (files && files[0]) {
          handleDoctorFileSelected(key, files[0]);
        }
      });
    }
  });
}

function handleDoctorFileSelected(key, file) {
  const card = document.getElementById(`card_${key}`);
  const dropzone = document.getElementById(`dropzone_${key}`);
  const promptEl = document.getElementById(`prompt_${key}`);
  const selectedEl = document.getElementById(`selected_${key}`);
  const statusEl = document.getElementById(`status_${key}`);
  const errorEl = document.getElementById(`error_${key}`);
  const nameEl = document.getElementById(`file_name_${key}`);
  const sizeEl = document.getElementById(`file_size_${key}`);
  const iconEl = document.getElementById(`file_icon_${key}`);

  if (errorEl) {
    errorEl.style.display = "none";
    errorEl.textContent = "";
  }
  if (card) card.classList.remove("has-error");

  const fileName = file.name || "document";
  const ext = fileName.split(".").pop().toLowerCase();

  // Validate file format
  if (!DOC_ALLOWED_EXTS.includes(ext)) {
    const msg = `Unsupported file format (.${ext}). Only PDF, JPG, and PNG documents are allowed.`;
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.style.display = "block";
    }
    if (card) card.classList.add("has-error");
    showDoctorMessage(msg);
    return false;
  }

  // Validate size (max 5 MB)
  if (file.size > DOC_MAX_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    const msg = `File "${fileName}" exceeds the 5 MB limit (${sizeMb} MB). Please upload a smaller file.`;
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.style.display = "block";
    }
    if (card) card.classList.add("has-error");
    showDoctorMessage(msg);
    return false;
  }

  // Store validated file object
  doctorDocuments[key] = file;

  let formattedSize = "";
  if (file.size < 1024 * 1024) {
    formattedSize = `${Math.round(file.size / 1024)} KB`;
  } else {
    formattedSize = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
  }

  if (nameEl) nameEl.textContent = fileName;
  if (sizeEl) sizeEl.textContent = formattedSize;
  if (iconEl) iconEl.textContent = ext === "pdf" ? "📄" : "🖼️";

  if (promptEl) promptEl.style.display = "none";
  if (selectedEl) selectedEl.style.display = "flex";
  if (statusEl) statusEl.style.display = "inline-flex";
  if (dropzone) dropzone.classList.add("has-file");
  if (card) card.classList.add("has-file");

  return true;
}

window.removeDoctorDocument = function (key) {
  doctorDocuments[key] = null;
  const input = document.getElementById(`doc_${key}`);
  if (input) input.value = "";

  const card = document.getElementById(`card_${key}`);
  const dropzone = document.getElementById(`dropzone_${key}`);
  const promptEl = document.getElementById(`prompt_${key}`);
  const selectedEl = document.getElementById(`selected_${key}`);
  const statusEl = document.getElementById(`status_${key}`);
  const errorEl = document.getElementById(`error_${key}`);

  if (promptEl) promptEl.style.display = "flex";
  if (selectedEl) selectedEl.style.display = "none";
  if (statusEl) statusEl.style.display = "none";
  if (errorEl) {
    errorEl.style.display = "none";
    errorEl.textContent = "";
  }
  if (dropzone) dropzone.classList.remove("has-file");
  if (card) {
    card.classList.remove("has-file");
    card.classList.remove("has-error");
  }
};

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
  setupDoctorDocumentUploads();

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

      // Medical Registration Number is OPTIONAL - allow empty value or preserve if provided
      // (Validation check removed per requirements)

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

      // Doctor Documents Validation (Medical Registration & Degree Certificate are required)
      if (!doctorDocuments.med_reg) {
        showDoctorMessage("Please upload your Medical Registration Certificate (Required).");
        const card = document.getElementById("card_med_reg");
        if (card) {
          card.classList.add("has-error");
          card.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }

      if (!doctorDocuments.degree) {
        showDoctorMessage("Please upload your Doctor Degree / Qualification Certificate (Required).");
        const card = document.getElementById("card_degree");
        if (card) {
          card.classList.add("has-error");
          card.scrollIntoView({ behavior: "smooth", block: "center" });
        }
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

      // Attach verified doctor credentials & documents to FormData
      if (doctorDocuments.med_reg) {
        formData.set("medical_reg_cert", doctorDocuments.med_reg);
      }
      if (doctorDocuments.degree) {
        formData.set("degree_cert", doctorDocuments.degree);
      }
      if (doctorDocuments.id_proof) {
        formData.set("id_proof", doctorDocuments.id_proof);
      }
      if (doctorDocuments.clinic_cert) {
        formData.set("clinic_cert", doctorDocuments.clinic_cert);
      }

      // Metadata for admin verification audit
      const docsMeta = {
        has_documents: true,
        medical_reg_cert_name: doctorDocuments.med_reg ? doctorDocuments.med_reg.name : null,
        degree_cert_name: doctorDocuments.degree ? doctorDocuments.degree.name : null,
        id_proof_name: doctorDocuments.id_proof ? doctorDocuments.id_proof.name : null,
        clinic_cert_name: doctorDocuments.clinic_cert ? doctorDocuments.clinic_cert.name : null,
        uploaded_at: new Date().toISOString()
      };
      formData.set("doctor_documents_meta", JSON.stringify(docsMeta));

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
          const otpCode = result.otp || result.email_otp || result.demo_otp || Math.floor(100000 + Math.random() * 900000).toString();

          sessionStorage.setItem("signup_pending_email", emailVal);
          sessionStorage.setItem("signup_pending_name", nameVal);
          sessionStorage.setItem("signup_pending_role", "doctor");
          sessionStorage.setItem("signup_pending_otp", otpCode);
          sessionStorage.removeItem("signup_demo_otp");

          // Dispatch OTP email to doctor
          const sendOtpFn = (typeof sendOtpAuthEmail === "function")
            ? sendOtpAuthEmail
            : (typeof sendSignupOtpViaResend === "function" ? sendSignupOtpViaResend : null);

          if (sendOtpFn) {
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
              sessionStorage.setItem(
                "signup_flash_message",
                `⚠️ Notice: ${otpErr.message || "Unable to deliver OTP email."}`
              );
            }
          } else {
            // If sendOtpFn is unavailable, allow code entry fallback
            if (result.delivered === true) {
              sessionStorage.setItem(
                "signup_flash_message",
                `✅ Verification code sent to ${emailVal}. Please check your inbox.`
              );
            } else {
              sessionStorage.setItem(
                "signup_flash_message",
                `ℹ️ Please verify your email using your verification code or click "Resend Verification Email".`
              );
            }
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
