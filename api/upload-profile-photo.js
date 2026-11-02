const uploadPhotoHandler = require("./upload-photo.js");

module.exports = async function handler(req, res) {
  return uploadPhotoHandler(req, res);
};

