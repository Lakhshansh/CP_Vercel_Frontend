// Serverless function for Vercel: /api/forgot-password
// Direct entry point for password recovery OTP request
const { handleForgotPasswordRequest } = require("./password-recovery");

module.exports = async function (req, res) {
  return handleForgotPasswordRequest(req, res);
};
