const model = require('../models');
const admin = require('firebase-admin');

exports.showAllDevices = async function showAllDevices(req, res) {
  const devices = await model.getDevicesByUser(req.session.user);
  res.json({
    success: true,
    data: devices
  });
};

exports.sendMessageToToken = async function sendMessageToToken(req, res) {
  if (!req.query.token || !req.query.message) return res.json({ error: 'Invalid params' });
  const result = admin.messaging().sendMulticast({
    tokens: req.query.token.split(',')
  });
};
