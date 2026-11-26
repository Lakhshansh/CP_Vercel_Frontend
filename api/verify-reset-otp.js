// Serverless function for Vercel: /api/verify-reset-otp
// Direct entry point for password recovery OTP verification
const { handleVerifyResetOtp } = require("./password-recovery");

module.exports = async function (req, res) {
  return handleVerifyResetOtp(req, res);
};
