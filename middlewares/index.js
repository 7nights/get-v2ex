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

  req.userRequest = userRequest.get('default');
  return next();
};
