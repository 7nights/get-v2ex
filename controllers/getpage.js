const fs = require('fs');
const BalanceGroup = require('../lib/balancegroup');
const { fetchPage: getPageSource, getNotificationCount } = require('../services/pageservice');
const models = require('../models');

const { GLOBAL_USER_INFO_REG,
  HOT_POSTS_REG, HOT_POST_REG, MAIN_POSTS_REG,
  MAIN_POST_REG, LAST_REPLY_REG,POST_UPCOUNT_REG,
  NODES_REG, NODE_HEADER_REG, NODE_REG, NODES_PAGE_POST_REG,
  MEMBER_PAGE_POST_REG, NOTIFICATION_REG, REPLIES_REG,
  USER_INFO_BOX_REG, USER_INFO_REG, POST_TITLE_REG,
  POST_INFO_REG, POST_CONTENT_REG, POST_REPLY_REG,
  REPLY_ACTION_REG, GLOBAL_ONCE_REG, PAGE_COUNT_REG, POST_REPLY_COUNT_REG, POST_REPLY_LIKES_COUNT_REG } = require('../configs/regs');

const ERROR_CODE = {
  SERVER_ERROR: 2
};

const PAGES = {
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

// if (process.argv.length === 3) {
//   let captcha = process.argv[2];
//   let lastLoginCache = JSON.parse(fs.readFileSync('./lastLoginCache'));
//   sendLoginRequest({...lastLoginCache, captchaValue: captcha})
//     .then(() => {
//       console.log('login success!!!');
//     });

// }
// getPageSource(PAGES.NEVERLAND || PAGES.fRECENT(1))
//   .then((res) => {
//     matchRecentPage(res);
//   })
//   .catch((ex) => console.log(ex));


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
const handleTopicContent = exports.handleTopicContent = function handleTopicContent(res) {
  let postResult = matchPost(res);
  let userInfo = getUserInfo(res);
  return {...postResult, userInfo};
};
function commonErrorHandler(res) {
  return (ex) => {
    console.error(ex);
    res.json({error: ex.message || ex});
  };
}
function normalizeTopic(t) {
  let index = t.indexOf('#');
  if (~index) t = t.substr(0, index);
  return t;
}
exports.topic = (req, response) => {
  const request = req.userRequest;
  let start = Date.now();
  Promise.all([getPageSource(request, PAGES.fPOST(req.query.t, req.query.page)),
    models.isFollowing(req.session.user, normalizeTopic(req.query.t))])
    .then(([res, isFollowing]) => {
      const queryTime = Date.now() - start;
      start = Date.now();
      const result = handleTopicContent(res);
      const regTime = Date.now() - start;
      response.json({...result, isFollowing, performance: {regTime, queryTime}});
    })
    .catch(commonErrorHandler(response));
};
exports.collected = (req, response) => {
  const request = req.userRequest;
  getPageSource(request, PAGES.fCOLLECTED(req.query.page))
    .then(res => {
      let result = matchRecentPage(res);
      let pageCount = res.match(PAGE_COUNT_REG);
      if (pageCount) pageCount = +pageCount[1];
      else pageCount = 0;
      response.json({data: result, notificationCount: getNotificationCount(res), userInfo: getUserInfo(res), pageInfo: {
        total: pageCount
      }});
    })
    .catch(commonErrorHandler(response));
};
exports.recent = (req, response) => {
  const request = req.userRequest;
  if (req.query.page && +req.query.page > 0) {
    return getPageSource(request, PAGES.fRECENT(req.query.page))
      .then((res) => {
        let result = matchRecentPage(res);
        response.json({data: result, notificationCount: getNotificationCount(res), userInfo: getUserInfo(res)});
      })
      .catch(commonErrorHandler(response));
  }

  getPageSource(request, PAGES.HOME)
    .then((res) => {
      let hotList = res.match(HOT_POSTS_REG);
      if (hotList) hotList = hotList[0];
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
      let mainList = res.match(MAIN_POSTS_REG)[0];

      arr = [];
      mainList.replace(MAIN_POST_REG, ($0, member, avatar, t, title, node, nodeName) => {
        let pined = false;
        if (~$0.indexOf('corner_star.png')) {
          pined = true;
        }
        let lastReply = $0.match(LAST_REPLY_REG);
        if (lastReply) {
          lastReply = {
            time: lastReply[1],
            user: lastReply[2]
          }
        } else {
          lastReply = undefined;
        }

        let upCount = $0.match(POST_UPCOUNT_REG);
        if (upCount) {
          upCount = upCount[1];
        } else {
          upCount = 0;
        }

        arr.push({ member, avatar, t, title, node, nodeName, pined, lastReply, upCount });
      });
      mainList = arr;
      response.json({data: mainList, notificationCount: getNotificationCount(res), userInfo: getUserInfo(res)});
    })
    .catch(commonErrorHandler(response));
};
exports.nodes = (req, res) => {
  const request = req.userRequest;
  getPageSource(request, PAGES.NODES)
    .then((ret) => {
      let arr = [];
      ret.replace(NODES_REG, ($, headerContainer, nodesContainer) => {
        let header = headerContainer.match(NODE_HEADER_REG);
        if (!header) throw 'Invalid page content';
        let nodes = [];
        nodesContainer.replace(NODE_REG, ($0, node, nodeName) => {
          nodes.push({
            node, nodeName
          });
        });

        arr.push({
          header: {
            title: header[1],
            subtitle: header[2]
          },
          nodes
        });
      });

      return res.json({
        data: arr,
        notificationCount: getNotificationCount(ret),
        userInfo: getUserInfo(ret)
      });
    })
    .catch(commonErrorHandler(res));
};
exports.node = (req, response) => {
  const request = req.userRequest;

  getPageSource(request, PAGES.fNODE(req.query.name, req.query.page))
    .then((res) => {
      let result = matchRecentPage(res, NODES_PAGE_POST_REG, 'node');
      let pageCount = res.match(PAGE_COUNT_REG);
      if (pageCount) pageCount = pageCount[1];
      else pageCount = 0;
      response.json({data: result, notificationCount: getNotificationCount(res), userInfo: getUserInfo(res), pageInfo: {
        total: pageCount
      }});
    })
    .catch(commonErrorHandler(response));
};

exports.member = (req, response) => {
  const request = req.userRequest;
  if (!req.query.member) {
    response.json({error: 'Invalid params'});
  }
  getPageSource(request, PAGES.fMEMBER(req.query.member, req.query.type, req.query.page))
    .then((res) => {
      // console.log(res);
      let posts;
      let ifPostsHidden = false;
      if (!res.match(/class="topic_content"><span class="gray">根据 (.*?) 的设置，主题列表被隐藏<\/span>/)) {
        posts = matchRecentPage(res, MEMBER_PAGE_POST_REG, 'member');
      } else {
        ifPostsHidden = true;
      }

      let [ isBlocked, memberId, actionToken ] = matchMemberActions(res);
      let userInfo = matchUserInfo(res);
      let widgets = matchWidgets(res);
      let replies = matchReplies(res);
      let bio = matchBio(res);
      let pageCount = matchPageCount(res);
      let isOnline = !!(res.match(/<strong class="online">ONLINE<\/strong>/));
      let responseResult = {data: {posts, isOnline, ifPostsHidden, replies, widgets, bio, memberId, isBlocked, blockActionToken: actionToken, ...userInfo}, notificationCount: getNotificationCount(res)};
      if (pageCount) {
        responseResult.data.pageInfo = {
          total: pageCount
        };
      } 
      response.json(responseResult);
    })
    .catch(commonErrorHandler(response));
};

function matchPageCount(text) {
  const ret = text.match(PAGE_COUNT_REG);
  if (ret) return +ret[1];
}

exports.notifications = (req, response) => {
  const request = req.userRequest;
  getPageSource(request, PAGES.fNOTIFICATIONS(req.query.page))
    .then((res) => {
      let notifications = matchNotifications(res);
      response.json({data: {notifications}, notificationCount: getNotificationCount(res)});

      // reset notification count
      models.setNotificationCount(req.session.user, 0);
    })
    .catch(commonErrorHandler(response));
};

/**
 * notification type: mentioned | thanked_reply | collected
 */
function matchNotifications(text) {
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
    } else if ($0.match(/感谢了你发布/)) {
      type = 'thanked_topic'
    } else {
      type = 'unknown';
      console.warn('Unknown notification type: ', $0);
    }

    payload = $0.match(/<div class="payload">([\s\S]*?)<\/div><\/td><\/tr><\/table>/);
    if (payload) payload = payload[1];
    else payload = void 0;

    arr.push({id, member, avatar, t, title, time, payload, type});
  });
  return arr;
}

