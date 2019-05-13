const crypto = require('crypto');

exports.md5 = (str) => {
  let hash = crypto.createHash('md5');
  hash.update(str);
  return hash.digest('hex');
};
exports.p2a = async (fn) => {
  let ret, err;
  try {
    ret = await (typeof fn === 'function' ? fn() : fn);
  } catch (ex) {
    err = ex;
  }
  return [err, ret];
};
exports.wait = function (time) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
};
