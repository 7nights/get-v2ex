const admin = require('firebase-admin');
const model = require('../models');

exports.send = async (user, params) => {
  const devices = await model.getDevicesByUser(user);
  if (devices && devices.length !== 0) {
    return admin.messaging().sendMulticast({
      tokens: devices.map(val => val.token),
      ...params
    }).then(ret => {
      if (ret && ret.responses) {
        ret.responses.forEach((val, i) => {
          val.token = devices[i].token;
          if (val.error && val.error.code === 'messaging/registration-token-not-registered') {
            // remove from database
            model.removeDeviceByToken(val.token);
          } else if (val.error) {
            console.error(val.error);
          }
        });
      }
      return ret;
    });
  }
};
