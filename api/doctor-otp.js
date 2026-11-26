// Serverless function for Vercel: /api/doctor/send-otp and /api/doctor/verify-otp
// Dedicated Doctor Instant OTP Authentication Controller
const crypto = require("crypto");
const https = require("https");
let mysql = null;
try {
  mysql = require("mysql2/promise");
} catch (e) {
  mysql = null;
}

/**
 * Creates and returns a connection to TiDB Cloud MySQL
 */
async function getDbConnection() {
  if (!mysql) return null;
  const host = process.env.DB_HOST || "gateway01.ap-northeast-1.prod.aws.tidbcloud.com";
  const user = process.env.DB_USER || "4EUekCnG6wabVPE.root";
  const password = process.env.DB_PASSWORD || "";
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
    return conn;
  } catch (err) {
    console.error("[doctor-otp] DB connection error:", err.message);
    return null;
  }
}

/**
 * Ensures doctor_login_otps table exists
 */
async function ensureOtpTable(conn) {
  if (!conn) return;
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS doctor_login_otps (
        email VARCHAR(255) PRIMARY KEY,
        otp_hash VARCHAR(255) NOT NULL,
        expires_at BIGINT NOT NULL,
        attempts INT DEFAULT 0,
        created_at BIGINT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
  } catch (err) {
    console.warn("[doctor-otp] ensureOtpTable error:", err.message);
  }
}

/**
 * Sends OTP email using Resend API
 */
