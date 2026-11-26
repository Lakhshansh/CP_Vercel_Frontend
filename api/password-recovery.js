// Serverless Controller for Vercel: /api/forgot-password, /api/verify-reset-otp, /api/reset-password
// Comprehensive, Secure, Role-Isolated Multi Therapy Password Recovery Engine
const crypto = require("crypto");
const https = require("https");
let mysql = null;
try {
  mysql = require("mysql2/promise");
} catch (e) {
  mysql = null;
}

/**
 * Creates connection to TiDB Cloud MySQL
 */
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
    return conn;
  } catch (err) {
    console.error("[password-recovery] TiDB connection failed:", err.message);
    return null;
  }
}

/**
 * In-memory fallback store for offline / test environments
 */
const inMemoryResetStore = new Map();

/**
 * Ensures password_reset_otps table exists in TiDB Cloud
 */
async function ensureResetTable(conn) {
  if (!conn) return;
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS password_reset_otps (
        email VARCHAR(255) PRIMARY KEY,
        user_id INT NOT NULL,
        role VARCHAR(50) NOT NULL,
        otp_hash VARCHAR(255) NOT NULL,
        reset_token VARCHAR(255) NOT NULL,
        verified_token VARCHAR(255) NULL,
        expires_at BIGINT NOT NULL,
        attempts INT DEFAULT 0,
        created_at BIGINT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
  } catch (err) {
    console.warn("[password-recovery] ensureResetTable error:", err.message);
  }
}

/**
 * Sends recovery code email using Resend API
 */
async function sendRecoveryEmail(email, recipientName, otpCode, portalRole) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const sender = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || "Multi Therapy <onboarding@resend.dev>";
  const roleName = portalRole === "doctor" ? "Doctor" : "Patient";
  const displayName = recipientName || (portalRole === "doctor" ? "Doctor" : "Patient");

  if (!resendApiKey) {
    console.warn("[password-recovery] RESEND_API_KEY not set. OTP code for test/offline:", otpCode);
    return { success: true, simulated: true };
  }

  const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Recovery Code - Multi Therapy</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f4f8; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(11,43,80,0.1); border: 1px solid #e2e8f0;">
          <tr>
            <td style="background: linear-gradient(135deg, #0B2B50 0%, #103463 60%, #1266D5 100%); padding: 28px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.3px;">
                Multi Therapy Healthcare Network
              </h1>
              <p style="margin: 6px 0 0; color: #93c5fd; font-size: 13.5px; font-weight: 500;">
                ${roleName} Password Recovery Verification
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 24px;">
              <h2 style="margin: 0 0 14px; color: #0B2B50; font-size: 18px; font-weight: 700;">
                Hello ${displayName},
              </h2>
              <p style="margin: 0 0 20px; font-size: 14.5px; line-height: 1.6; color: #475569;">
                We received a request to reset the password for your Multi Therapy <strong>${roleName}</strong> account.
                Use the secure 6-digit verification code below to proceed:
              </p>
              <div style="background: #f8fafc; border: 2px dashed #1266D5; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
                <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0B2B50; font-family: monospace;">
                  ${otpCode}
                </span>
                <p style="margin: 8px 0 0; font-size: 12.5px; color: #64748b; font-weight: 600;">
                  ⏱️ Valid for 5 minutes only
                </p>
              </div>
              <p style="margin: 0 0 12px; font-size: 13.5px; line-height: 1.5; color: #64748b;">
                If you did not request a password reset, you can safely ignore this email. Your existing credentials remain completely secure.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 18px 32px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
              &copy; 2026 Multi Therapy Network. All rights reserved.<br>
              A-79, Nemi Nagar, Gandhi Path Road, Vaishali Nagar, Jaipur, Rajasthan – 302021
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return new Promise((resolve) => {
    const postData = JSON.stringify({
      from: sender,
      to: [email],
      subject: `Multi Therapy - Password Recovery Code: ${otpCode}`,
      html: emailHtml
    });

    const req = https.request(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData)
        },
        timeout: 8000
      },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true });
          } else {
            console.error("[password-recovery] Resend error:", raw);
            resolve({ success: false, error: raw });
          }
        });
      }
    );

    req.on("error", (err) => {
      console.error("[password-recovery] Resend HTTPS error:", err.message);
      resolve({ success: false, error: err.message });
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Standard Werkzeug scrypt password hasher compatible with Python check_password_hash
 */
function hashPasswordWerkzeug(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024
  });
  return `scrypt:32768:8:1$${salt}$${derived.toString("hex")}`;
}

