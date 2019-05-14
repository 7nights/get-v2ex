const path = require('path');
const fs = require('fs').promises;
const publicDir = path.join(__dirname, '../public');
const p2a = require('../lib/utils').p2a;
module.exports = async (req, res, next) => {
  const file = path.resolve(publicDir, req.path);
  const [ err, stat ] = await p2a(fs.stat(path.join(publicDir, file)));
  if (err || stat.isDirectory()) {
    // TODO: throw error hangs the connection
    return res.sendFile(path.join(publicDir, 'index.html'));
  }
  next();
};
