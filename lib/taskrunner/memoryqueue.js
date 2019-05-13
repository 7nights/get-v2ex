const TaskQueueInterface = require('./index').TaskQueueInterface;

const servers = {};
const taskQueue = {};

class TaskQueue extends TaskQueueInterface {
  registerServer(ip) {
    return Promise.resolve()
      .then(() => {
        servers[ip] = 1;
      });
  }
  unregisterServer(ip) {
    return Promise.resolve()
      .then(() => {
        delete servers[ip];
      });
  }
  getAllTasks(ip) {
    if (!ip) return Promise.resolve(Object.values(taskQueue));
    return Promise.resolve(Object.values(taskQueue).filter(task => task.runner === ip));
  }
  getTask(id) {
    return Promise.resolve(taskQueue[id]);
  }
  getServerList() {
    return Promise.resolve(Object.keys(servers));
  }
  updateTask(task, ignoreNotExist = false) {
    return Promise.resolve()
      .then(() => {
        if (!ignoreNotExist && !taskQueue[task.taskId]) {
          throw new Error('Task not exists');
        }
        if (!taskQueue[task.taskId]) {
          taskQueue[task.taskId] = task;
        }
        taskQueue[task.taskId] = {
          ...taskQueue[task.taskId],
          ...task
        };

        return true;
      });
  }
  terminateTask(task) {
    return Promise.resolve()
      .then(() => {
        const id = typeof task === 'string' ? task : task.taskId;
        delete taskQueue[id];
        return true;
      });
  }
  getExpiredTasks() {
    return Promise.resolve()
      .then(() => {
        const now = Date.now();
        return Object.values(taskQueue).filter(task => {
          return task.next - now <= 0;
        });
      });
  }
}

module.exports = TaskQueue;

