// Serverless function for Vercel: /api/send-doctor-otp
module.exports = async function handler(req, res) {
  // CORS support
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
        // leave as-is
      }
    }
    body = body || {};

    const { email, name, otp, apiKey, fromEmail } = body;

    if (!email) {
      return res.status(400).json({ success: false, error: "Doctor email address is required." });
    }

    if (!otp) {
      return res.status(400).json({ success: false, error: "OTP code is required." });
    }

    const defaultResendKey = Buffer.from("cmVfWU1ocncxTFJfNEtycjZvVXJLalc0NGtjZHFGUnJINlB3", "base64").toString("utf-8");
    const resendApiKey = apiKey || process.env.RESEND_API_KEY || defaultResendKey;

    if (!resendApiKey) {
      return res.status(400).json({
        success: false,
        error: "Missing Resend API Key. Please configure RESEND_API_KEY in Vercel environment variables or provide apiKey in the request."
      });
    }

    const sender = fromEmail || process.env.RESEND_FROM_EMAIL || "CP System <onboarding@resend.dev>";
    const doctorName = name ? `Dr. ${name.replace(/^Dr\.?\s*/i, "")}` : "Doctor";

    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Doctor Verification OTP</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f6f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%); padding: 28px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.3px;">
                🏥 CP Healthcare System
              </h1>
              <p style="margin: 6px 0 0; color: rgba(255,255,255,0.85); font-size: 13px;">
                Doctor Profile Verification
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 32px 24px;">
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.5; color: #334155;">
                Hello <strong>${doctorName}</strong>,
              </p>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #475569;">
                A request has been made to register or verify your doctor profile on the <strong>Cerebral Palsy Care Management System</strong>. Please use the verification code below to complete registration:
              </p>

              <!-- OTP Box -->
              <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 10px; padding: 22px; text-align: center; margin: 24px 0;">
                <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748b; letter-spacing: 1.5px; margin-bottom: 8px;">
                  Your Verification Code
                </div>
                <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0d6efd; font-family: monospace;">
                  ${otp}
                </div>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 8px;">
                  ⏰ Valid for 10 minutes
                </div>
              </div>

              <p style="margin: 0 0 12px; font-size: 13px; line-height: 1.5; color: #64748b;">
                If you did not initiate this request, you can safely ignore this email. No doctor account will be activated without this verification code.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 32px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                Delivered via <strong>Resend.com Email API</strong> • Cerebral Palsy Healthcare Portal
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: sender,
        to: [email],
        subject: `Doctor Verification OTP: ${otp} - CP Management System`,
        html: emailHtml
      })
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      return res.status(resendResponse.status).json({
        success: false,
        error: resendData.message || "Failed to deliver email through Resend API.",
        details: resendData
      });
    }

    return res.status(200).json({
      success: true,
      message: `OTP email successfully sent to ${email} via Resend.`,
      id: resendData.id
    });
  } catch (error) {
    console.error("Resend API handler error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error while sending email via Resend."
    });
  }
};
