// OTP Authentication API Client Helper
(function (window) {
  "use strict";

  /**
   * Request OTP code generation from authentication API
   * @param {Object} params
   * @param {string} params.email - Recipient email
   * @returns {Promise<{success: boolean, otp?: string, demo_otp?: string, message?: string}>}
   */
  async function requestOtpAuth({ email }) {
    if (!email) {
      throw new Error("Email address is required for OTP Auth.");
    }

    // Try calling backend /api/auth/send-otp first, fallback to /api/resend-signup-otp
    try {
      const res = await apiRequest("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() })
      });
      return res;
    } catch (err) {
      // Fallback to resend-signup-otp endpoint on backend
      return await apiRequest("/api/resend-signup-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() })
      });
    }
  }

  /**
   * Send OTP code to email address using OTP AUTH APIs
   * @param {Object} params
   * @param {string} params.email - Recipient email
   * @param {string} [params.name] - User or Doctor display name
   * @param {string|number} params.otp - 6-digit OTP code
   * @returns {Promise<{success: boolean, message?: string, error?: string, id?: string}>}
   */
  async function sendOtpAuthEmail({ email, name, otp }) {
    if (!email || !otp) {
      return { success: false, error: "Missing email address or OTP code." };
    }

    const payload = {
      email: email.trim(),
      name: name ? name.trim() : "",
      otp: String(otp).trim()
    };

    // 1. Try Vercel Serverless /api/send-otp-auth
    const endpoints = ["/api/send-otp-auth", "/api/auth/send-otp", "/api/send-signup-otp"];
    for (const ep of endpoints) {
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
            message: data.message || `OTP sent to ${email} via OTP AUTH API.`
          };
        }

        if (res.status !== 404 && res.status !== 405 && data.error) {
          return {
            success: false,
            error: data.error || data.message || `Delivery failed (${res.status})`
          };
        }
      } catch (e) {
        // Try next endpoint
      }
    }

    // 2. Fallback to client-side resend helper if available
    if (typeof window.sendSignupOtpViaResend === "function") {
      return await window.sendSignupOtpViaResend({ email, name, otp });
    }

    return {
      success: false,
      error: "Unable to connect to OTP Auth API. Please try again."
    };
  }

  /**
   * Verify entered OTP with backend authentication API
   * @param {Object} params
   * @param {string} params.email - Recipient email
   * @param {string} params.otp - 6-digit OTP code
   * @returns {Promise<any>}
   */
  async function verifyOtpAuth({ email, otp }) {
    if (!email || !otp) {
      throw new Error("Both email and OTP code are required.");
    }

    // Try /api/auth/verify-otp, fallback to /api/verify-signup-otp
    try {
      return await apiRequest("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), email_otp: otp.trim() })
      });
    } catch (err) {
      return await apiRequest("/api/verify-signup-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), email_otp: otp.trim() })
      });
    }
  }

  // Export globally
  window.requestOtpAuth = requestOtpAuth;
  window.sendOtpAuthEmail = sendOtpAuthEmail;
  window.verifyOtpAuth = verifyOtpAuth;
})(typeof window !== "undefined" ? window : globalThis);
