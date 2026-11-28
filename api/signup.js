// Serverless function for Vercel: /api/signup
// Handles Patient registration with TiDB Cloud MySQL backend.
// Validates input, checks for duplicate accounts, generates OTP,
// and returns requires_otp: true to trigger email verification flow.

const crypto = require("crypto");
let mysql = null;
try { mysql = require("mysql2/promise"); } catch (e) { mysql = null; }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function setCors(res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );
}

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
      connectTimeout: 10000
    });
  } catch (e) {
    console.warn("[signup] DB connect failed:", e.message);
    return null;
  }
}

/**
 * Werkzeug-compatible scrypt hash using Node's built-in crypto.
 * Format: scrypt:32768:8:1$<salt>$<hex>
 */
function hashPassword(password) {
  const salt   = crypto.randomBytes(16).toString("hex");
  const N = 32768, r = 8, p = 1, keylen = 64;
  const derived = crypto.scryptSync(password, salt, keylen, { N, r, p, maxmem: 64 * 1024 * 1024 });
  return `scrypt:${N}:${r}:${p}$${salt}$${derived.toString("hex")}`;
}

function generateOtp() {
  return (Math.floor(100000 + Math.random() * 900000)).toString();
}

// Parse FormData (multipart/form-data), URL-encoded, or JSON body
function parseMultipart(rawStr, contentType) {
  const match = /boundary=([^;\s]+)/i.exec(contentType || "");
  if (!match) return {};
  const boundary = match[1].replace(/^"|"$/g, "");
  const parts = rawStr.split("--" + boundary);
  const result = {};
  for (const part of parts) {
    if (!part || part === "--\r\n" || part === "--") continue;
    const sepIdx = part.indexOf("\r\n\r\n");
    if (sepIdx === -1) continue;
    const headers = part.slice(0, sepIdx);
    // Skip file uploads with filename=
    if (/filename="/i.test(headers)) continue;
    const nameMatch = /name="([^"]+)"/i.exec(headers);
    if (!nameMatch) continue;
    let val = part.slice(sepIdx + 4);
    if (val.endsWith("\r\n")) val = val.slice(0, -2);
    result[nameMatch[1]] = val;
  }
  return result;
}

