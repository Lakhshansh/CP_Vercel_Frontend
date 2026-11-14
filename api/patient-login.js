const loginHandler = require("./login");

module.exports = async function handler(req, res) {
  // Enforce patient portal parameter
  if (req.body && typeof req.body === "object") {
    req.body.portal = "patient";
  }
  return loginHandler(req, res);
};

