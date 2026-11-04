// ============================================================================
// Multi Therapy - Resend Email Dispatch Helper (Client Interface)
// Dispatches verification OTPs securely through server-side serverless endpoints
// Never exposes API keys or secrets on the client side
// ============================================================================

/**
 * Sends OTP email via server-side /api/send-otp endpoint
 * @param {Object} options
 * @param {string} options.endpoint - API route e.g. /api/send-signup-otp
 * @param {string} options.email - Recipient email
 * @param {string} [options.name] - User or Doctor display name
 * @param {string|number} options.otp - 6-digit OTP code
 * @param {string} options.role - Role context ("doctor", "patient", "therapist", "signup")
 * @returns {Promise<{success: boolean, message?: string, error?: string, id?: string, is_domain_unverified?: boolean, setup_url?: string}>}
 */
async function dispatchServerOtp({ endpoint, email, name, otp, role }) {
  if (!email || !otp) {
    return { success: false, error: "Missing recipient email address or verification code." };
  }

  const payload = {
    email: String(email).trim().toLowerCase(),
    name: name ? String(name).trim() : "",
    otp: String(otp).trim(),
    role: role || "signup"
  };

  const endpointsToTry = [endpoint, "/api/send-otp"];

  for (const ep of endpointsToTry) {
    try {
      const res = await fetch(ep, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const isJson = (res.headers.get("content-type") || "").includes("application/json");
      const data = isJson ? await res.json() : { message: await res.text() };

      if (res.ok && data.success) {
        return {
          success: true,
          id: data.id,
          message: data.message || `Verification OTP sent to ${email}.`
        };
      }

      if (res.status !== 404 && res.status !== 405 && data) {
        return {
          success: false,
          error: data.error || data.message || `Delivery failed with HTTP status ${res.status}`,
          code: data.code,
          is_domain_unverified: data.is_domain_unverified || false,
          setup_url: data.setup_url,
          details: data.details
        };
      }
    } catch (netErr) {
      console.warn(`[resend.js] Failed connecting to ${ep}:`, netErr.message);
    }
  }

  return {
    success: false,
    error: "Unable to connect to email verification service. Please make sure the server is reachable and try again."
  };
}

/**
 * Dispatches an OTP verification email to the doctor
 */
async function sendDoctorOtpViaResend({ email, name, otp }) {
  return await dispatchServerOtp({
    endpoint: "/api/send-doctor-otp",
    email,
    name,
    otp,
    role: "doctor"
  });
}

/**
 * Dispatches an OTP verification email to the patient
 */
async function sendPatientOtpViaResend({ email, name, otp }) {
  return await dispatchServerOtp({
    endpoint: "/api/send-patient-otp",
    email,
    name,
    otp,
    role: "patient"
  });
}

/**
 * Dispatches an OTP verification email for new account signup
 */
async function sendSignupOtpViaResend({ email, name, otp }) {
  return await dispatchServerOtp({
    endpoint: "/api/send-signup-otp",
    email,
    name,
    otp,
    role: "signup"
  });
}

/**
 * Dispatches an OTP verification email to the therapist
 */
async function sendTherapistOtpViaResend({ email, name, otp }) {
  return await dispatchServerOtp({
    endpoint: "/api/send-therapist-otp",
    email,
    name,
    otp,
    role: "therapist"
  });
}

// Backward compatibility stubs for UI settings modals
function getResendConfig() {
  return {
    fromEmail: "Configured via EMAIL_FROM on server"
  };
}

function saveResendConfig() {
  // Credentials are now configured securely on the server side via environment variables
  console.info("[resend.js] Resend configuration is managed via server environment variables.");
}

if (typeof window !== "undefined") {
  window.getResendConfig = getResendConfig;
  window.saveResendConfig = saveResendConfig;
  window.sendDoctorOtpViaResend = sendDoctorOtpViaResend;
  window.sendPatientOtpViaResend = sendPatientOtpViaResend;
  window.sendSignupOtpViaResend = sendSignupOtpViaResend;
  window.sendTherapistOtpViaResend = sendTherapistOtpViaResend;
}
