// Serverless function for Vercel: /api/verify-signup-otp
// Verifies 6-digit signup OTP against TiDB Cloud MySQL (signup_otps / users)
// and marks the patient account as otp_verified = 1.

const https = require("https");
const http = require("http");
let mysql = null;
try { mysql = require("mysql2/promise"); } catch (e) { mysql = null; }

async function getDb() {
  if (!mysql) return null;
  try {
    return await mysql.createConnection({
      host:     process.env.DB_HOST     || "gateway01.ap-northeast-1.prod.aws.tidbcloud.com",
      user:     process.env.DB_USER     || "4EUekCnG6wabVPE.root",
      password: process.env.DB_PASSWORD || "HA8jMiinRaOyEdgP",
      database: process.env.DB_NAME     || "cerebral_palsy_db",
      port:     parseInt(process.env.DB_PORT || "4000", 10),
      ssl:      { rejectUnauthorized: false },
      connectTimeout: 8000
    });
  } catch (e) {
    console.warn("[verify-signup-otp] DB connect failed:", e.message);
    return null;
  }
}

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

    const email = (body.email || "").toString().trim().toLowerCase();
    const code = (body.email_otp || body.otp || body.code || "").toString().trim();

    if (!email) {
      return res.status(400).json({ success: false, error: "Email address is required for verification." });
    }

    if (!code || !/^[0-9]{6}$/.test(code)) {
      return res.status(400).json({ success: false, error: "Please enter a valid 6-digit verification code." });
    }

    // 1. Verify against TiDB Cloud MySQL signup_otps table
    const db = await getDb();
    if (db) {
      try {
        await db.execute(`
          CREATE TABLE IF NOT EXISTS signup_otps (
            email VARCHAR(255) PRIMARY KEY,
            user_id INT NULL,
            otp_code VARCHAR(16) NOT NULL,
            expires_at DATETIME NOT NULL,
            verified TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        const [otpRows] = await db.execute(
          "SELECT email, user_id, otp_code, expires_at, (expires_at < NOW()) AS is_expired FROM signup_otps WHERE LOWER(email) = LOWER(?) LIMIT 1",
          [email]
        );

        if (otpRows && otpRows.length > 0) {
          const rec = otpRows[0];
          if (rec.is_expired) {
            await db.end();
            return res.status(400).json({
              success: false,
              error: "Verification OTP has expired. Please click 'Resend Verification OTP' to get a new code."
            });
          }
          if (String(rec.otp_code).trim() !== code) {
            await db.end();
            return res.status(400).json({
              success: false,
              error: "Invalid verification OTP. Please check the 6-digit code sent to your email and try again."
            });
          }

          // Valid OTP! Mark verified in signup_otps and patients table
          await db.execute(
            "UPDATE signup_otps SET verified = 1 WHERE LOWER(email) = LOWER(?)",
            [email]
          );
          try {
            await db.execute(
              "UPDATE patients SET otp_verified = 1 WHERE LOWER(email) = LOWER(?)",
              [email]
            );
          } catch (_) {}
          try {
            await db.execute(
              "UPDATE users SET otp_code = NULL, otp_expiry = NULL WHERE LOWER(email) = LOWER(?)",
              [email]
            );
          } catch (_) {}

          await db.end();
          return res.status(200).json({
            success: true,
            message: "Email verified successfully! Your account is now active. Redirecting to login..."
          });
        }

        // Fallback: check users.otp_code if record was not in signup_otps
        try {
          const [uRows] = await db.execute(
            "SELECT user_id, otp_code, otp_expiry FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1",
            [email]
          );
          if (uRows && uRows.length > 0 && uRows[0].otp_code) {
            if (String(uRows[0].otp_code).trim() !== code) {
              await db.end();
              return res.status(400).json({
                success: false,
                error: "Invalid verification OTP. Please check your email and try again."
              });
            }
            try {
              await db.execute("UPDATE patients SET otp_verified = 1 WHERE LOWER(email) = LOWER(?)", [email]);
              await db.execute("UPDATE users SET otp_code = NULL, otp_expiry = NULL WHERE user_id = ?", [uRows[0].user_id]);
            } catch (_) {}
            await db.end();
            return res.status(200).json({
              success: true,
              message: "Email verified successfully! Redirecting to login..."
            });
          }
        } catch (_) {}

        await db.end();
      } catch (dbErr) {
        if (db) try { await db.end(); } catch (_) {}
        console.warn("[verify-signup-otp] DB check error:", dbErr.message);
      }
    }

    // 2. Fallback proxy to Render backend if available
    const backendBase = process.env.BACKEND_URL || process.env.PROD_API_BASE || "https://cp-backend-t590.onrender.com";
    const postData = JSON.stringify({ email, email_otp: code });
    const targetUrl = new URL("/api/verify-signup-otp", backendBase);
    const client = targetUrl.protocol === "https:" ? https : http;

    const proxyResult = await new Promise((resolve) => {
      const pReq = client.request(
        targetUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(postData)
          },
          timeout: 8000
        },
        (pRes) => {
          let rData = "";
          pRes.on("data", (c) => { rData += c; });
          pRes.on("end", () => {
            try {
              resolve({ status: pRes.statusCode, data: JSON.parse(rData) });
            } catch (e) {
              resolve({ status: pRes.statusCode, data: { message: rData } });
            }
          });
        }
      );
      pReq.on("error", () => resolve({ status: 500, data: null }));
      pReq.write(postData);
      pReq.end();
    });

    if (proxyResult.status >= 200 && proxyResult.status < 300 && proxyResult.data && proxyResult.data.success) {
      return res.status(proxyResult.status).json(proxyResult.data);
    }

    return res.status(400).json({
      success: false,
      error: (proxyResult.data && (proxyResult.data.error || proxyResult.data.message)) || "Invalid or expired verification code. Please request a new OTP."
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to process verification code."
    });
  }
};
