const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');
const fs = require('fs').promises;
const path = require('path');
const SQL = require('sql-template-strings');
const config = require('../config');

let database;

exports.open = async () => {
  // prepare db and get all table sqls
  const sqlDirPath = path.join(__dirname, './sqls/');
  const [ db, dirs ] = await Promise.all([sqlite.open({filename: './database.sqlite', driver: sqlite3.Database}), fs.readdir(sqlDirPath)]);
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
exports.getNotificationCount = async (user) => {
  return database.get(SQL`SELECT count, time FROM notification_count WHERE user = ${user};`)
    .then((ret) => {
      return ret || {};
    });
};
exports.setNotificationCount = async (user, count = 0) => {
  return database.run(SQL`UPDATE notification_count SET count = ${count}, time = ${Date.now()} WHERE user = ${user};`)
    .then((ret) => {
      if (ret.stmt.changes === 0) {
        return database.run(SQL`INSERT INTO notification_count(user, count, time) VALUES(${user}, ${count}, ${Date.now()})`);
      }
      return ret;
    });
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

// today
exports.getDays = function getDays(d = new Date) {
  return parseInt((d.getTime() / 1000 - d.getTimezoneOffset() * 60 - (config.popularTodayUpdateTimeInSeconds || 61200)) / (60 * 60 * 24), 10);
};
exports.updateTodayList = (list, daysSinceUnixEpoch = exports.getDays()) => {
  if (typeof list !== 'string' && !(list instanceof String)) list = JSON.stringify(list);
  return database.run(SQL`REPLACE INTO today_list(date, list) VALUES(${daysSinceUnixEpoch}, ${list})`);
};
exports.getTodayList = (daysSinceUnixEpoch = exports.getDays()) => {
  return database.get(SQL`SELECT * FROM today_list WHERE date = ${daysSinceUnixEpoch};`)
    .then((ret) => {
      if (!ret) return [];
      return JSON.parse(ret.list);
    });
};
exports.savePost = ({topic, author, title, contentJSON, replyCount}) => {
  return database.run(SQL`REPLACE INTO today_post(topic, author, title, content_json, reply_count, updated) VALUES(${topic}, ${author}, ${title}, ${contentJSON}, ${replyCount}, ${parseInt(Date.now() / 1000, 10)})`);
};
exports.getTodayPosts = async (daysSinceUnixEpoch = exports.getDays(), fallbackToYesterday = false) => {
  // get posts list
  console.log('try to get today posts:', daysSinceUnixEpoch);
  let list = await exports.getTodayList(daysSinceUnixEpoch);
  if (fallbackToYesterday && (!list || list.length === 0)) {
    list = await exports.getTodayList(daysSinceUnixEpoch - 1);
  }

  if (!list || list.length === 0) return [[], daysSinceUnixEpoch, list];

  let query = SQL`SELECT * FROM today_post WHERE topic IN (`;
  list.forEach((id, i) => {
    query.append(SQL`${id}`);
    if (i !== list.length - 1) query.append(',');
  });
  query.append(')');

  return database.all(query)
    .then((ret) => [ret, daysSinceUnixEpoch, list]);
};
