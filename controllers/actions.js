const formidable = require('formidable')
const page = require('./getpage');
const fs = require('fs');
const userRequest = require('../lib/userrequest');
const cipher = require('../config').cipher;
const models = require('../models');
const { p2a } = require('../lib/utils');
const { CREATE_TOPIC_PROBLEM } = require('../configs/regs');
const autoUpdate = require('../services/autoupdate');
const pageService = require('../services/pageservice');

exports.submitReply = function submitReply(req, res) {
  if (!req.body) return res.sendStatus(400);

  if (!req.query.t) return res.json({error: {message: 'Invalid input'}});

  let t = normalizeTopic(req.query.t);

  const form = new formidable.IncomingForm();
  form.parse(req, (err, fields) => {
    if (err) {
      console.log('formidable error', err);
      return res.json({
        error: {message: 'Query parse error'}
      });
    }

    req.userRequest.post(`https://www.v2ex.com/t/${t}`, {
      form: {
        content: fields.content || '',
        once: fields.once
      }
    }, (err, httpResponse, body) => {
      if (err) {
        return res.json({error: err});
      }
      return res.json({data: body});
    });
  });
};
exports.submitCipher = function submitCipher(req, res) {
  if (req.query.cipher === cipher.code) {
    // req.session = {
    //   user: cipher.user,
    //   ...req.session
    // };
    req.session.user = cipher.user;
    console.log(req.session);
    return res.json({
      data: true
    });
  }
  res.json({
    data: false,
    error: 'Cipher is not correct.'
  });
};
exports.addToken = function addToken(req, res) {
  if (!req.session.user) {
    return res.json({
      error: 'Not login'
    });
  }
  if (!req.query.token) {
    return res.json({
      error: 'Invalid params'
    });
  }
  models.addDeviceToUser(req.session.user, req.query.token);
  res.json({
    success: true
  });
};
exports.collectPost = function collectPost(req, res) {
  alterPostStatus(req, res, 'topic', 'favorite', true);
};
exports.uncollectPost = function uncollectPost(req, res) {
  alterPostStatus(req, res, 'topic', 'unfavorite', true);
}
exports.likePost = function likePost(req, res) {
  alterPostStatus(req, res, 'topic', 'thank', false, 'POST', 'once');
}
exports.likeComment = function likeComment(req, res) {
  alterPostStatus(req, res, 'reply', 'thank', false, 'POST', 'once');
};

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields) => {
      if (err) {
        console.log('formidable error', err);
        return reject(err);
      }

      resolve(fields);
    });
  });
}
exports.createTopic = function createTopic(req, res) {
  if (!req.query.node) {
    return res.json({
      error: {
        type: 'NO_NODE_PROVIDED',
        message: 'No node provided when create page.'
      }
    });
  }
  // check params
  if (!req.body) {
    return res.sendStatus(400);
  }
  parseBody(req)
    .then(body => {
      console.log(body);
      req.userRequest.post(`https://www.v2ex.com/new/${req.query.node}`, {
        form: {
          title: body.title,
          content: body.content,
          syntax: 0,
          once: body.csrf || body.once
        }
      }, (err, response, body) => {
        if (err) {
          throw err;
        }
        if (!response.headers.location) {
          // find problems
          const problems = body.match(CREATE_TOPIC_PROBLEM);
          if (problems) {
            return res.json({
              error: 'Failed to create topic',
              data: problems[1]
            });
          } else {
            return res.json({
              error: 'Failed to create topic'
            });
          }
        }
        return res.json({
          data: response.headers.location
        });
      })
    })
    .catch((ex) => {
      res.json({error: ex.message || ex});
    });
};
exports.blockUser = function blockUser(req, res) {
  alterBlockStatus(req, res, 'block');
};
exports.unblockUser = function unblockUser(req, res) {
  alterBlockStatus(req, res, 'unblock');
};

