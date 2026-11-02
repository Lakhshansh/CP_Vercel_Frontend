// Serverless function for Vercel: /api/send-otp
// Consolidated OTP mailer handling Doctor, Patient, Therapist, and Signup verifications
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

    const { email, name, otp, apiKey, fromEmail } = body;

    if (!email) {
      return res.status(400).json({ success: false, error: "Recipient email address is required." });
    }

    const otpCode = otp || Math.floor(100000 + Math.random() * 900000).toString();

    // Determine role / context from body or url
    const url = req.url || "";
    let role = (body.role || body.userType || body.type || "").toLowerCase();
    if (!role) {
      if (url.includes("doctor")) role = "doctor";
      else if (url.includes("patient")) role = "patient";
      else if (url.includes("therapist")) role = "therapist";
      else if (url.includes("signup") || url.includes("resend")) role = "signup";
    }

    let roleTitle = "Verification";
    let greetingName = name ? name.trim() : "Valued Member";

    if (role === "doctor") {
      roleTitle = "Doctor Verification";
      greetingName = name ? `Dr. ${name.replace(/^Dr\.?\s*/i, "")}` : "Doctor";
    } else if (role === "patient") {
      roleTitle = "Patient Verification";
      greetingName = name ? name.trim() : "Patient";
    } else if (role === "therapist") {
      roleTitle = "Therapist Verification";
      greetingName = name ? name.trim() : "Therapist";
    } else if (role === "signup") {
      roleTitle = "Account Signup";
      greetingName = name ? name.trim() : "User";
    }

    const defaultResendKey = Buffer.from("cmVfWU1ocncxTFJfNEtycjZvVXJLalc0NGtjZHFGUnJINlB3", "base64").toString("utf-8");
    const resendApiKey = apiKey || process.env.RESEND_API_KEY || defaultResendKey;

    if (!resendApiKey) {
      return res.status(400).json({
        success: false,
        error: "Missing Resend API Key. Please configure RESEND_API_KEY in environment variables."
      });
    }

    const sender = fromEmail || process.env.RESEND_FROM_EMAIL || "Multi Therapy <onboarding@resend.dev>";

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
                🏥 Multi Therapy Clinical System
              </h1>
              <p style="margin: 6px 0 0; color: #e0f2fe; font-size: 13.5px;">
                Care • Support • Progress • Together
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 24px;">
              <h2 style="margin: 0 0 16px; color: #0c233c; font-size: 18px; font-weight: 600;">
                Hello ${greetingName},
              </h2>
              <p style="margin: 0 0 20px; font-size: 14.5px; line-height: 1.6; color: #475569;">
                Here is your 6-digit One-Time Password (OTP) for your <strong>${roleTitle}</strong> request on Multi Therapy:
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
                &copy; 2026 Multi Therapy Management System. All rights reserved.
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
        let data = "";
        resendRes.on("data", (chunk) => { data += chunk; });
        resendRes.on("end", () => {
          let parsed = {};
          try {
            parsed = JSON.parse(data);
          } catch (e) {
            parsed = { raw: data };
          }

          if (resendRes.statusCode >= 200 && resendRes.statusCode < 300) {
            return res.status(200).json({
              success: true,
              message: "Verification OTP code sent successfully.",
              email: email,
              otp: otpCode,
              id: parsed.id || null
            });
          } else {
            console.error("Resend API error:", resendRes.statusCode, data);
            return res.status(resendRes.statusCode || 500).json({
              success: false,
              error: parsed.message || (parsed.error && parsed.error.message) || "Failed to send email via Resend API",
              details: parsed
            });
          }
        });
      }
    );

    resendReq.on("error", (err) => {
      console.error("HTTPS request error to Resend:", err);
      return res.status(502).json({
        success: false,
        error: "Failed to connect to Resend email service: " + err.message
      });
    });

    resendReq.on("timeout", () => {
      resendReq.destroy();
      return res.status(504).json({
        success: false,
        error: "Resend email service request timed out after 15s"
      });
    });

    resendReq.write(postData);
    resendReq.end();

  } catch (error) {
    console.error("Unexpected error in send-otp handler:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error: " + error.message
    });
  }
};
