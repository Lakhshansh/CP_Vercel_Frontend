const loginHandler = require("./login");

module.exports = async function handler(req, res) {
  // Enforce doctor portal parameter
  if (req.body && typeof req.body === "object") {
    req.body.portal = "doctor";
  }
  return loginHandler(req, res);
};

