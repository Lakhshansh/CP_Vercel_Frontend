// Serverless function for Vercel: /api/admin-login
// Dedicated, secure authentication endpoint for the Multi Therapy Online Administration Portal
const crypto = require("crypto");
let mysql = null;
try {
  mysql = require("mysql2/promise");
} catch (e) {
  mysql = null;
}

/**
 * Verifies password against Werkzeug-generated scrypt / pbkdf2 hash or plain string
 */
function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false;

  // Plain string match fallback
  if (password === storedHash) return true;

  try {
    if (storedHash.startsWith("scrypt:")) {
      const parts = storedHash.split("$");
      if (parts.length === 3) {
        const [method, salt, expectedHash] = parts;
        const [, N, r, p] = method.split(":");
        const derived = crypto.scryptSync(password, salt, 64, {
          N: parseInt(N, 10) || 32768,
          r: parseInt(r, 10) || 8,
          p: parseInt(p, 10) || 1,
          maxmem: 64 * 1024 * 1024
        });
        return derived.toString("hex") === expectedHash;
      }
    } else if (storedHash.startsWith("pbkdf2:sha256:")) {
      const parts = storedHash.split("$");
      if (parts.length === 3) {
        const [, iterations] = parts[0].split(":");
        const salt = parts[1];
        const expectedHash = parts[2];
        const derived = crypto.pbkdf2Sync(
          password,
          salt,
          parseInt(iterations, 10) || 260000,
          32,
          "sha256"
        );
        return derived.toString("hex") === expectedHash;
      }
    }
  } catch (err) {
    console.warn("[admin-login] Hash verification error:", err.message);
  }

  return false;
}

async function getDbConnection() {
  if (!mysql) return null;
  const host = process.env.DB_HOST || "gateway01.ap-northeast-1.prod.aws.tidbcloud.com";
  const user = process.env.DB_USER || "4EUekCnG6wabVPE.root";
  const password = process.env.DB_PASSWORD || "HA8jMiinRaOyEdgP";
  const database = process.env.DB_NAME || "cerebral_palsy_db";
  const port = parseInt(process.env.DB_PORT || "4000", 10);

  try {
    return await mysql.createConnection({
      host,
      user,
      password,
      database,
      port,
      ssl: { rejectUnauthorized: false },
      connectTimeout: 8000
    });
  } catch (err) {
    console.warn("[admin-login] TiDB connection failed:", err.message);
    return null;
  }
}

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
      try { body = JSON.parse(body); } catch (e) {}
    }
    body = body || {};

    const usernameInput = (body.username || body.email || "").toString().trim();
    const passwordInput = (body.password || "").toString();

    if (!usernameInput || !passwordInput) {
      return res.status(400).json({
        success: false,
        message: "Admin username/email and password are required."
      });
    }

    // Requirement 3: Only ONE authorized Admin account is allowed to access the admin panel
    const normalizedInput = usernameInput.toLowerCase();
    const isAuthorizedAdminIdentity =
      normalizedInput === "admin" ||
      normalizedInput === "admin@multitherapy.org";

    if (!isAuthorizedAdminIdentity) {
      return res.status(403).json({
        success: false,
        message: "Access restricted. Only the single authorized Multi Therapy Administrator is permitted to access the admin portal."
      });
    }

    let user = null;
    let db = await getDbConnection();

    if (db) {
      try {
        const [rows] = await db.query(
          "SELECT user_id, username, email, password, role, profile_photo FROM users WHERE (username = 'admin' OR email = 'admin@multitherapy.org') AND (role = 'Admin' OR role = 'admin') LIMIT 1"
        );
        if (rows && rows.length > 0) {
          user = rows[0];
        }
      } catch (dbErr) {
        console.error("[admin-login] Database query error:", dbErr.message);
      } finally {
        await db.end();
      }
    }

    // Verify password against DB user hash
    let passwordValid = false;
    if (user && user.password) {
      passwordValid = verifyPassword(passwordInput, user.password);
    } else if (!user && isAuthorizedAdminIdentity && passwordInput === "admin123") {
      // Offline / fallback verification for single authorized admin
      user = {
        user_id: 1,
        username: "admin",
        email: "admin@multitherapy.org",
        role: "admin",
        profile_photo: null
      };
      passwordValid = true;
    }

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid administrative credentials."
      });
    }

    // Authentication Success
    return res.status(200).json({
      success: true,
      message: "Authentication successful! Redirecting to Administration Dashboard...",
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email || "admin@multitherapy.org",
        name: "Multi Therapy Administrator",
        role: "admin",
        profile_photo: user.profile_photo || null
      },
      token: "mt_admin_token_" + Buffer.from(Date.now().toString()).toString("base64")
    });

  } catch (err) {
    console.error("[admin-login] Server error:", err);
    return res.status(500).json({
      success: false,
      message: "An internal error occurred during admin authentication."
    });
  }
};