function alterBlockStatus(req, res, state) {
  if (!req.query.member || !req.query.action) {
    return res.json({
      error: { message: 'Invalid input' }
    });
  }

  req.userRequest(`https://www.v2ex.com/${state}/${req.query.member}?t=${req.query.action}`, {
    headers: {
      referer: `https://www.v2ex.com/member/${req.query.memberName}`
    }
  }, (err) => {
    if (err) {
      return res.json({error: err});
    }
    return res.json({data: null, success: true});
  });
}

exports.alterFollowing = async function alterFollowing(req, res) {
  const { topic, following, title = '' } = req.query;
  if (!topic || (following !== 'false' && following !== 'true')) {
    console.log('Invalid params', following, topic);
    return res.json({error: 'Invalid params'});
  }

  const [err] = await p2a(models.alterFollowing(req.session.user, following === 'true', normalizeTopic(topic), title));
  if (err) {console.error(err);}
  res.json({ data: null, success: true});
}

function alterPostStatus(req, res, target, type, refreshPage = false, method = 'GET', tokenName = 't') {
  if (!req.query.t || !req.query.action) return res.json({error: {message: 'Invalid input'}});

  let t = normalizeTopic(req.query.t);
  req.userRequest(`https://www.v2ex.com/${type}/${target}/${t}?${tokenName}=${req.query.action}`, {
    method: method,
    ...(refreshPage ? {headers: {
      referer: 'https://www.v2ex.com/t/' + t
    }} : {})
  }, (err, response, body) => {
    if (err) {
      return res.json({error: err});
    }
    if (refreshPage) {
      let post;
      try {
        post = pageService.getTopicDetail(body);
      } catch (ex) {
        console.error(ex);
        return res.json({error: {message: 'Server Error'}});
      }
      return res.json({data: {post}, success: true});
    }

    let result;
    try {
      result = JSON.parse(body).success;
    } catch (ex) {
      console.error(ex);
    }

    return res.json({data: null, success: result !== false});
  });
}

function normalizeTopic(t) {
  let index = t.indexOf('#');
  if (~index) t = t.substr(0, index);
  return t;
}

const logonReg = /confirm\('确定要从 V2EX 登出？'\)/;
function sendLoginRequest(request, {userField, passwordField, once, captcha, userName = cipher.user, password = cipher.password, captchaValue}) {
  return new Promise((resolve, reject) => {
    request.post('https://www.v2ex.com/signin', {
      headers: {
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36',
        referer: 'https://www.v2ex.com/signin'
      },
      form: {
        [userField]: userName,
        [passwordField]: password,
        [captcha]: captchaValue,
        once,
        next: '/'
      }
    })
      .on('response', (resp) => {
        console.log(resp.headers);
      })
      .on('data', (chunk) => {
        console.log('data', chunk.toString('utf-8'));
      })
      .on('end', () => {
        let body = '';
        request.get('https://www.v2ex.com')
          .on('data', (chunk) => {
            body += chunk.toString('utf-8');
          })
          .on('end', () => {
            // fs.writeFileSync('response.txt', body);
            if (logonReg.test(body)) {
              resolve(body);
            } else {
              // sign in failed
              reject('Failed to sign in.');
            }
          });
      });
  });
}

exports.checkUpdate = function checkUpdate(req, res) {
  autoUpdate.checkAndUpdate();
  res.json({
    data: null, success: true
  });
};

exports.login = function login(req, res) {
  let captcha = req.query.captcha;
  let lastLoginCache = JSON.parse(fs.readFileSync('./lastLoginCache'));
  // TODO: username & password
  sendLoginRequest(req.userRequest, {...lastLoginCache, captchaValue: captcha})
    .then(() => {
      console.log('login success!!!');
      // TODO
      userRequest.clear('default');
      return res.json({data: null, success: true});
    })
    .catch((ex) => {
      console.log('login failed!!!', ex);
      return res.json({data: null, success: false});
    });
};