function matchBio(text) {
  const BIO_REG = /<\/h1>[\n ]*?<span class="bigger">(.*?)<\/span>/;
  const bio = text.match(BIO_REG);
  if (bio) {
    return bio[1];
  }
  return '';
}
function matchReplies(text) {
  let arr = [];
  text.replace(REPLIES_REG, ($0, time, replyTo, node, nodeName, t, title, $1, replyContent) => {
    arr.push({time, replyTo, node, nodeName, t, title, replyContent});
  });
  return arr;
}
function matchWidgets(text) {
  const WIDGETS_REG = /<div class="widgets">([\s\S]*?)<\/div>/;
  const WIDGET_REG = /<a href="(.*?)" [\s\S]*?<img src="(.*?)"[\s\S]*?&nbsp;(.*?)<\/a>/g;
  let arr = [];
  let widgets = text.match(WIDGETS_REG);
  if (!widgets) return arr;
  widgets[0].replace(WIDGET_REG, ($0, url, iconUrl, title) => {
    arr.push({url, iconUrl, title});
  });
  return arr;
}
function matchUserInfo(text) {
  let box = text.match(USER_INFO_BOX_REG);
  if (!box) {
    console.error('Unknown member doc');
    return {};
  }
  box = box[0];

  const result = box.match(USER_INFO_REG);
  if (!result) {
    console.error('Unknown member doc');
    return {};
  }

  let introduction;
  const cells = box.match(/(<div class="cell">[\s\S]*?<\/div>)+/g);
  if (cells && cells.length > 1) {
    introduction = cells.pop().match(/<div class="cell">([\s\S]*?)<\/div>/)[1];
  }
  let company;
  if (result[2]) {
    company = result[2].match(/<strong>(.*?)<\/strong>/);
    if (company) company = company[1];
  }
  let dauIndex;
  if (result[5]) {
    dauIndex = result[5].match(/div.*?<a href="\/top\/dau">([0-9]*?)</);
    if (dauIndex) dauIndex = dauIndex[1];
    else dauIndex = undefined;
  }
  return {
    avatar: result[1],
    company,
    memberNo: result[3],
    created: result[4],
    dauIndex,
    introduction
  };
}
function matchMemberActions(text) {
  const BLOCK_REG = /'\/(un)?block\/([0-9]*?)\?t=([0-9]*?)'/;
  let blockAction = text.match(BLOCK_REG);
  if (blockAction) {
    return [!!blockAction[1], blockAction[2], blockAction[3]];
  }
  return [ false ];
}

