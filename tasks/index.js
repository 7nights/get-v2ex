const tasks = require('../lib/taskrunner');
const taskQueue = new (require('../lib/taskrunner/memoryqueue'));
const userRequests = require('../lib/userrequest');
const pageService = require('../services/pageservice');
const todayService = require('../services/todayservice');
const notificationService = require('../services/notificationservice');
const models = require('../models');
const config = require('../config');
const autoUpdate = require('../services/autoupdate');

// 3 hours
const SAME_NOTIFICATION_INTERVAL = 1000 * 60 * 60 * 3;

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
  taskQueue.onRun('fetch-notifications', async (task) => {
    // TODO: for now only support one user
    const res = await pageService.fetchPage(userRequests.get('default'), 'https://www.v2ex.com/go/walnut');
    const notificationCount = pageService.getNotificationCount(res);

    if (notificationCount && notificationCount > 0) {
      // get last sent notification count
      const { count: lastCount, time = 0 } = await models.getNotificationCount(config.cipher.user);
      // if no new updates, just return
      if (notificationCount === lastCount && Date.now() - time <= SAME_NOTIFICATION_INTERVAL) {
        console.log('Notification sending was ignored', notificationCount, lastCount, Date.now(), time);
        return;
      }

      const [notificationSentResult] = await Promise.all([notificationService.send(config.cipher.user, {
        webpush: {
          notification: {
            title: `You've got ${notificationCount} unread notification${notificationCount > 1 ? 's' : ''}.`,
            body: 'Click to check out more details.',
            tag: 'unread-notification-count',
            renotify: true,
            icon: './assets/logo-without-bg.png'
          }
        },
        data: {
          url: '/notifications',
          notificationCount: notificationCount + ''
        }
      }), models.setNotificationCount(config.cipher.user, notificationCount)]);
      console.log('send notifications: ', notificationSentResult);
    }
  });

  // check update
  config.autoUpdate !== false && taskQueue.schedualTask({
    taskId: 'auto-update',
    // 1 day
    interval: 1000 * 60 * 60 * 24,
    next: Date.now()
  });
  taskQueue.onRun('auto-update', () => {
    autoUpdate.checkAndUpdate();
  });

  // fetch today list on every start-up
  taskQueue.schedualTask({
    taskId: 'fetch-today-list',
    next: Date.now()
  });
  taskQueue.onRun('fetch-today-list', async () => {
    await todayService.getTodayList(void 0, true);
    await todayService.fetchPendingTodayPosts();

    // repeat every 24 hours
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(parseInt((config.popularTodayUpdateTimeInSeconds || 61200) / 60 / 60, 10) || 0);
    d.setMinutes(0);
    taskQueue.schedualTask({
      taskId: 'fetch-today-list',
      next: d.setSeconds(0)
    });
  });
};

module.exports();
