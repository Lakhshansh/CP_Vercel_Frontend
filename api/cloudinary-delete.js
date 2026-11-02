const removePhotoHandler = require("./remove-profile-photo.js");

module.exports = async function handler(req, res) {
  return removePhotoHandler(req, res);
};

