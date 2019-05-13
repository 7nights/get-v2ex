const fs = require('fs');
const { USER_REG, ONCE_REG, PASSWORD_REG, LOGON_REG,
  CAPTCHA_REG, NOTIFICATION_REG, NOTIFICATION_COUNT_REG } = require('../configs/regs');

const ERROR_CODE = {
  SERVER_ERROR: 2
};
exports.fetchPage = function fetchPage(request, url, userAgent) {
  console.log(url);
  let options = {};
  if (userAgent) {
    options.headers = {};
    options.headers['user-agent'] = userAgent;
  }
  if (url === 'NEVERLAND') return new Promise(() => {});
  return new Promise((resolve, reject) => {
    // let res = new Buffer('');
    request.get(url, options, (e, res) => {
      if (!res || (res.statusCode !== '200' && res.statusCode !== 200)) {
        reject({
          error: e,
          message: e && e.message,
          errorCode: ERROR_CODE.SERVER_ERROR,
          response: res,
          statusCode: (res || {}).statusCode
        });
        resolve = () => {};
        return;
      }
      if (LOGON_REG.test(res.body)) {
        resolve(res.body);
      } else {
        resolve(doLogin(request));
      }
    });
  });
};

exports.getNotificationCount = function getNotificationCount(t) {
  let count = t.match(NOTIFICATION_COUNT_REG);
  if (count) return +count[1];
  return 0;
};

/**
 * notification type: mentioned | thanked_reply | collected
 */
exports.matchNotifications = function matchNotifications(text) {
  let arr = [];
  let type;
  let payload;
  text.replace(NOTIFICATION_REG, ($0, id, member, avatar, t, title, time) => {
    if ($0.match(/时提到了你/)) {
      type = 'mentioned';
    } else if ($0.match(/感谢了你在主题/)) {
      type = 'thanked_reply';
    } else if ($0.match(/收藏了你发布的主题/)) {
      type = 'collected';
    } else if ($0.match(/里回复了你<\/span> &nbsp;/)) {
      type = 'reply';
    } else {
      console.warn('Unknown notification type: ', $0);
    }

    payload = $0.match(/<div class="payload">([\s\S]*?)<\/div><\/td><\/tr><\/table>/);
    if (payload) payload = payload[1];
    else payload = void 0;

    arr.push({id, member, avatar, t, title, time, payload, type});
  });
  return arr;
}

function doLogin(request) {
  let res = '';
  return new Promise((resolve, reject) => {
    request.get('https://www.v2ex.com/signin')
      .on('data', (data) => {
        res += data.toString('utf-8');
      })
      .on('end', () => {
        let userField;
        let passwordField;
        let onceValue;
        let captcha;

        try {
          userField = res.match(USER_REG)[1];
          passwordField = res.match(PASSWORD_REG)[1];
          onceValue = res.match(ONCE_REG)[1];
          captcha = res.match(CAPTCHA_REG)[1];
        } catch (ex) {
          reject(ex);
        }

        if (captcha) {
          fs.writeFileSync('lastLoginCache', JSON.stringify({
            userField, passwordField, once: onceValue, captcha
          }));

          console.log(res);

          request.get('https://www.v2ex.com/_captcha?once=' + onceValue)
            .pipe(fs.createWriteStream('./captcha.png'))
            .on('close', () => {
              reject({
                type: 'NEED_CAPTCHA',
                value: 'https://www.v2ex.com/_captcha?once=' + onceValue
              });
            });
        } else {
          reject({
            type: 'NEED_REFRESH'
          });
        }
      });
  });
}