/**
 * Sets standard CORS headers
 */
function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );
}

/**
 * STEP 1: Request Password Recovery Code
 * Action: POST /api/forgot-password
 */
async function handleForgotPasswordRequest(req, res) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Use POST." });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch (e) {}
    }
    body = body || {};

    const rawIdentifier = (body.identifier || body.email || body.username || "").toString().trim();
    if (!rawIdentifier) {
      return res.status(400).json({
        success: false,
        error: "Please enter your registered username or email address."
      });
    }

    // Determine target portal context
    const reqUrl = (req.url || "").toLowerCase();
    const referrer = (req.headers["referer"] || req.headers["referrer"] || "").toLowerCase();
    let portal = (body.portal || body.role || "").toLowerCase();
    if (!portal) {
      if (reqUrl.includes("doctor") || referrer.includes("doctor-forgot")) {
        portal = "doctor";
      } else {
        portal = "patient";
      }
    }

    const conn = await getDbConnection();
    let user = null;

    if (conn) {
      await ensureResetTable(conn);
      try {
        const [rows] = await conn.query(
          `SELECT user_id, username, email, role 
           FROM users 
           WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?) 
           LIMIT 1`,
          [rawIdentifier, rawIdentifier]
        );
        if (rows && rows.length > 0) {
          user = rows[0];
        }
      } catch (dbErr) {
        console.error("[password-recovery] User lookup error:", dbErr.message);
      }
    } else {
      // In offline / test mode
      user = {
        user_id: 999,
        username: rawIdentifier.includes("@") ? rawIdentifier.split("@")[0] : rawIdentifier,
        email: rawIdentifier.includes("@") ? rawIdentifier : `${rawIdentifier}@test.com`,
        role: portal === "doctor" ? "Doctor" : "Patient"
      };
    }

    // Generic safe response to protect against user enumeration
    const safeGenericMessage = "If an account matching that username or email exists, a 6-digit recovery code has been sent to the registered email address.";
    const safeDummyToken = crypto.randomBytes(24).toString("hex");

    if (!user) {
      if (conn) await conn.end();
      return res.status(200).json({
        success: true,
        message: safeGenericMessage,
        reset_token: safeDummyToken
      });
    }

    const userRole = (user.role || "").toLowerCase();
    const isAdmin = userRole === "admin" || userRole === "superadmin" || (user.username || "").toLowerCase() === "admin";
    const isDoctor = !isAdmin && (userRole === "doctor" || userRole === "practitioner");
    const isPatient = !isAdmin && !isDoctor;

    // Strict Role-Based Security:
    // 1. Admin accounts cannot be reset via public portal
    if (isAdmin) {
      if (conn) await conn.end();
      return res.status(200).json({
        success: true,
        message: safeGenericMessage,
        reset_token: safeDummyToken
      });
    }

    // 2. Patient recovery can reset Patient accounts only
    if (portal === "patient" && !isPatient) {
      if (conn) await conn.end();
      return res.status(200).json({
        success: true,
        message: safeGenericMessage,
        reset_token: safeDummyToken
      });
    }

    // 3. Doctor recovery can reset Doctor accounts only
    if (portal === "doctor" && !isDoctor) {
      if (conn) await conn.end();
      return res.status(200).json({
        success: true,
        message: safeGenericMessage,
        reset_token: safeDummyToken
      });
    }

    const now = Date.now();
    const userEmail = (user.email || "").toLowerCase();

    // Check 60-second Resend Cooldown
    if (conn) {
      try {
        const [existing] = await conn.query(
          "SELECT created_at FROM password_reset_otps WHERE email = ? LIMIT 1",
          [userEmail]
        );
        if (existing && existing.length > 0) {
          const lastCreated = Number(existing[0].created_at || 0);
          const elapsed = now - lastCreated;
          if (elapsed < 60000) {
            const waitSeconds = Math.ceil((60000 - elapsed) / 1000);
            await conn.end();
            return res.status(429).json({
              success: false,
              error: `Please wait ${waitSeconds} seconds before requesting a new recovery code.`
            });
          }
        }
      } catch (e) {
        console.warn("[password-recovery] Cooldown check warning:", e.message);
      }
    } else {
      const memoryRecord = inMemoryResetStore.get(userEmail);
      if (memoryRecord && (now - memoryRecord.created_at < 60000)) {
        const waitSeconds = Math.ceil((60000 - (now - memoryRecord.created_at)) / 1000);
        return res.status(429).json({
          success: false,
          error: `Please wait ${waitSeconds} seconds before requesting a new recovery code.`
        });
      }
    }

    // Generate secure 6-digit OTP & 5-minute expiry
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash("sha256").update(otpCode).digest("hex");
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = now + 5 * 60 * 1000; // 5 minutes

    if (conn) {
      try {
        await conn.query(
          `REPLACE INTO password_reset_otps 
           (email, user_id, role, otp_hash, reset_token, verified_token, expires_at, attempts, created_at)
           VALUES (?, ?, ?, ?, ?, NULL, ?, 0, ?)`,
          [userEmail, user.user_id, user.role || (portal === "doctor" ? "Doctor" : "Patient"), otpHash, resetToken, expiresAt, now]
        );
      } catch (dbErr) {
        console.error("[password-recovery] DB store error:", dbErr.message);
      } finally {
        await conn.end();
      }
    } else {
      inMemoryResetStore.set(userEmail, {
        email: userEmail,
        user_id: user.user_id,
        role: user.role || (portal === "doctor" ? "Doctor" : "Patient"),
        otp_hash: otpHash,
        reset_token: resetToken,
        verified_token: null,
        expires_at: expiresAt,
        attempts: 0,
        created_at: now
      });
    }

    // Dispatch OTP Email
    await sendRecoveryEmail(userEmail, user.username, otpCode, portal);

    return res.status(200).json({
      success: true,
      message: `A 6-digit recovery code has been sent to your registered email address (${userEmail.replace(/(.{2})(.*)(@.*)/, "$1***$3")}).`,
      reset_token: resetToken
    });

  } catch (err) {
    console.error("[password-recovery] Server error:", err);
    return res.status(500).json({
      success: false,
      error: "Unable to process password recovery request. Please try again shortly."
    });
  }
}

