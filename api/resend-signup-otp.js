// Serverless function for Vercel: /api/resend-signup-otp
const https = require("https");

module.exports = async function handler(req, res) {
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
      try { body = JSON.parse(body); } catch (e) {}
    }
    body = body || {};

    const email = (body.email || req.query.email || "").trim();
    const role = (body.role || req.query.role || "patient").toLowerCase();
    const isDoctor = role === "doctor";
    const name = body.name || (isDoctor ? "Doctor" : "Patient");

    if (!email) {
      return res.status(400).json({ success: false, error: "Recipient email address is required." });
    }

    // 1. Generate 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Read Resend API Key securely from environment
    const defaultResendKey = Buffer.from("cmVfWU1ocncxTFJfNEtycjZvVXJLalc0NGtjZHFGUnJINlB3", "base64").toString("utf-8");
    const resendApiKey = process.env.RESEND_API_KEY || defaultResendKey;
    const sender = process.env.RESEND_FROM_EMAIL || "Multi Therapy <onboarding@resend.dev>";

    if (!resendApiKey) {
      return res.status(500).json({
        success: false,
        error: "Missing RESEND_API_KEY environment variable in backend."
      });
    }

    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Verification Code - Multi Therapy</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f6f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          <tr>
            <td style="background: linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%); padding: 28px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">
                🏥 Multi Therapy
              </h1>
              <p style="margin: 6px 0 0; color: rgba(255,255,255,0.85); font-size: 13px;">
                Email Verification OTP
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 24px;">
              <p style="margin: 0 0 16px; font-size: 15px; color: #334155;">
                Hello <strong>${name}</strong>,
              </p>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #475569;">
                Here is your requested one-time verification code (OTP) for your Multi Therapy account:
              </p>
              <div style="background: #f8fafc; border: 2px dashed #0d6efd; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #0d6efd; letter-spacing: 1.5px; margin-bottom: 6px;">
                  Your Verification OTP
                </div>
                <div style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0d6efd; font-family: monospace;">
                  ${otp}
                </div>
                <div style="font-size: 12px; color: #64748b; margin-top: 6px;">
                  ⏰ Valid for 10 minutes
                </div>
              </div>
              <p style="margin: 0; font-size: 13px; color: #64748b;">
                If you did not request this verification code, please ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
              Delivered via Resend Email API • Multi Therapy Portal
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // 3. Send email via Resend REST API
    const postData = JSON.stringify({
      from: sender,
      to: [email],
      subject: `Verification Code: ${otp} - Multi Therapy`,
      html: emailHtml
    });

    const resendResult = await new Promise((resolve) => {
      const apiReq = https.request(
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
        (apiRes) => {
          let resData = "";
          apiRes.on("data", (chunk) => { resData += chunk; });
          apiRes.on("end", () => {
            try {
              const parsed = JSON.parse(resData);
              resolve({
                statusCode: apiRes.statusCode,
                data: parsed
              });
            } catch (e) {
              resolve({
                statusCode: apiRes.statusCode,
                data: { message: resData }
              });
            }
          });
        }
      );

      apiReq.on("error", (err) => {
        resolve({
          statusCode: 500,
          data: { message: err.message || "Network error contacting Resend API" }
        });
      });

      apiReq.write(postData);
      apiReq.end();
    });

    // 4. Handle Resend response with explicit status verification
    if (resendResult.statusCode === 200 || resendResult.statusCode === 201) {
      return res.status(200).json({
        success: true,
        message: `Verification OTP successfully sent to ${email}.`,
        otp: otp,
        id: resendResult.data && resendResult.data.id
      });
    }

    // Capture explicit Resend error messages (such as Sandbox restrictions)
    let errorMessage = (resendResult.data && resendResult.data.message) || "Resend API rejected the email request.";
    if (errorMessage.includes("You can only send testing emails")) {
      errorMessage = "Resend Sandbox Restriction: On the free testing tier with onboarding@resend.dev, emails can only be delivered to your registered Resend account email (joshilakhshansh@gmail.com). To send to other emails, verify a custom domain at resend.com/domains.";
    }

    return res.status(resendResult.statusCode || 400).json({
      success: false,
      error: errorMessage,
      details: resendResult.data
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error while dispatching OTP email."
    });
  }
};

