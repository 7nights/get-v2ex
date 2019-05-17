let request = require('request');
const FileCookieStore = require('tough-cookie-filestore');
// map of request with jar
const userMap = new Map;
const fs = require('fs');
const path = require('path');
const utils = require('./utils');

// load all cookies from disk
const cookiesDir = './cookies';
const cookiesMap = new Map;
const cookies = fs.readdirSync(cookiesDir);

cookies.forEach((val) => {
  if (val === 'cookies.json') {
    return cookiesMap.set('default', path.join(cookiesDir, val));
  }
  let nameMD5 = val.match(/cookies-(.*?)\.json/);
  if (nameMD5) return cookiesMap.set(nameMD5[1], path.join(cookiesDir, val));
});

exports.get = function (username) {
  let nameMD5;
  // TODO: for test
  if (username !== 'default') {
    nameMD5 = utils.md5(username);
  } else {
    nameMD5 = username;
  }
  let userRequest = userMap.get(nameMD5);
  if (userRequest) return userRequest;

  if (!cookiesMap.has(nameMD5)) throw new Error('User does not sign in');
  const j = request.jar(new FileCookieStore(cookiesMap.get(nameMD5)));
  let r = request.defaults({ jar: j });
  userMap.set(nameMD5, r);
  return r;
};

exports.clear = function (username) {
  let nameMD5;
  if (username !== 'default') {
    nameMD5 = utils.md5(username);
  } else {
    nameMD5 = username;
  }
  userMap.delete(nameMD5);
}
