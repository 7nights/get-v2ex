const { fetchPage: getPageSource, getNotificationCount, getTodayList, getTopicDetail, PAGES } = require('../services/pageservice');
const models = require('../models');

const { GLOBAL_USER_INFO_REG, MAIN_POSTS_REG,
  MAIN_POST_REG, LAST_REPLY_REG,POST_UPCOUNT_REG,
  NODES_REG, NODE_HEADER_REG, NODE_REG, NODES_PAGE_POST_REG,
  MEMBER_PAGE_POST_REG, NOTIFICATION_REG, REPLIES_REG,
  USER_INFO_BOX_REG, USER_INFO_REG, GLOBAL_ONCE_REG, PAGE_COUNT_REG } = require('../configs/regs');

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
      const result = getTopicDetail(res);
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
      let hotList = getTodayList(res);
      let mainList = res.match(MAIN_POSTS_REG)[0];

      const arr = [];
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
      response.json({data: mainList, hotList, notificationCount: getNotificationCount(res), userInfo: getUserInfo(res)});
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

exports.today = async (req, response) => {
  let posts, days;
  try {
    [posts, days] = await models.getTodayPosts();
    console.log(posts);
  } catch (ex) {
    return response.json({error: 'Failed to get popular today'});
  }
  response.json({
    data: posts,
    days
  });
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
    } else if ($0.match(/充值/)) {
      type = 'recharge';
    } else {
      type = 'unknown';
      console.warn('Unknown notification type: ', $0);
    }

    payload = $0.match(/<div class="payload">([\s\S]*?)<\/div>\n<\/td>\n<\/tr>\n<\/table>/);
    if (payload) payload = payload[1];
    else payload = void 0;

    // recharge
    if (t === '\'balance\'') {
      t = '';
    } else {
      t = t.match(/\/t\/(.*)"/);
      if (t) t = t[1];
      else t = '';
    }

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
