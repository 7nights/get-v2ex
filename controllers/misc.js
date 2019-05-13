const path = require('path');
exports.captcha = (req, res) => {
  res.sendFile(path.resolve(__dirname, '../captcha.png'));
};
