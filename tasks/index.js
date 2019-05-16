const tasks = require('../lib/taskrunner');
const taskQueue = new (require('../lib/taskrunner/memoryqueue'));
const userRequests = require('../lib/userrequest');
const pageService = require('../services/pageservice');
const notificationService = require('../services/notificationservice');
const models = require('../models');
const config = require('../config');

module.exports = async () => {
  // await models.open();
  await tasks.config({
    currentIp: '127.0.0.1',
    queueInstance: taskQueue
  });

  // All tasks schedualing should be done in master process.
  // Use forked processes to handle task jobs.

  // fetch notifications every 10 minutes
  taskQueue.schedualTask({
    taskId: 'fetch-notifications',
    interval: 60 * 10 * 1000,
    next: Date.now()
  });
  taskQueue.onRun(async (task) => {
    if (task.taskId === 'fetch-notifications') {
      // TODO: for now only support one user
      const res = await pageService.fetchPage(userRequests.get('default'), 'https://www.v2ex.com/go/walnut');
      const notificationCount = pageService.getNotificationCount(res);

      if (notificationCount && notificationCount > 0) {
        // TODO: for now only support one user
        const notificationSentResult = await notificationService.send(config.cipher.user, {
          notification: {
            title: `You got ${notificationCount} unread notification${notificationCount > 1 ? 's' : ''}.`,
            body: 'Click to check out more details.',
            tag: 'notification-count'
          },
          data: {
            url: '/notifications'
          }
        });
        console.log('send notifications: ', notificationSentResult);
      }
    }
  });
};

module.exports();