async function sendDoctorOtpEmail(email, doctorName, otpCode) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const sender = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || "Multi Therapy <onboarding@resend.dev>";
  const displayName = doctorName ? (doctorName.startsWith("Dr.") ? doctorName : `Dr. ${doctorName}`) : "Doctor";

  const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Doctor Login OTP - Multi Therapy</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f4f8; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(11,43,80,0.1); border: 1px solid #e2e8f0;">
          <tr>
            <td style="background: linear-gradient(135deg, #0B2B50 0%, #103463 60%, #0d6efd 100%); padding: 28px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.3px;">
                🩺 Multi Therapy Healthcare Network
              </h1>
              <p style="margin: 6px 0 0; color: #93c5fd; font-size: 13.5px; font-weight: 500;">
                Doctor Portal Instant Authentication
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 24px;">
              <h2 style="margin: 0 0 14px; color: #0B2B50; font-size: 18px; font-weight: 700;">
                Hello ${displayName},
              </h2>
              <p style="margin: 0 0 20px; font-size: 14.5px; line-height: 1.6; color: #475569;">
                You requested an <strong>Instant OTP Login</strong> to access your Multi Therapy Doctor Portal. Use the 6-digit verification code below to complete your sign-in:
              </p>
              <div style="background: #f8fafc; border: 2px dashed #0d6efd; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
                <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0B2B50; font-family: monospace;">
                  ${otpCode}
                </span>
              </div>
              <p style="margin: 0 0 16px; font-size: 13px; color: #64748b; line-height: 1.5;">
                ⏱️ This verification code is valid for <strong>5 minutes</strong>. For security, never share this code with anyone.
              </p>
              <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 14px; border-radius: 6px; margin: 20px 0 0;">
                <p style="margin: 0; font-size: 12px; color: #92400e; line-height: 1.4;">
                  <strong>Security Notice:</strong> If you did not request this login code, your account credentials remain secure. Please alert support at info@multitherapy.org immediately.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 18px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                &copy; 2026 Multi Therapy - Every Individual Deserves Better Care.
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
    subject: `Your Multi Therapy Doctor Login Code: ${otpCode}`,
    html: emailHtml
  });

  return new Promise((resolve) => {
    const req = https.request(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData)
        },
        timeout: 12000
      },
      (res) => {
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300 && parsed.id) {
              resolve({ success: true, id: parsed.id });
            } else {
              console.warn("[doctor-otp] Resend API response:", res.statusCode, data);
              resolve({ success: false, error: parsed.message || "Resend delivery failed" });
            }
          } catch (e) {
            resolve({ success: false, error: data });
          }
        });
      }
    );

    req.on("error", (err) => {
      console.error("[doctor-otp] Resend request error:", err.message);
      resolve({ success: false, error: err.message });
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Main Serverless Request Handler
 */
module.exports = async function handler(req, res) {
  // CORS configuration
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
      try { body = JSON.parse(body); } catch (_) {}
    }
    body = body || {};

    const url = (req.url || "").toLowerCase();
    const query = req.query || {};
    let action = (query.action || body.action || "").toLowerCase();

    if (!action) {
      if (url.includes("verify") || body.otp || body.code) {
        action = "verify";
      } else {
        action = "send";
      }
    }

    const conn = await getDbConnection();
    if (!conn) {
      return res.status(500).json({
        success: false,
        error: "Database connectivity temporarily unavailable. Please try again shortly."
      });
    }

    await ensureOtpTable(conn);

    // ========================================================================
    // ACTION: SEND OTP
    // ========================================================================
    if (action === "send" || action === "send-otp") {
      const email = (body.email || "").toString().trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!email || !emailRegex.test(email)) {
        await conn.end();
        return res.status(400).json({
          success: false,
          error: "Please provide a valid registered doctor email address."
        });
      }

      // 1. Verify that email belongs to an existing registered doctor
      const [doctorRows] = await conn.query(
        `SELECT d.doctor_id, d.name, d.email, d.specialization, d.contact, d.user_id,
                u.username, u.role
         FROM doctors d
         LEFT JOIN users u ON u.user_id = d.user_id
         WHERE LOWER(d.email) = ?
         LIMIT 1`,
        [email]
      );

      let doctorRecord = doctorRows && doctorRows.length > 0 ? doctorRows[0] : null;

      // Fallback: Check users table for user with role = 'Doctor'
      if (!doctorRecord) {
        const [userRows] = await conn.query(
          `SELECT user_id, username, email, role
           FROM users
           WHERE LOWER(email) = ? AND LOWER(role) IN ('doctor', 'practitioner')
           LIMIT 1`,
          [email]
        );
        if (userRows && userRows.length > 0) {
          doctorRecord = {
            doctor_id: userRows[0].user_id,
            user_id: userRows[0].user_id,
            name: userRows[0].username,
            email: userRows[0].email,
            username: userRows[0].username,
            role: "Doctor",
            specialization: "Clinical Specialist"
          };
        }
      }

      // If NOT a registered doctor, reject with clear error message
      if (!doctorRecord) {
        await conn.end();
        return res.status(404).json({
          success: false,
          error: "No registered doctor account found with this email address. Instant OTP login is restricted to authorized Doctors only."
        });
      }

      // 2. Check 60-second resend cooldown
      const [existingOtpRows] = await conn.query(
        "SELECT created_at, expires_at FROM doctor_login_otps WHERE email = ? LIMIT 1",
        [email]
      );

      const now = Date.now();
      if (existingOtpRows && existingOtpRows.length > 0) {
        const lastCreated = Number(existingOtpRows[0].created_at || 0);
        const elapsed = now - lastCreated;
        if (elapsed < 60000) {
          const remainingSeconds = Math.ceil((60000 - elapsed) / 1000);
          await conn.end();
          return res.status(429).json({
            success: false,
            error: `Please wait ${remainingSeconds} seconds before requesting a new OTP.`
          });
        }
      }

      // 3. Generate secure 6-digit OTP code & 5-minute expiry
      const otpCode = crypto.randomInt(100000, 999999).toString();
      const otpHash = crypto.createHash("sha256").update(otpCode).digest("hex");
      const expiresAt = now + 5 * 60 * 1000; // 5 minutes

      // Store in database
      await conn.query(
        `REPLACE INTO doctor_login_otps (email, otp_hash, expires_at, attempts, created_at)
         VALUES (?, ?, ?, 0, ?)`,
        [email, otpHash, expiresAt, now]
      );

      await conn.end();

      // 4. Send email to doctor
      const mailResult = await sendDoctorOtpEmail(email, doctorRecord.name, otpCode);

      return res.status(200).json({
        success: true,
        message: `A 6-digit verification code has been sent to ${email}. Valid for 5 minutes.`,
        email: email,
        cooldown: 60
      });
    }

    // ========================================================================
    // ACTION: VERIFY OTP
    // ========================================================================
    if (action === "verify" || action === "verify-otp") {
      const email = (body.email || "").toString().trim().toLowerCase();
      const otp = (body.otp || body.code || body.email_otp || "").toString().trim();

      if (!email) {
        await conn.end();
        return res.status(400).json({
          success: false,
          error: "Doctor email address is required."
        });
      }

      if (!otp || !/^[0-9]{6}$/.test(otp)) {
        await conn.end();
        return res.status(400).json({
          success: false,
          error: "Please enter the valid 6-digit numeric OTP code sent to your email."
        });
      }

      // 1. Fetch OTP record
      const [otpRows] = await conn.query(
        "SELECT email, otp_hash, expires_at, attempts, created_at FROM doctor_login_otps WHERE email = ? LIMIT 1",
        [email]
      );

      if (!otpRows || otpRows.length === 0) {
        await conn.end();
        return res.status(400).json({
          success: false,
          error: "No active verification code found for this email. Please request a new OTP."
        });
      }

      const otpRec = otpRows[0];
      const now = Date.now();

      // 2. Check Expiry (5 minutes)
      if (now > Number(otpRec.expires_at)) {
        await conn.query("DELETE FROM doctor_login_otps WHERE email = ?", [email]);
        await conn.end();
        return res.status(400).json({
          success: false,
          error: "Verification code has expired. Please request a new OTP."
        });
      }

      // 3. Check Attempt Limit (Max 5 attempts)
      if (Number(otpRec.attempts) >= 5) {
        await conn.query("DELETE FROM doctor_login_otps WHERE email = ?", [email]);
        await conn.end();
        return res.status(429).json({
          success: false,
          error: "Too many failed attempts. For security reasons, this OTP has been invalidated. Please request a new OTP."
        });
      }

      // 4. Verify OTP Hash
      const enteredHash = crypto.createHash("sha256").update(otp).digest("hex");
      if (enteredHash !== otpRec.otp_hash) {
        const newAttempts = Number(otpRec.attempts) + 1;
        await conn.query("UPDATE doctor_login_otps SET attempts = ? WHERE email = ?", [newAttempts, email]);
        await conn.end();
        const remaining = Math.max(0, 5 - newAttempts);
        return res.status(400).json({
          success: false,
          error: remaining > 0
            ? `Invalid OTP code. ${remaining} attempt(s) remaining.`
            : "Invalid OTP code. Maximum attempts reached. Please request a new OTP."
        });
      }

      // 5. Success! Invalidate OTP immediately to prevent reuse
      await conn.query("DELETE FROM doctor_login_otps WHERE email = ?", [email]);

      // 6. Retrieve full doctor details
      const [docRows] = await conn.query(
        `SELECT d.doctor_id, d.name, d.email, d.specialization, d.contact, d.user_id, d.experience_years,
                u.username, u.role
         FROM doctors d
         LEFT JOIN users u ON u.user_id = d.user_id
         WHERE LOWER(d.email) = ?
         LIMIT 1`,
        [email]
      );

      let doctorData = docRows && docRows.length > 0 ? docRows[0] : null;

      if (!doctorData) {
        const [uRows] = await conn.query(
          "SELECT user_id, username, email, role FROM users WHERE LOWER(email) = ? LIMIT 1",
          [email]
        );
        if (uRows && uRows.length > 0) {
          doctorData = {
            doctor_id: uRows[0].user_id,
            user_id: uRows[0].user_id,
            name: uRows[0].username,
            email: uRows[0].email,
            username: uRows[0].username,
            role: "Doctor",
            specialization: "Clinical Specialist",
            contact: ""
          };
        }
      }

      await conn.end();

      const docName = doctorData.name
        ? (doctorData.name.startsWith("Dr.") ? doctorData.name : `Dr. ${doctorData.name}`)
        : `Dr. ${doctorData.username || "Practitioner"}`;

      const userPayload = {
        user_id: doctorData.user_id || doctorData.doctor_id,
        doctor_id: doctorData.doctor_id,
        username: doctorData.username || doctorData.email.split("@")[0],
        email: doctorData.email,
        role: "Doctor",
        doctor_name: docName,
        doctor_specialization: doctorData.specialization || "Clinical Specialist",
        contact: doctorData.contact || "",
        experience_years: doctorData.experience_years || 0
      };

      return res.status(200).json({
        success: true,
        message: "Doctor verified successfully! Redirecting to Doctor Portal...",
        redirect_url: "doctor-home.html",
        user: userPayload
      });
    }

    await conn.end();
    return res.status(400).json({
      success: false,
      error: `Unknown action '${action}'. Supported actions: 'send', 'verify'.`
    });

  } catch (err) {
    console.error("[doctor-otp] Server error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "An unexpected error occurred during OTP processing."
    });
  }
};
