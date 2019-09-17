const userRequest = require('../lib/userrequest');

exports.auth = (req, res, next) => {
  // TODO: add user authentication
  if (!req.session.user) {
    return res.json({
      error: {
        type: 'NEED_LOGIN'
      }
    });
  }
  
  // extend the session expiration every day
  req.session.days = Math.floor(Date.now() / (60*60*24e3));

  req.userRequest = userRequest.get('default');
  return next();
};
