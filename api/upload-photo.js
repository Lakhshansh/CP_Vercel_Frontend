// Serverless function for Vercel: /api/upload-photo and /api/upload-profile-photo
const https = require("https");
const crypto = require("crypto");

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
      error: "Cloudinary CDN credentials not configured in environment. Please configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
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

    const action = body.action || req.query.action;
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

    // Attempt Cloudinary signed upload
    const folder = `multi_therapy/${(body.role || "profiles").toLowerCase()}`;
    const cdnResult = await uploadToCloudinary(photoData, { folder });

    if (!cdnResult.success) {
      // Graceful fallback: return the photo data URL directly so photo is preserved persistently
      return res.status(200).json({
        success: true,
        message: "Profile photo saved successfully (Direct storage active).",
        profile_photo: photoData,
        photo_url: photoData,
        cloudinary_public_id: null,
        is_cdn: false,
        warning: cdnResult.error
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile photo uploaded and CDN-optimized successfully!",
      profile_photo: cdnResult.url,
      photo_url: cdnResult.url,
      cloudinary_public_id: cdnResult.public_id || null,
      is_cdn: true
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to process photo upload."
    });
  }
};
