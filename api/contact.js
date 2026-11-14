// Serverless function for Vercel: /api/contact
// Handles contact inquiries, form validation, database logging, and email delivery via Resend
const https = require("https");
let mysql = null;
try {
  mysql = require("mysql2/promise");
} catch (e) {
  mysql = null;
}

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || "Multi Therapy <onboarding@resend.dev>";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "info@multitherapy.org";
const NOTIFICATION_FALLBACK_EMAIL = "joshilakhshansh@gmail.com";

async function getDbConnection() {
  if (!mysql) return null;
  const host = process.env.DB_HOST || "gateway01.ap-northeast-1.prod.aws.tidbcloud.com";
  const user = process.env.DB_USER || "4EUekCnG6wabVPE.root";
  const password = process.env.DB_PASSWORD || "HA8jMiinRaOyEdgP";
  const database = process.env.DB_NAME || "cerebral_palsy_db";
  const port = parseInt(process.env.DB_PORT || "4000", 10);

  try {
    const conn = await mysql.createConnection({
      host,
      user,
      password,
      database,
      port,
      ssl: { rejectUnauthorized: false },
      connectTimeout: 8000
    });

    // Ensure contact_inquiries table exists
    await conn.query(`
      CREATE TABLE IF NOT EXISTS contact_inquiries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50) DEFAULT NULL,
        user_type VARCHAR(50) DEFAULT 'general',
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'New',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    return conn;
  } catch (err) {
    console.warn("[contact-api] TiDB connection failed:", err.message);
    return null;
  }
}

// Dispatches notification email via Resend API
function sendResendEmail(toEmail, subject, htmlContent) {
  return new Promise((resolve) => {
    if (!RESEND_API_KEY) {
      console.warn("[contact-api] RESEND_API_KEY is missing, skipping email dispatch.");
      return resolve({ success: false, error: "Missing RESEND_API_KEY" });
    }

    const postData = JSON.stringify({
      from: EMAIL_FROM,
      to: [toEmail],
      subject: subject,
      html: htmlContent
    });

    const req = https.request("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData)
      },
      timeout: 8000
    }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, id: parsed.id });
          } else {
            resolve({ success: false, error: parsed.message || `Status ${res.statusCode}` });
          }
        } catch (e) {
          resolve({ success: false, error: body });
        }
      });
    });

    req.on("error", (err) => resolve({ success: false, error: err.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ success: false, error: "Request timed out" });
    });

    req.write(postData);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({
      status: "online",
      service: "Multi Therapy Contact API",
      supported_methods: ["POST", "OPTIONS"]
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Use POST." });
  }

  let body = req.body || {};
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }

  const name = (body.name || "").toString().trim();
  const email = (body.email || "").toString().trim().toLowerCase();
  const phone = (body.phone || "").toString().trim();
  const userType = (body.role || body.userType || "general").toString().trim();
  const subject = (body.subject || "").toString().trim();
  const message = (body.message || "").toString().trim();

  // 1. Full Name required validation
  if (!name || name.length < 2) {
    return res.status(400).json({
      success: false,
      error: "Full Name is required (minimum 2 characters)."
    });
  }

  // 2. Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: "A valid email address is required (e.g. name@example.com)."
    });
  }

  // 3. Phone number validation (if provided)
  if (phone) {
    const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, "");
    if (!/^\d{7,15}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        error: "Please enter a valid phone number (minimum 7 to 15 digits) or leave it empty."
      });
    }
  }

  // 4. Subject required validation
  if (!subject || subject.length < 3) {
    return res.status(400).json({
      success: false,
      error: "Subject is required (minimum 3 characters)."
    });
  }

  // 5. Message required validation
  if (!message || message.length < 10) {
    return res.status(400).json({
      success: false,
      error: "Message is required (minimum 10 characters)."
    });
  }

  // 6. Save to TiDB Cloud Database
  let inquiryId = null;
  const conn = await getDbConnection();
  if (conn) {
    try {
      const [insertResult] = await conn.query(
        `INSERT INTO contact_inquiries (name, email, phone, user_type, subject, message)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, email, phone || null, userType, subject, message]
      );
      inquiryId = insertResult.insertId;
      await conn.end();
    } catch (dbErr) {
      console.warn("[contact-api] Database insert warning:", dbErr.message);
      try { await conn.end(); } catch (e) {}
    }
  }

  // 7. Dispatch Email Notifications via Resend
  const emailSubject = `[Multi Therapy Contact] ${subject} - from ${name}`;
  const notificationHtml = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 14px; background: #ffffff;">
      <div style="background: #06172F; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 24px;">
        <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800;">Multi Therapy</h2>
        <p style="color: #38bdf8; margin: 6px 0 0; font-size: 13px; font-weight: 600;">NEW CLINICAL CONTACT INQUIRY</p>
      </div>

      <p style="font-size: 15px; color: #1e293b; margin-bottom: 18px;">
        A new clinical support message has been submitted on the Multi Therapy website.
      </p>

      <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 18px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 120px;">Full Name:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Email:</td>
            <td style="padding: 6px 0; color: #0284c7; font-weight: 700;"><a href="mailto:${email}" style="color: #0284c7; text-decoration: none;">${email}</a></td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Phone / WhatsApp:</td>
            <td style="padding: 6px 0; color: #0f172a;">${phone || "Not provided"}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">User Role:</td>
            <td style="padding: 6px 0; color: #0f172a;"><span style="background: #e0f2fe; color: #0369a1; padding: 3px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase;">${userType}</span></td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Subject:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${subject}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Inquiry ID:</td>
            <td style="padding: 6px 0; color: #64748b;">#MSG-${inquiryId || Date.now()}</td>
          </tr>
        </table>

        <div style="margin-top: 16px; padding-top: 14px; border-top: 1px solid #e2e8f0;">
          <strong style="color: #0f172a; font-size: 13.5px; display: block; margin-bottom: 6px;">Message Content:</strong>
          <div style="background: #ffffff; padding: 12px 14px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 14px; color: #334155; line-height: 1.6; white-space: pre-wrap;">${message}</div>
        </div>
      </div>

      <div style="text-align: center; margin-bottom: 16px;">
        <a href="mailto:${email}?subject=Re:%20${encodeURIComponent(subject)}" style="background: #0d6efd; color: #ffffff; padding: 10px 22px; border-radius: 9999px; text-decoration: none; font-weight: 700; font-size: 13.5px; display: inline-block;">
          Reply to ${name}
        </a>
      </div>

      <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; color: #94a3b8; font-size: 12px;">
        Every Individual Deserves Better Care • Multi Therapy Clinical Support Network<br>
        Approach Autism Society, Vaishali Nagar, Jaipur, Rajasthan – 302021
      </div>
    </div>
  `;

  // Send to fallback verified address first (to ensure Resend delivery in test/production)
  let emailDelivery = await sendResendEmail(NOTIFICATION_FALLBACK_EMAIL, emailSubject, notificationHtml);

  // If support email is different and custom domain is active, also dispatch there
  if (SUPPORT_EMAIL && SUPPORT_EMAIL !== NOTIFICATION_FALLBACK_EMAIL && !SUPPORT_EMAIL.includes("multitherapy.org")) {
    await sendResendEmail(SUPPORT_EMAIL, emailSubject, notificationHtml);
  }

  // Return success response to client
  return res.status(200).json({
    success: true,
    message: `Thank you, ${name}! Your inquiry has been received by Multi Therapy clinical support. We will get back to you at ${email} shortly.`,
    inquiry_id: inquiryId || Date.now(),
    email_delivered: emailDelivery.success,
    delivery_id: emailDelivery.id || null
  });
};

