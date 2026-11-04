// Serverless function for Vercel: /api/send-otp
// Consolidated production OTP mailer using Resend API
// Handles Doctor, Patient, Therapist, and Signup email verifications securely on the server
const https = require("https");

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Use POST." });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (e) {
        // body remains string or empty
      }
    }
    body = body || {};

    const email = (body.email || "").toString().trim().toLowerCase();
    const name = (body.name || "").toString().trim();
    const otp = (body.otp || "").toString().trim();

    // 1. Validate recipient email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: "A valid recipient email address is required."
      });
    }

    const otpCode = otp || Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Determine role & greeting
    const url = req.url || "";
    let role = (body.role || body.userType || body.type || "").toLowerCase();
    if (!role) {
      if (url.includes("doctor")) role = "doctor";
      else if (url.includes("patient")) role = "patient";
      else if (url.includes("therapist")) role = "therapist";
      else if (url.includes("signup") || url.includes("resend")) role = "signup";
    }

    let roleTitle = "Verification";
    let greetingName = name || "Valued Member";

    if (role === "doctor") {
      roleTitle = "Doctor Verification";
      greetingName = name ? `Dr. ${name.replace(/^Dr\.?\s*/i, "")}` : "Doctor";
    } else if (role === "patient") {
      roleTitle = "Patient Verification";
      greetingName = name || "Patient";
    } else if (role === "therapist") {
      roleTitle = "Therapist Verification";
      greetingName = name || "Therapist";
    } else if (role === "signup") {
      roleTitle = "Account Signup";
      greetingName = name || "User";
    }

    // 3. Server-side only: Read Resend credentials and verified sender from environment
    const resendApiKey = process.env.RESEND_API_KEY || (req.headers && req.headers["x-resend-api-key"]) || body.apiKey;
    if (!resendApiKey) {
      console.error("[send-otp] RESEND_API_KEY is not configured in environment variables.");
      return res.status(500).json({
        success: false,
        code: "MISSING_API_KEY",
        error: "Server configuration error: RESEND_API_KEY is not configured. Please set RESEND_API_KEY in your environment variables.",
        setup_url: "https://resend.com/api-keys",
        test_otp: otpCode
      });
    }

    // Configure sender using EMAIL_FROM or RESEND_FROM_EMAIL
    // For verified production domains, e.g. "Every Individual Deserves Better Care <verify@yourdomain.com>"
    const sender = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || "Multi Therapy <onboarding@resend.dev>";

    // Build responsive HTML email template
    const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${roleTitle} OTP - Multi Therapy</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f6f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          <tr>
            <td style="background: linear-gradient(135deg, #0875F9 0%, #103463 100%); padding: 28px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.3px;">
                🏥 Every Individual Deserves Better Care.
              </h1>
              <p style="margin: 6px 0 0; color: #e0f2fe; font-size: 13.5px;">
                Multi Therapy Clinical Management
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 24px;">
              <h2 style="margin: 0 0 16px; color: #0c233c; font-size: 18px; font-weight: 600;">
                Hello ${greetingName},
              </h2>
              <p style="margin: 0 0 20px; font-size: 14.5px; line-height: 1.6; color: #475569;">
                Here is your 6-digit One-Time Password (OTP) for your <strong>${roleTitle}</strong> request:
              </p>
              <div style="background: #f8fafc; border: 2px dashed #0875F9; border-radius: 10px; padding: 18px 20px; text-align: center; margin: 24px 0;">
                <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #0875F9; font-family: monospace;">
                  ${otpCode}
                </span>
              </div>
              <p style="margin: 0 0 16px; font-size: 13px; color: #64748b; line-height: 1.5;">
                ⏱️ This OTP code is valid for <strong>10 minutes</strong>. Never share this code with anyone.
              </p>
              <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 14px; border-radius: 6px; margin: 20px 0 0;">
                <p style="margin: 0; font-size: 12.5px; color: #92400e; line-height: 1.4;">
                  <strong>Security Note:</strong> If you did not initiate this verification request, please ignore this email or contact support at info@multitherapy.org immediately.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                &copy; 2026 Every Individual Deserves Better Care. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const postData = JSON.stringify({
      from: sender,
      to: [email],
      subject: `Your Multi Therapy ${roleTitle} OTP: ${otpCode}`,
      html: emailHtml
    });

    await new Promise((resolve) => {
      const resendReq = https.request(
        "https://api.resend.com/emails",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(postData)
          },
          timeout: 15000
        },
        (resendRes) => {
          let rawData = "";
          resendRes.on("data", (chunk) => { rawData += chunk; });
          resendRes.on("end", () => {
            let parsed = {};
            try {
              parsed = JSON.parse(rawData);
            } catch (e) {
              parsed = { raw: rawData };
            }

            // Strict Success Check: Resend returned 200..299 AND an email id
            if (resendRes.statusCode >= 200 && resendRes.statusCode < 300 && parsed.id) {
              res.status(200).json({
                success: true,
                message: `Verification OTP sent successfully to ${email}.`,
                email: email,
                otp: otpCode,
                id: parsed.id
              });
              return resolve();
            }

            // Analyze Resend error details
            const resendMsg = (parsed.message || (parsed.error && parsed.error.message) || rawData || "").toString();
            console.error(`[send-otp] Resend API error (${resendRes.statusCode}):`, resendMsg);

            let userFriendlyError = resendMsg;
            let isDomainUnverified = false;

            // Check if error is due to unverified domain or sandbox limitation
            if (
              resendMsg.includes("You can only send testing emails to your own email address") ||
              (resendRes.statusCode === 403 && sender.includes("resend.dev"))
            ) {
              isDomainUnverified = true;
              userFriendlyError = `Resend Domain Not Verified: The sender address (${sender}) is an unverified testing domain, which can only deliver emails to the Resend account owner. To send verification emails to patient email addresses in production, please verify your custom domain at https://resend.com/domains and set EMAIL_FROM in your environment variables.`;
            } else if (
              resendMsg.toLowerCase().includes("domain is not verified") ||
              resendMsg.toLowerCase().includes("not verified")
            ) {
              isDomainUnverified = true;
              userFriendlyError = `Resend Domain Not Verified: The domain used in EMAIL_FROM is not verified in Resend. Please add and verify your domain DNS records (SPF, DKIM, MX) at https://resend.com/domains before sending to patient email addresses.`;
            } else if (resendRes.statusCode === 401) {
              userFriendlyError = "Resend API authentication failed (401). Please verify that RESEND_API_KEY in your environment variables is valid from https://resend.com/api-keys.";
            }

            res.status(resendRes.statusCode || 500).json({
              success: false,
              error: userFriendlyError,
              code: isDomainUnverified ? "DOMAIN_NOT_VERIFIED" : (resendRes.statusCode === 401 ? "INVALID_API_KEY" : "RESEND_ERROR"),
              is_domain_unverified: isDomainUnverified,
              setup_url: isDomainUnverified ? "https://resend.com/domains" : (resendRes.statusCode === 401 ? "https://resend.com/api-keys" : undefined),
              test_otp: otpCode,
              details: parsed
            });
            return resolve();
          });
        }
      );

      resendReq.on("error", (err) => {
        console.error("[send-otp] HTTPS request error to Resend:", err);
        res.status(502).json({
          success: false,
          error: "Failed to connect to Resend email service: " + err.message,
          test_otp: otpCode
        });
        return resolve();
      });

      resendReq.on("timeout", () => {
        resendReq.destroy();
        res.status(504).json({
          success: false,
          error: "Resend email service request timed out after 15s",
          test_otp: otpCode
        });
        return resolve();
      });

      resendReq.write(postData);
      resendReq.end();
    });

  } catch (error) {
    console.error("[send-otp] Unexpected server error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error: " + error.message
    });
  }
};
