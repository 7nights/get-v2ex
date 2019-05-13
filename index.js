const express = require('express');
const app = express();
const cors = require('cors')
const session = require('cookie-session');
const bodyParser = require('body-parser');
const controllers = require('./controllers');
const config = require('./config');
const cluster = require('cluster');
const path = require('path');
const utils = require('./lib/utils');

try {
  // initialize firebase sdk
  if (config.fcm && config.fcm.serverKeyPath && config.fcm.databaseURL) {
    const admin = require('firebase-admin');
    const fcmServiceAccount = require(config.fcm.serverKeyPath);
    admin.initializeApp({
      credential: admin.credential.cert(fcmServiceAccount),
      databaseURL: config.fcm.databaseURL
    });
  } else {
    console.log('No fcm server configuration found.');
  }
} catch (ex) {
  console.log('Failed to initialize fcm', ex);
}

// const globalTunnel = require('global-tunnel-ng');
// globalTunnel.initialize({
//   host: 'localhost',
//   port: 1087,
// });

// initialize database
const models = require('./models');
require('./lib/context').setContext(app);

app.use(session({
  name: 'session',
  secret: config.sessionSecret,
  signed: true
}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());



const whitelist = ['localhost', '127.0.0.1'];
app.use(cors({
  credentials: true,
  origin: function (origin, callback) {
    // TODO: whitelist check
    callback(null, true);
  }
}));

controllers(app);

const port = config.port || 3001;
models.open()
  .then((db) => {
    app.db = db;

    // setup tasks
    // cluster.setupMaster({
    //   exec: path.join(__dirname, 'tasks/index.js')
    // });
    // const taskWorker = cluster.fork();
    // taskWorker.on('online', () => {
    //   console.log(`task worker[${taskWorker.id}] online`);
    // });
    // taskWorker.on('disconnect', async () => {
    //   console.log(`task worker[${taskWorker.id}] offline, will re-fork in 5 seconds`);
    //   await utils.wait(5000);
    //   cluster.fork();
    // });
    // TODO: at right now we can do all the things in one process
    require('./tasks');

    let server = app.listen(port, function () {
      console.log('get-v2ex is listening on port ' + port + '!')
    });
    
    server.on('error', (ex) => {
      console.log(ex);
    });
  });
