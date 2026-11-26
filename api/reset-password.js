// Serverless function for Vercel: /api/reset-password
// Direct entry point for password reset update
const { handleResetPassword } = require("./password-recovery");

module.exports = async function (req, res) {
  return handleResetPassword(req, res);
};
