const fs = require('fs');
const BalanceGroup = require('../lib/balancegroup');
const requestWithoutCookie = require('request');
const { USER_REG, ONCE_REG, PASSWORD_REG, LOGON_REG,
  CAPTCHA_REG, NOTIFICATION_REG, NOTIFICATION_COUNT_REG, HOT_POSTS_REG, 
  HOT_POST_REG, POST_TITLE_REG, POST_INFO_REG, POST_CONTENT_REG,
  POST_REPLY_REG, POST_REPLY_LIKES_COUNT_REG, POST_REPLY_COUNT_REG,
  REPLY_ACTION_REG, GLOBAL_USER_INFO_REG, GLOBAL_ONCE_REG } = require('../configs/regs');

const ERROR_CODE = {
  SERVER_ERROR: 2
};

exports.PAGES = {
  HOME: 'https://www.v2ex.com/?tab=all',
  fRECENT: (page) => {
    return 'https://www.v2ex.com/recent?p=' + (page || 1);
  },
  fCOLLECTED: (page = 1) => `https://www.v2ex.com/my/topics?p=${page}`,
  fPOST: (t, page = 1) => {
    t = '' + t;
    let hash = t.indexOf('#');
    if (~hash) {
      t = t.substr(0, hash);
    }
    if (page === -1 || page === 0) {
      return 'https://www.v2ex.com/t/' + t;
    }
    return 'https://www.v2ex.com/t/' + t + '?p=' + page;
  },
  fNODE: (name = 'android', page = 1) => {
    return 'https://www.v2ex.com/go/' + name + '?p=' + page;
  },
  fMEMBER: (member, type, page = 1) => {
    return 'https://www.v2ex.com/member/' + member + (type ? '/' + type + '?p=' + page : '');
  },
  fNOTIFICATIONS: (page = 1) => {
    return 'https://www.v2ex.com/notifications?p=' + page;
  },
  NODES: 'https://www.v2ex.com/planes',
  NEVERLAND: 'NEVERLAND'
};

