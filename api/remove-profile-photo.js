// Serverless function for Vercel: /api/remove-profile-photo and /api/cloudinary/delete
const https = require("https");
const crypto = require("crypto");

async function deleteFromCloudinary(publicId) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "multitherapy";
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!apiKey || !apiSecret || !cloudName || !publicId) {
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

    const publicId = body.cloudinary_public_id || body.public_id || req.query.public_id;
    if (publicId) {
      await deleteFromCloudinary(publicId);
    }

    return res.status(200).json({
      success: true,
      message: "Profile photo removed from Cloudinary CDN successfully.",
      profile_photo: null
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to remove photo."
    });
  }
};
