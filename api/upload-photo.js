// Serverless function for Vercel: /api/upload-photo and /api/upload-profile-photo
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
    console.warn("Direct TiDB MySQL connection failed in upload-photo:", err.message);
    return null;
  }
}

/**
 * Upload image buffer or data URL to Cloudinary CDN using signed REST API
 */
async function uploadToCloudinary(fileData, options = {}) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "multitherapy";
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!apiKey || !apiSecret || !cloudName || apiKey === "your_api_key_here" || apiSecret === "your_api_secret_here") {
    return {
      success: false,
      error: "Cloudinary CDN credentials not configured in environment. Using direct high-res storage."
    };
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = options.folder || "multi_therapy/profiles";

  // Generate SHA-1 signature: folder=...&timestamp=...<api_secret>
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(paramsToSign).digest("hex");

  const postData = JSON.stringify({
    file: fileData,
    folder: folder,
    timestamp: timestamp,
    api_key: apiKey,
    signature: signature
  });

  return new Promise((resolve) => {
    const req = https.request(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData)
        },
        timeout: 20000
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.secure_url) {
              let optimizedUrl = parsed.secure_url;
              if (optimizedUrl.includes("/upload/") && !optimizedUrl.includes("/upload/f_auto,q_auto/")) {
                optimizedUrl = optimizedUrl.replace("/upload/", "/upload/f_auto,q_auto/");
              }
              resolve({
                success: true,
                url: optimizedUrl,
                public_id: parsed.public_id,
                is_cloudinary: true
              });
            } else {
              const errMsg = (parsed.error && parsed.error.message) ? parsed.error.message : "Cloudinary rejected the image upload.";
              resolve({ success: false, error: errMsg });
            }
          } catch (e) {
            resolve({ success: false, error: "Failed to parse Cloudinary response." });
          }
        });
      }
    );

    req.on("error", (err) => {
      resolve({ success: false, error: err.message || "Cloudinary network connection failed." });
    });

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

    const action = body.action || query.action;
    if (req.method === "DELETE" || action === "remove") {
      return res.status(200).json({
        success: true,
        message: "Profile photo marked for removal.",
        profile_photo: null
      });
    }

    const photoData = body.profile_photo || body.photo || body.image || body.file;
    if (!photoData) {
      return res.status(400).json({
        success: false,
        message: "No photo data provided."
      });
    }

    const userId = body.user_id || query.user_id;
    const username = body.username || query.username;
    const role = (body.role || "doctor").toLowerCase();

    // 1. Attempt Cloudinary signed upload
    const folder = `multi_therapy/${role}`;
    const cdnResult = await uploadToCloudinary(photoData, { folder });

    let finalPhotoUrl = photoData;
    let finalCloudinaryPid = null;
    let isCdn = false;

    if (cdnResult.success) {
      finalPhotoUrl = cdnResult.url;
      finalCloudinaryPid = cdnResult.public_id || null;
      isCdn = true;
    }

    // 2. Persist in MySQL database directly if user is identified
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
            "UPDATE users SET profile_photo = ?, cloudinary_public_id = ? WHERE user_id = ?",
            [finalPhotoUrl, finalCloudinaryPid, targetUid]
          );

          if (role.includes("doctor")) {
            await db.execute(
              "UPDATE doctors SET profile_photo = ?, cloudinary_public_id = ? WHERE user_id = ?",
              [finalPhotoUrl, finalCloudinaryPid, targetUid]
            );
          } else if (role.includes("patient")) {
            await db.execute(
              "UPDATE patients SET profile_photo = ?, cloudinary_public_id = ? WHERE user_id = ?",
              [finalPhotoUrl, finalCloudinaryPid, targetUid]
            );
          }
        }
        await db.end();
      } catch (dbErr) {
        console.warn("MySQL photo persist error in upload-photo:", dbErr.message);
        if (db) { try { await db.end(); } catch (e) {} }
      }
    }

    return res.status(200).json({
      success: true,
      message: isCdn
        ? "Doctor profile photo uploaded and CDN-optimized successfully!"
        : "Doctor profile photo saved successfully in MySQL database!",
      profile_photo: finalPhotoUrl,
      photo_url: finalPhotoUrl,
      cloudinary_public_id: finalCloudinaryPid,
      is_cdn: isCdn
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to process photo upload."
    });
  }
};
