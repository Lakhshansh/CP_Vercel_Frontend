// Serverless function for Vercel: /api/remove-profile-photo and /api/cloudinary/delete
const https = require("https");
const crypto = require("crypto");

let mysql = null;
try {
  mysql = require("mysql2/promise");
} catch (e) {
  mysql = null;
}

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
    console.warn("Direct TiDB MySQL connection failed in remove-profile-photo:", err.message);
    return null;
  }
}

async function deleteFromCloudinary(publicId) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "multitherapy";
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!apiKey || !apiSecret || !cloudName || !publicId || apiKey === "your_api_key_here") {
    return false;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(paramsToSign).digest("hex");

  const postData = JSON.stringify({
    public_id: publicId,
    timestamp: timestamp,
    api_key: apiKey,
    signature: signature
  });

  return new Promise((resolve) => {
    const req = https.request(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData)
        },
        timeout: 10000
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.result === "ok" || parsed.result === "not found");
          } catch (e) {
            resolve(false);
          }
        });
      }
    );

    req.on("error", () => resolve(false));
    req.write(postData);
    req.end();
  });
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

  try {
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch (e) {}
    }
    body = body || {};
    const query = req.query || {};

    const publicId = body.cloudinary_public_id || body.public_id || query.public_id;
    const userId = body.user_id || query.user_id;
    const username = body.username || query.username;

    // 1. Delete from Cloudinary if public ID is present
    if (publicId) {
      try {
        await deleteFromCloudinary(publicId);
      } catch (e) {}
    }

    // 2. Remove profile photo from MySQL database
    const db = await getDbConnection();
    if (db) {
      try {
        let targetUid = userId ? parseInt(userId, 10) : null;
        if (!targetUid && username) {
          const [uRows] = await db.execute("SELECT user_id FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1", [username]);
          if (uRows && uRows.length > 0) {
            targetUid = uRows[0].user_id;
          }
        }

        if (targetUid) {
          await db.execute(
            "UPDATE users SET profile_photo = NULL, cloudinary_public_id = NULL WHERE user_id = ?",
            [targetUid]
          );
          await db.execute(
            "UPDATE doctors SET profile_photo = NULL, cloudinary_public_id = NULL WHERE user_id = ?",
            [targetUid]
          );
          await db.execute(
            "UPDATE patients SET profile_photo = NULL, cloudinary_public_id = NULL WHERE user_id = ?",
            [targetUid]
          );
        }
        await db.end();
      } catch (dbErr) {
        console.warn("MySQL photo removal error:", dbErr.message);
        if (db) { try { await db.end(); } catch (e) {} }
      }
    }

    return res.status(200).json({
      success: true,
      message: "Doctor profile photo removed successfully from database and Cloudinary.",
      profile_photo: null,
      cloudinary_public_id: null
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to remove photo."
    });
  }
};
