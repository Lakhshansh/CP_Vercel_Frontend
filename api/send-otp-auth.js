// Serverless function for Vercel: /api/send-otp-auth (OTP Authentication API)
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
        // body remains string or empty
      }
    }
    body = body || {};

    const { email, name, otp, apiKey, fromEmail, role } = body;

    if (!email) {
      return res.status(400).json({ success: false, error: "Recipient email address is required." });
    }

    const otpCode = otp || Math.floor(100000 + Math.random() * 900000).toString();

    const defaultResendKey = Buffer.from("cmVfWU1ocncxTFJfNEtycjZvVXJLalc0NGtjZHFGUnJINlB3", "base64").toString("utf-8");
    const resendApiKey = apiKey || process.env.RESEND_API_KEY || defaultResendKey;

    if (!resendApiKey) {
      return res.status(400).json({
        success: false,
        error: "Missing API Key configuration for OTP Auth email delivery."
      });
    }

    const sender = fromEmail || process.env.RESEND_FROM_EMAIL || "Multi Therapy <onboarding@resend.dev>";
    const isDoctor = (role || "").toLowerCase() === "doctor";
    const displayName = name ? (isDoctor && !name.startsWith("Dr.") ? `Dr. ${name}` : name) : (isDoctor ? "Doctor" : "Patient");

    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OTP Authentication Code</title>
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
                🔐 Multi Therapy - OTP Auth
              </h1>
              <p style="margin: 6px 0 0; color: rgba(255,255,255,0.85); font-size: 13px;">
                Care • Support • Progress • Together
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 32px 24px;">
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.5; color: #334155;">
                Hello <strong>${displayName}</strong>,
              </p>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #475569;">
                An authentication request has been initiated for your account. Please use the following one-time password (OTP) code to verify your signup details:
              </p>

              <!-- OTP Box -->
              <div style="background: #f8fafc; border: 2px dashed #0d6efd; border-radius: 10px; padding: 22px; text-align: center; margin: 24px 0;">
                <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #0d6efd; letter-spacing: 1.5px; margin-bottom: 8px;">
                  OTP Authentication Code
                </div>
                <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0d6efd; font-family: monospace;">
                  ${otpCode}
                </div>
                <div style="font-size: 12px; color: #64748b; margin-top: 8px;">
                  ⏰ Valid for 5 minutes • Single-use verification code
                </div>
              </div>

              <p style="margin: 0 0 12px; font-size: 13px; line-height: 1.5; color: #64748b;">
                If you did not request this OTP, please ignore this email. Never disclose this code to anyone.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 32px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                Delivered via <strong>OTP AUTH API</strong> • Multi Therapy Portal
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
        to: [email.trim()],
        subject: `OTP Authentication Code: ${otpCode} - Multi Therapy`,
        html: emailHtml
      })
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      let errMsg = resendData.message || "Failed to deliver OTP email.";
      if (errMsg.includes("You can only send testing emails")) {
        errMsg = "Resend Sandbox Restriction: Testing emails can only be delivered to your registered Resend email address (joshilakhshansh@gmail.com). To send to other addresses, please verify your custom domain at resend.com/domains.";
      }
      return res.status(resendResponse.status).json({
        success: false,
        error: errMsg,
        details: resendData
      });
    }

    return res.status(200).json({
      success: true,
      message: `OTP successfully sent to ${email} via OTP AUTH API.`,
      otp: otpCode,
      id: resendData.id
    });
  } catch (error) {
    console.error("OTP Auth API handler error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error while sending email via OTP AUTH API."
    });
  }
};
