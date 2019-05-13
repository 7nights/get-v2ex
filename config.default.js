module.exports = {
  sessionSecret: 'ashid&ASKads(asnd',
  fcm: {
    // absolute path to your fcm server key
    serverKeyPath: '',
    databaseURL: ''
  },
  // at right now we only support one account per server
  cipher: {
    // your v2ex username
    user: '{{username}}',
    // your v2ex password
    password: '{{password}}',
    // pwa password, 4 numbers. eg. '1234'
    code: '{{pwaCode}}'
  },
  port: 3001
};