exports.fetchPage = function fetchPage(request = requestWithoutCookie, url, userAgent) {
  console.log('fetching url:', url);
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

exports.getTodayList = function getTodayList(res) {
  let hotList = res.match(HOT_POSTS_REG);
  if (hotList) hotList = hotList[0];
  else return [];
  let arr = [];
  hotList.replace(HOT_POST_REG, ($0, $1, $2, $3, $4) => {
    arr.push({
      member: $1,
      avatar: $2,
      title: $4,
      t: $3
    });
  });
  hotList = arr;
  return hotList || [];
}

exports.getTopicDetail = function getTopicDetail(res, needUserInfo = true) {
  let postResult = matchPost(res);
  let userInfo = {};
  if (needUserInfo !== false) {
    userInfo = getUserInfo(res);
  }
  return {...postResult, userInfo};
};

function getUserInfo(t) {
  const reg = GLOBAL_USER_INFO_REG;

  let info = t.match(reg);
  if (!info) {
    console.error('failed to match user info');
    return {};
  }

  const result = {
    username: info[1],
    avatar: info[2],
    bio: info[3]
  };

  const csrf = t.match(GLOBAL_ONCE_REG);
  if (csrf) {
    result.csrf = csrf[1];
  }

  return result;
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

function matchPost(text) {
  let titleInfo = text.match(POST_TITLE_REG);
  if (titleInfo) {
    titleInfo = {
      avatar: titleInfo[2],
      node: titleInfo[3],
      nodeName: titleInfo[4],
      title: titleInfo[5]
    };
  } else {
    console.error('Cannot match title info!');
    titleInfo = {};
  }

  let info = text.match(POST_INFO_REG);
  if (info) {
    let upCount = info[2].match(/&nbsp;([0-9]*)/);
    if (upCount) {
      upCount = upCount[1];
    } else {
      upCount = 0;
    }
    const $small = info[4];
    let author = $small.match(/<a href="\/member\/(.*?)">(.*?)<\/a>/);
    if (!author) author = '';
    else author = author[1];
    let [,, time = '', clicks = ''] = $small.match(/(.*)· (.*?) · (.*?) 次点击 &nbsp;/);
    info = {
      t: info[1],
      author: author,
      time: time,
      clicks: clicks,
      upCount: upCount
    };
  } else {
    console.error('Cannot match post info!');
    info = {};
  }

  const INFO_EXTRA_REG = /<div class="topic_buttons">([\s\S])*?<\/div>[\n ]*?<div class="sep20"><\/div>/;
  let extraInfo = text.match(INFO_EXTRA_REG)[0];
  let collects = extraInfo.match(/([0-9]*) 人收藏 &nbsp;/);
  let likes = extraInfo.match(/([0-9]*) 人感谢 &nbsp;/);
  let likeAction = extraInfo.match(/thankTopic\((.*?), '(.*?)'\);/);
  let ignoreAction = extraInfo.match(/'\/ignore\/topic\/(.*?)\?once=(.*?)';/);
  let collectAction = extraInfo.match(/href="\/favorite\/topic\/(.*?)\?t=(.*?)"/);
  const liked = !likeAction;
  const muted = !ignoreAction;
  const collected = !collectAction;
  let once;
  let uncollectAction;
  if (collected) {
    uncollectAction = extraInfo.match(/href="\/unfavorite\/topic\/.*?\?t=(.*?)"/);
    if (uncollectAction) {
      uncollectAction = uncollectAction[1];
    } else {
      uncollectAction = void 0;
    }
  }
  if (collects) {
    collects = collects[1];
  } else {
    collects = 0;
  }
  if (likes) {
    likes = likes[1];
  } else {
    likes = 0;
  }
  if (likeAction) {
    likeAction = likeAction[2];
  } else {
    likeAction = void 0;
  }
  if (ignoreAction) {
    ignoreAction = ignoreAction[2];
    once = ignoreAction;
  } else {
    ignoreAction = void 0;
  }
  if (collectAction) {
    collectAction = collectAction[2];
  } else {
    collectAction = uncollectAction;
  }

  let content = text.match(POST_CONTENT_REG);
  let appended = [];
  if (content) {
    content = content[0];
    const b = new BalanceGroup(content, '<div', '</div>', '<div@_$no_@', '</div@_$no_@>');
    content = b.getBalanceGroup(1);
    if (content.length > 1) {
      // handle appended
      content.slice(1).forEach((val) => {
        let time = val.match(/<span class="fade">第 ([0-9]*?) 条附言 &nbsp;·&nbsp; (.*?)<\/span>/);
        if (time) {
          time = time[2];
        }
        const b = new BalanceGroup(val, '<div', '</div>', '<div@_$no_@', '</div@_$no_@>');
        let content = b._balance.match(/<div@_([0-9]*?)_@ class="topic_content">([\s\S]*?)<\/div@_\1_@>/);
        if (content && content[2]) {
          content = content[2];
        } else {
          content = null;
        }
        appended.push({
          time,
          content
        });
      });
    }
    content = content[0].replace(/<div class="topic_content">([\s\S]*)<\/div>/, '$1');
  }

  // replies
  let replies = [];
  text.replace(POST_REPLY_REG, ($0, id, avatar, floor, member, $3, date, time, likes, content) => {
    if (likes) {
      likes = likes.match(POST_REPLY_LIKES_COUNT_REG);
      if (likes) {
        likes = +likes[1];
      } else {
        likes = 0;
      }
    } else {
      likes = 0;
    }
    const liked = $0.match(/thanked/) !== null;
    replies.push({
      avatar, floor, member, date, time, content, likes, liked, id
    });
  });
  let pageCount = 1;
  if (replies.length > 0) {
    const PAGE_COUNT_REG = /<input type="number" class="page_input" autocomplete="off" value="(.*?)" min="1" max="(.*?)"/;
    let count = text.match(PAGE_COUNT_REG);
    if (count && count[2]) {
      pageCount = +count[2];
    }
  }

  // reply count
  let replyCount = text.match(POST_REPLY_COUNT_REG);
  if (replyCount) {
    replyCount = +replyCount[1];
  } else {
    replyCount = 0;
  }

  let filterUndefined = (val) => {
    let obj = {};
    for (let key in val) {
      if (val[key] === undefined) continue;
      obj[key] = val[key];
    }
    return obj;
  }

  // reply submit
  if (!once) {
    let _once = text.match(REPLY_ACTION_REG);
    if (_once) {
      once = _once[1];
    }
  }

  return {content, appended, replies, pageCount, ...titleInfo, ...info, replyCount, likes, collects, liked, muted, collected, csrf: collectAction || likeAction || ignoreAction, actions: filterUndefined({
    collectAction,
    ignoreAction,
    likeAction,
    once,
    uncollectAction: uncollectAction
  })};
}
