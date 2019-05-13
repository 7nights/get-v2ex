const getpage = require('./getpage');
const actions = require('./actions');
const misc = require('./misc');
const {auth} = require('../middlewares');

module.exports = (app) => {
  app.get('/recent', auth, getpage.recent);
  app.get('/topic', auth, getpage.topic);
  app.get('/node', auth, getpage.node);
  app.get('/member', auth, getpage.member);
  app.get('/notifications', auth, getpage.notifications);
  app.get('/login', auth, actions.login);
  app.get('/captcha', auth, misc.captcha);
  app.get('/block', auth, actions.blockUser);
  app.get('/unblock', auth, actions.unblockUser);
  app.get('/nodes', auth, getpage.nodes);
  app.get('/collected', auth, getpage.collected);
  app.get('/cipher', actions.submitCipher);
  app.get('/addToken', auth, actions.addToken);
  
  app.post('/reply', auth, actions.submitReply);
  app.post('/createTopic', auth, actions.createTopic);
  app.post('/collect', auth, actions.collectPost);
  app.post('/uncollect', auth, actions.uncollectPost);
  app.post('/likePost', auth, actions.likePost);
  app.post('/likeComment', auth, actions.likeComment);
  app.post('/alterFollowing', auth, actions.alterFollowing);

  app.get('/getHeaders', auth, (req, res) => {
    console.log(req.headers);
    res.json(req.headers);
  });
};
