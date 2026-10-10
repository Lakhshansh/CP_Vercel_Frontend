// Resend.com Client & Serverless Helper for OTP Delivery
const RESEND_STORAGE_KEY = "RESEND_API_KEY";
const RESEND_FROM_STORAGE_KEY = "RESEND_FROM_EMAIL";
const DEFAULT_RESEND_KEY = "";
const DEFAULT_RESEND_FROM = "CP Healthcare <onboarding@resend.dev>";

function getResendConfig() {
  return {
    apiKey: localStorage.getItem(RESEND_STORAGE_KEY) || (typeof window !== "undefined" && window.RESEND_API_KEY) || DEFAULT_RESEND_KEY,
    fromEmail: localStorage.getItem(RESEND_FROM_STORAGE_KEY) || (typeof window !== "undefined" && window.RESEND_FROM_EMAIL) || DEFAULT_RESEND_FROM
  };
}

function saveResendConfig(apiKey, fromEmail) {
  if (typeof apiKey === "string") {
    const trimmed = apiKey.trim();
    if (trimmed) {
      localStorage.setItem(RESEND_STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(RESEND_STORAGE_KEY);
    }
  }

  if (typeof fromEmail === "string") {
    const trimmed = fromEmail.trim();
    if (trimmed) {
      localStorage.setItem(RESEND_FROM_STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(RESEND_FROM_STORAGE_KEY);
    }
  }
}

/**
 * Dispatches an OTP verification email to the doctor using Resend.com APIs
 * @param {Object} params
 * @param {string} params.email - Doctor recipient email
 * @param {string} params.name - Doctor name
 * @param {string|number} params.otp - 6-digit OTP code
 * @returns {Promise<{success: boolean, message?: string, error?: string, id?: string}>}
 */
async function sendDoctorOtpViaResend({ email, name, otp }) {
  if (!email || !otp) {
    return { success: false, error: "Missing email address or OTP code." };
  }

  const config = getResendConfig();
  const payload = {
    email: email.trim(),
    name: name ? name.trim() : "",
    otp: String(otp).trim(),
    apiKey: config.apiKey || undefined,
    fromEmail: config.fromEmail || DEFAULT_RESEND_FROM
  };

  // 1. Attempt delivery via Vercel Serverless Function (/api/send-doctor-otp)
  try {
    const serverlessUrl = "/api/send-doctor-otp";
    const res = await fetch(serverlessUrl, {
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
        message: data.message || `OTP sent to ${email} via Resend.`
      };
    }

    // If serverless endpoint exists and returned an explicit error (e.g. 400 bad request, 401 invalid key, 403 unverified domain)
    if (res.status !== 404 && res.status !== 405) {
      return {
        success: false,
        error: data.error || data.message || `Resend delivery failed with status ${res.status}`,
        details: data
      };
    }
  } catch (err) {
    console.warn("Vercel serverless /api/send-doctor-otp request not completed:", err);
  }

  // 2. Direct browser call fallback if user entered an API key
  if (config.apiKey) {
    try {
      const doctorDisplayName = name ? `Dr. ${name.replace(/^Dr\.?\s*/i, "")}` : "Doctor";
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 10px; background: #ffffff;">
          <h2 style="color: #0d6efd; margin-top: 0;">🏥 CP Healthcare System</h2>
          <p>Hello <strong>${doctorDisplayName}</strong>,</p>
          <p>Please use the following 6-digit verification code to complete your doctor profile registration:</p>
          <div style="background: #f1f5f9; padding: 18px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0d6efd; font-family: monospace;">${otp}</span>
            <div style="font-size: 12px; color: #64748b; margin-top: 6px;">⏰ Valid for 10 minutes</div>
          </div>
          <p style="font-size: 13px; color: #64748b;">If you did not request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="font-size: 11px; color: #94a3b8; text-align: center;">Sent via Resend.com API</p>
        </div>
      `;

      const directRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: config.fromEmail || DEFAULT_RESEND_FROM,
          to: [email.trim()],
          subject: `Doctor Verification OTP: ${otp} - CP Management System`,
          html: htmlContent
        })
      });

      const dData = await directRes.json();
      if (directRes.ok) {
        return {
          success: true,
          id: dData.id,
          message: `OTP sent to ${email} via Resend direct API.`
        };
      }

      return {
        success: false,
        error: dData.message || "Resend API returned an error."
      };
    } catch (directErr) {
      return {
        success: false,
        error: "Direct Resend request blocked by browser CORS. Please use the Vercel deployed endpoint or configure RESEND_API_KEY."
      };
    }
  }

  return {
    success: false,
    error: "Resend API key is not configured. Please click '⚡ Resend API Settings' or set RESEND_API_KEY in Vercel."
  };
}

/**
 * Dispatches an OTP verification email to the patient using Resend.com APIs
 * @param {Object} params
 * @param {string} params.email - Patient recipient email
 * @param {string} params.name - Patient name
 * @param {string|number} params.otp - 6-digit OTP code
 * @returns {Promise<{success: boolean, message?: string, error?: string, id?: string}>}
 */
async function sendPatientOtpViaResend({ email, name, otp }) {
  if (!email || !otp) {
    return { success: false, error: "Missing email address or OTP code." };
  }

  const config = getResendConfig();
  const payload = {
    email: email.trim(),
    name: name ? name.trim() : "",
    otp: String(otp).trim(),
    apiKey: config.apiKey || undefined,
    fromEmail: config.fromEmail || DEFAULT_RESEND_FROM
  };

  // 1. Attempt delivery via Vercel Serverless Function (/api/send-patient-otp)
  try {
    const serverlessUrl = "/api/send-patient-otp";
    const res = await fetch(serverlessUrl, {
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
        message: data.message || `OTP sent to ${email} via Resend.`
      };
    }

    if (res.status !== 404 && res.status !== 405) {
      return {
        success: false,
        error: data.error || data.message || `Resend delivery failed with status ${res.status}`,
        details: data
      };
    }
  } catch (err) {
    console.warn("Vercel serverless /api/send-patient-otp request not completed:", err);
  }

  // 2. Direct browser call fallback if user entered an API key
  if (config.apiKey) {
    try {
      const patientDisplayName = name ? name.trim() : "Patient";
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 10px; background: #ffffff;">
          <h2 style="color: #0d6efd; margin-top: 0;">🏥 CP Healthcare System</h2>
          <p>Hello <strong>${patientDisplayName}</strong>,</p>
          <p>Please use the following 6-digit verification code to complete your patient profile registration:</p>
          <div style="background: #f1f5f9; padding: 18px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0d6efd; font-family: monospace;">${otp}</span>
            <div style="font-size: 12px; color: #64748b; margin-top: 6px;">⏰ Valid for 10 minutes</div>
          </div>
          <p style="font-size: 13px; color: #64748b;">If you did not request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="font-size: 11px; color: #94a3b8; text-align: center;">Sent via Resend.com API</p>
        </div>
      `;

      const directRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: config.fromEmail || DEFAULT_RESEND_FROM,
          to: [email.trim()],
          subject: `Patient Verification OTP: ${otp} - CP Management System`,
          html: htmlContent
        })
      });

      const dData = await directRes.json();
      if (directRes.ok) {
        return {
          success: true,
          id: dData.id,
          message: `OTP sent to ${email} via Resend direct API.`
        };
      }

      return {
        success: false,
        error: dData.message || "Resend API returned an error."
      };
    } catch (directErr) {
      return {
        success: false,
        error: "Direct Resend request blocked by browser CORS. Please use the Vercel deployed endpoint or configure RESEND_API_KEY."
      };
    }
  }

  return {
    success: false,
    error: "Resend API key is not configured. Please click '⚡ Resend API Settings' or set RESEND_API_KEY in Vercel."
  };
}

if (typeof window !== "undefined") {
  window.getResendConfig = getResendConfig;
  window.saveResendConfig = saveResendConfig;
  window.sendDoctorOtpViaResend = sendDoctorOtpViaResend;
  window.sendPatientOtpViaResend = sendPatientOtpViaResend;
}