/**
 * STEP 2: Verify 6-digit Recovery Code
 * Action: POST /api/verify-reset-otp
 */
async function handleVerifyResetOtp(req, res) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Use POST." });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch (e) {}
    }
    body = body || {};

    const otp = (body.otp || body.code || "").toString().trim();
    const resetToken = (body.reset_token || "").toString().trim();
    const identifier = (body.identifier || body.email || "").toString().trim().toLowerCase();

    if (!otp || !/^[0-9]{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        error: "Please enter a valid 6-digit verification code."
      });
    }

    const conn = await getDbConnection();
    let resetRecord = null;

    if (conn) {
      await ensureResetTable(conn);
      try {
        let querySql = "SELECT * FROM password_reset_otps WHERE reset_token = ? LIMIT 1";
        let queryParams = [resetToken];

        if (!resetToken && identifier) {
          querySql = "SELECT * FROM password_reset_otps WHERE LOWER(email) = ? LIMIT 1";
          queryParams = [identifier];
        }

        const [rows] = await conn.query(querySql, queryParams);
        if (rows && rows.length > 0) {
          resetRecord = rows[0];
        }
      } catch (dbErr) {
        console.error("[password-recovery] OTP lookup error:", dbErr.message);
      }
    } else {
      for (const val of inMemoryResetStore.values()) {
        if (val.reset_token === resetToken || (identifier && val.email === identifier)) {
          resetRecord = val;
          break;
        }
      }
    }

    if (!resetRecord) {
      if (conn) await conn.end();
      return res.status(400).json({
        success: false,
        error: "Invalid or expired recovery session. Please request a new recovery code."
      });
    }

    const now = Date.now();

    // 1. Check Expiration (5 minutes)
    if (now > Number(resetRecord.expires_at)) {
      if (conn) {
        await conn.query("DELETE FROM password_reset_otps WHERE email = ?", [resetRecord.email]);
        await conn.end();
      } else {
        inMemoryResetStore.delete(resetRecord.email);
      }
      return res.status(400).json({
        success: false,
        error: "The recovery code has expired (5-minute limit). Please request a fresh code."
      });
    }

    // 2. Check Attempt Limit (Max 5 attempts)
    if (Number(resetRecord.attempts) >= 5) {
      if (conn) {
        await conn.query("DELETE FROM password_reset_otps WHERE email = ?", [resetRecord.email]);
        await conn.end();
      } else {
        inMemoryResetStore.delete(resetRecord.email);
      }
      return res.status(429).json({
        success: false,
        error: "Too many failed attempts. For your security, this code has been invalidated. Please request a new recovery code."
      });
    }

    // 3. Verify OTP Hash
    const enteredHash = crypto.createHash("sha256").update(otp).digest("hex");
    if (enteredHash !== resetRecord.otp_hash) {
      const newAttempts = Number(resetRecord.attempts) + 1;
      const remaining = Math.max(0, 5 - newAttempts);

      if (conn) {
        await conn.query(
          "UPDATE password_reset_otps SET attempts = ? WHERE email = ?",
          [newAttempts, resetRecord.email]
        );
        await conn.end();
      } else {
        resetRecord.attempts = newAttempts;
      }

      return res.status(400).json({
        success: false,
        error: remaining > 0
          ? `Invalid verification code. ${remaining} attempt(s) remaining.`
          : "Invalid verification code. Maximum attempts reached. Please request a new code."
      });
    }

    // 4. Success! Generate one-time verified token for Step 3
    const verifiedToken = crypto.randomBytes(32).toString("hex");

    if (conn) {
      await conn.query(
        "UPDATE password_reset_otps SET verified_token = ?, otp_hash = '' WHERE email = ?",
        [verifiedToken, resetRecord.email]
      );
      await conn.end();
    } else {
      resetRecord.verified_token = verifiedToken;
      resetRecord.otp_hash = "";
    }

    return res.status(200).json({
      success: true,
      message: "Verification code confirmed successfully! Please create your new password.",
      verified_token: verifiedToken
    });

  } catch (err) {
    console.error("[password-recovery] Verify OTP error:", err);
    return res.status(500).json({
      success: false,
      error: "Unable to verify recovery code. Please try again."
    });
  }
}

