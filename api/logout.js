// Serverless function for Vercel: /api/logout
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );
  res.setHeader("Set-Cookie", [
    "session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax",
    "currentUser=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/"
  ]);

  if (req.method === "OPTIONS") return res.status(200).end();

  return res.status(200).json({
    success: true,
    message: "Logged out successfully."
  });
};
