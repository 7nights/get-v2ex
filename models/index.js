const sqlite = require('sqlite');
const fs = require('fs').promises;
const path = require('path');
const SQL = require('sql-template-strings');

const USER_SCHEMA_VERSION = 0;
let database;

exports.open = async () => {
  // prepare db and get all table sqls
  const sqlDirPath = path.join(__dirname, './sqls/');
  const [ db, dirs ] = await Promise.all([sqlite.open('./database.sqlite'), fs.readdir(sqlDirPath)]);
  const [ dbVersion, ...sqls ] = await Promise.all([db.get('PRAGMA user_version;')].concat(dirs.filter(filePath => ~filePath.indexOf('.sql')).map(filePath => {
    return fs.readFile(path.join(sqlDirPath, filePath), {
      encoding: 'utf-8'
    });
  })));
  // from scratch
  if (dbVersion.user_version === 0) {
    await Promise.all(sqls.map(sql => db.exec(sql)));
  }
  database = db;
  return db;
};

exports.getDevicesByUser = (user) => {
  return database.all(SQL`SELECT token FROM notification_devices WHERE user = ${user}`);
};

exports.addDeviceToUser = async (user, token) => {
  return database.run(SQL`INSERT INTO notification_devices(token, user)
    SELECT ${token}, ${user}
    WHERE NOT EXISTS(SELECT 1 FROM notification_devices WHERE token = ${token});`);
};
exports.removeDeviceByToken = async (token) => {
  return database.run(SQL`DELETE FROM notification_devices WHERE token = ${token};`);
};

exports.alterFollowing = (user, isFollowing, topic, title = '') => {
  if (isFollowing) {
    return database.run(SQL`INSERT INTO following_posts(user, topic, title) VALUES(${user}, ${topic}, ${title});`);
  } else {
    return database.run(SQL`DELETE FROM following_posts WHERE user = ${user} AND topic = ${topic};`);
  }
};
exports.isFollowing = (user, topic) => {
  return database.get(SQL`SELECT 1 FROM following_posts WHERE user = ${user} AND topic = ${topic};`)
    .then(ret => !!ret);
};