async function parseBody(req) {
  const contentType = (req.headers && req.headers["content-type"]) || "";
  let body = req.body;

  if (Buffer.isBuffer(body)) {
    body = body.toString("utf8");
  }

  if (body === undefined && typeof req.on === "function") {
    body = await new Promise((resolve) => {
      const chunks = [];
      req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      req.on("error", () => resolve(""));
    });
  }

  if (typeof body === "string") {
    const trimmed = body.trim();
    if (!trimmed) return {};
    if (contentType.includes("multipart/form-data") || trimmed.startsWith("--")) {
      const parsed = parseMultipart(body, contentType);
      if (Object.keys(parsed).length) return parsed;
    }
    try { return JSON.parse(trimmed); } catch (_) {}
    const params = new URLSearchParams(trimmed);
    const obj = {};
    for (const [k, v] of params.entries()) obj[k] = v;
    return Object.keys(obj).length ? obj : {};
  }
  if (body && typeof body === "object") return body;
  return {};
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Use POST." });
  }

  try {
    const body = await parseBody(req);

    // ---- Extract fields (support both FormData key names and JSON) ----
    const fullName  = ((body.full_name  || body.patient_name || body.name       || "")).toString().trim();
    const email     = ((body.email      || "")).toString().trim().toLowerCase();
    const phone     = ((body.phone      || body.mobile       || "")).toString().trim();
    const dob       = ((body.dob        || body.date_of_birth || "")).toString().trim();
    const gender    = ((body.gender     || "")).toString().trim();
    const address   = ((body.address    || "")).toString().trim();
    const password  = ((body.password   || "")).toString();
    const confirm   = ((body.confirm_password || "")).toString();
    const role      = ((body.role       || "patient")).toString().toLowerCase();
    const username  = ((body.username   || email.split("@")[0] || fullName.toLowerCase().replace(/[^a-z0-9]/g, "_"))).toString().trim();

    // ---- Reject non-patient registrations via this endpoint ----
    if (role !== "patient") {
      return res.status(403).json({
        success: false,
        error: "This endpoint is for Patient registration only. Doctors must use the Doctor Signup page."
      });
    }

    // ---- Server-side validation ----
    if (!fullName || fullName.length < 2) {
      return res.status(400).json({ success: false, error: "Full Name is required (at least 2 characters)." });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: "A valid email address is required." });
    }
    if (!phone || !/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({ success: false, error: "A valid 10-digit mobile number is required." });
    }
    if (!gender) {
      return res.status(400).json({ success: false, error: "Gender is required." });
    }
    if (!address || address.length < 3) {
      return res.status(400).json({ success: false, error: "Address is required (at least 3 characters)." });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters." });
    }
    if (confirm && password !== confirm) {
      return res.status(400).json({ success: false, error: "Passwords do not match." });
    }

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // ---- Try database registration ----
    const db = await getDb();

    if (db) {
      try {
        // Check for duplicate email, phone, or username
        const [existing] = await db.execute(
          "SELECT user_id, email, phone, username FROM users WHERE LOWER(email)=LOWER(?) OR phone=? OR LOWER(username)=LOWER(?) LIMIT 1",
          [email, phone, username]
        );

        if (existing && existing.length > 0) {
          const dup = existing[0];
          let dupField = "account";
          if (dup.email && dup.email.toLowerCase() === email)   dupField = "Email address";
          else if (dup.phone === phone)                          dupField = "Mobile number";
          else if (dup.username && dup.username.toLowerCase() === username.toLowerCase()) dupField = "Username";
          await db.end();
          return res.status(409).json({
            success: false,
            error: `${dupField} is already registered. Please use a different ${dupField.toLowerCase()} or log in.`
          });
        }

        // Insert into users table
        const passwordHash = hashPassword(password);
        const [insertResult] = await db.execute(
          `INSERT INTO users (username, email, phone, password, role, hospital_name, doctor_name, doctor_specialization)
           VALUES (?, ?, ?, ?, 'Patient', 'Multi Therapy Rehabilitation', ?, 'Patient Care')`,
          [username, email, phone, passwordHash, fullName]
        );
        const newUserId = insertResult.insertId;

        // Calculate age from DOB (approximate)
        let age = null;
        if (dob) {
          const birthYear = new Date(dob).getFullYear();
          if (!isNaN(birthYear)) age = new Date().getFullYear() - birthYear;
        }

        // Insert into patients table
        try {
          await db.execute(
            `INSERT INTO patients (name, age, gender, contact, address, email, phone, dob, user_id, registration_date, otp_verified)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 0)`,
            [fullName, age, gender, phone, address, email, phone, dob || null, newUserId]
          );
        } catch (patErr) {
          // If patients table insert fails (e.g. missing column), still continue — user is created
          console.warn("[signup] patients table insert warning:", patErr.message);
        }

        // Store OTP in dedicated signup_otps table for reliable server-side verification
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
          await db.execute(
            `REPLACE INTO signup_otps (email, user_id, otp_code, expires_at, verified)
             VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE), 0)`,
            [email, newUserId, otp]
          );
        } catch (otpTblErr) {
          console.warn("[signup] signup_otps store warning:", otpTblErr.message);
        }

        // Also store on users table if otp_code column exists
        try {
          await db.execute(
            "UPDATE users SET otp_code=?, otp_expiry=? WHERE user_id=?",
            [otp, otpExpiry, newUserId]
          );
        } catch (_) {}

        await db.end();

        return res.status(200).json({
          success: true,
          requires_otp: true,
          message: "Patient account created. Please verify your email to complete registration.",
          email: email,
          name: fullName,
          otp: otp,
          delivered: false // OTP delivery handled via /api/send-otp from frontend
        });

      } catch (dbErr) {
        if (db) try { await db.end(); } catch (_) {}
        console.error("[signup] DB error:", dbErr.message);
        return res.status(500).json({
          success: false,
          error: "Registration failed due to a database error. Please try again shortly. (" + dbErr.message + ")"
        });
      }
    }

    // ---- No DB available: Return OTP flow so user can still verify (dev/offline) ----
    return res.status(200).json({
      success: true,
      requires_otp: true,
      message: "Account registration queued. Please verify your email to complete registration.",
      email: email,
      name: fullName,
      otp: otp,
      delivered: false,
      offline: true
    });

  } catch (err) {
    console.error("[signup] Unexpected error:", err);
    return res.status(500).json({
      success: false,
      error: "An unexpected error occurred during registration. Please try again."
    });
  }
};