/**
 * STEP 3: Set New Password
 * Action: POST /api/reset-password
 */
async function handleResetPassword(req, res) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Use POST." });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch (e) {}
    }
    body = body || {};

    const password = (body.password || body.new_password || "").toString();
    const confirmPassword = (body.confirm_password || body.confirmPassword || "").toString();
    const verifiedToken = (body.verified_token || "").toString().trim();

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters in length."
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: "Passwords do not match. Please ensure both fields are identical."
      });
    }

    if (!verifiedToken) {
      return res.status(400).json({
        success: false,
        error: "Missing verified authorization token. Please verify your email code first."
      });
    }

    const conn = await getDbConnection();
    let resetRecord = null;

    if (conn) {
      await ensureResetTable(conn);
      try {
        const [rows] = await conn.query(
          "SELECT * FROM password_reset_otps WHERE verified_token = ? LIMIT 1",
          [verifiedToken]
        );
        if (rows && rows.length > 0) {
          resetRecord = rows[0];
        }
      } catch (dbErr) {
        console.error("[password-recovery] Verified token lookup error:", dbErr.message);
      }
    } else {
      for (const val of inMemoryResetStore.values()) {
        if (val.verified_token === verifiedToken) {
          resetRecord = val;
          break;
        }
      }
    }

    if (!resetRecord) {
      if (conn) await conn.end();
      return res.status(400).json({
        success: false,
        error: "Invalid or expired password reset session. Please complete email verification again."
      });
    }

    const now = Date.now();
    if (now > Number(resetRecord.expires_at)) {
      if (conn) {
        await conn.query("DELETE FROM password_reset_otps WHERE email = ?", [resetRecord.email]);
        await conn.end();
      } else {
        inMemoryResetStore.delete(resetRecord.email);
      }
      return res.status(400).json({
        success: false,
        error: "Password reset session has expired. Please initiate password recovery again."
      });
    }

    // Role boundary validation: Prevent privilege escalation
    const targetRole = (resetRecord.role || "").toLowerCase();
    if (targetRole === "admin" || targetRole === "superadmin") {
      if (conn) await conn.end();
      return res.status(403).json({
        success: false,
        error: "Unauthorized: Administrative accounts must follow secure internal admin recovery."
      });
    }

    // Hash password using standard Werkzeug scrypt format
    const hashedPassword = hashPasswordWerkzeug(password);

    if (conn) {
      try {
        // Strictly update password column ONLY, preserving role and all other attributes
        await conn.query(
          "UPDATE users SET password = ? WHERE user_id = ?",
          [hashedPassword, resetRecord.user_id]
        );

        // Delete used reset record to prevent token reuse
        await conn.query(
          "DELETE FROM password_reset_otps WHERE email = ?",
          [resetRecord.email]
        );
      } catch (dbErr) {
        console.error("[password-recovery] Password update error:", dbErr.message);
        await conn.end();
        return res.status(500).json({
          success: false,
          error: "Failed to update password in database. Please try again."
        });
      } finally {
        await conn.end();
      }
    } else {
      inMemoryResetStore.delete(resetRecord.email);
    }

    const isDoctor = targetRole === "doctor" || targetRole === "practitioner";
    const redirectUrl = isDoctor ? "doctor-login.html" : "login.html";

    return res.status(200).json({
      success: true,
      message: "Password updated successfully! Redirecting to login...",
      redirect_url: redirectUrl
    });

  } catch (err) {
    console.error("[password-recovery] Reset password error:", err);
    return res.status(500).json({
      success: false,
      error: "Unable to update password. Please try again."
    });
  }
}

/**
 * Default multi-action handler
 */
async function handler(req, res) {
  const url = (req.url || "").toLowerCase();
  const action = (req.query && req.query.action) ? req.query.action.toLowerCase() : "";

  if (action === "verify" || url.includes("verify-reset-otp") || url.includes("verify")) {
    return handleVerifyResetOtp(req, res);
  }
  if (action === "reset" || url.includes("reset-password") || url.includes("reset")) {
    return handleResetPassword(req, res);
  }
  return handleForgotPasswordRequest(req, res);
}

module.exports = handler;
handler.handler = handler;
handler.handleForgotPasswordRequest = handleForgotPasswordRequest;
handler.handleVerifyResetOtp = handleVerifyResetOtp;
handler.handleResetPassword = handleResetPassword;