function matchRecentPage(text, postReg, mode) {
  let arr = [];
  // node mode
  let overrideNodeName;
  if (mode === 'node') {
    let nodeName = text.match(/<a href="\/">V2EX<\/a> <span class="chevron">&nbsp;›&nbsp;<\/span> (.*?)\n/);
    overrideNodeName = nodeName[1];
  }
  text.replace(postReg || MAIN_POST_REG, ($0, member, avatar, t, title, node, nodeName) => {
    if (mode === 'member') {
      nodeName = $0.match(/<a class="node" href="\/go\/(.*?)">(.*?)</);
      node = nodeName && nodeName[1];
      nodeName = nodeName && nodeName[2];
      let _member = member;
      member = t;
      t = _member;
      title = avatar;
    }
    let pined = false;
    if (~$0.indexOf('corner_star.png')) {
      pined = true;
    }
    let lastReply = $0.match(LAST_REPLY_REG);
    if (lastReply) {
      lastReply = {
        time: lastReply[1],
        user: lastReply[2]
      }
    } else {
      lastReply = undefined;
    }

    let upCount = $0.match(POST_UPCOUNT_REG);
    if (upCount) {
      upCount = upCount[1];
    } else {
      upCount = 0;
    }

    // count = count.match(/class="count_livid">([0-9]*?)<\/a>/);
    // if (count) count = count[1];
    // else count = 0;

    // normal mode
    if (!postReg) {
      arr.push({ member, avatar, t, title, node, nodeName, pined, lastReply, upCount });
    } else if (mode === 'node') {
      // node mode
      arr.push({ member, avatar, t, title, lastReply, nodeName: overrideNodeName });
    } else if (mode === 'member') {
      arr.push({ member, t, title, lastReply, nodeName, node });
    }
  });

  return arr;
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
    info = {
      t: info[1],
      author: info[4],
      time: info[6],
      clicks: info[7],
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
  text.replace(POST_REPLY_REG, ($0, id, avatar, floor, member, $3, time, likes, content) => {
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
      avatar, floor, member, time, content, likes, liked, id
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
