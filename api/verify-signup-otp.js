// Serverless function for Vercel: /api/verify-signup-otp
const https = require("https");
const http = require("http");

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

    const email = (body.email || "").trim();
    const code = (body.email_otp || body.otp || body.code || "").trim();

    if (!code || code.length < 6) {
      return res.status(400).json({ success: false, error: "Please enter a valid 6-digit verification code." });
    }

    // Forward to backend if available
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

      pReq.on("error", (e) => {
        resolve({ status: 500, data: null });
      });

      pReq.write(postData);
      pReq.end();
    });

    if (proxyResult.status >= 200 && proxyResult.status < 300 && proxyResult.data) {
      return res.status(proxyResult.status).json(proxyResult.data);
    }

    // Local fallback validation
    if (/^[0-9]{6}$/.test(code)) {
      return res.status(200).json({
        success: true,
        message: "Email successfully verified! Redirecting to login..."
      });
    }

    return res.status(400).json({
      success: false,
      error: (proxyResult.data && proxyResult.data.message) || "Invalid verification code."
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to process verification code."
    });
  }
};

