/* eslint-disable no-unused-vars*/
const os = require('os');
const ifaces = os.networkInterfaces();
const uuid = require('uuid/v4');
const http = require('http');
const https = require('https');
const url = require('url');

let logger = console;
let config = {
  runnerPort: 3050,
  useHttps: false,
  taskTimeout: 5000,
  taskExpirationCheckInterval: 60000,
  maxTaskReschedualTimes: 3
};
let queueInstance;
const runningTask = {};

let currentIp;
Object.keys(ifaces).forEach(function (ifname) {
  ifaces[ifname].forEach(function (iface) {
    if (iface.family !== 'IPv4' || iface.internal !== false) {
      // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
      return;
    }
    if (!currentIp) {
      currentIp = iface.address;
    }
  });
});

const ERRORS = {
  DISPATCH_FAILED: 'dispatch_failed',
  RESCHEDUAL_FAILED: 'reschedual_failed'
};

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Dispatch a task to its' runner.
 */
function dispatchToRunner(task) {
  if (!task.taskId || !task.runner) throw new Error('Invalid task.');
  return new Promise((resolve, reject) => {
    const useHttps = ~task.runner.indexOf('https://');
    const runnerAddress = !useHttps && task.runner.indexOf('http:') !== 0 ? 'http://' + task.runner : task.runner;
    const httpClient = config.useHttps ? https : http;
    httpClient.get(`${runnerAddress}:${config.runnerPort}/dispatch?taskId=${task.taskId}`, (res) => {
      if (res.statusCode !== 200) {
        logger.error('Failed to dispatch task', res.statusCode);
        return reject(ERRORS.DISPATCH_FAILED);
      }
      res.setEncoding('utf8');

      let rawData = '';
      res.on('data', chunk => (rawData += chunk));
      res.on('end', () => {
        let json;
        try {
          json = JSON.parse(rawData);
        } catch (ex) {
          logger.error('Received invliad data while dispatch task to runner:', rawData);
          return reject(ERRORS.DISPATCH_FAILED);
        }

        if (json.result) return resolve();
        reject(ERRORS.DISPATCH_FAILED);
      });
    });
  });
}

let listenerSymbol = Symbol('listener symbol');
/** task queue interface */
/**
 * @typedef {Object} Task
 * @property {string} taskId
 * @property {number} start - Timestamp when the task is created.
 * @property {number} interval - Repeat interval. 0 indicates the task only run once.
 * @property {number} next - When the task should be executed.
 * @property {string} runner - Server ip who is being responsible for the task.
 * @property {Object} data - Data passed to the executor.
 */
class TaskQueueInterface {
  /**
   * @param {string} ip - Server ip.
   * @returns {Promise}
   */
  registerServer(ip) {
    throw new Error('Not implemented');
  }
  /**
   * @param {string} ip - Server ip.
   * @returns {Promise}
   */
  unregisterServer(ip) {
    throw new Error('Not implemented');
  }
  /**
   * @param {string} ip - Server ip
   * @returns {Promise<Task[]>}
   */
  getAllTasks(ip) {
    throw new Error('Not implemented');
  }
  /**
   * @param {string} taskId
   * @returns {Promise<Task>}
   */
  getTask(taskId) {
    throw new Error('Not implemented');
  }
  /**
   * @returns {Promise<string>}
   */
  getServerList() {
    throw new Error('Not implemented');
  }
  /**
   * @param {Task} task
   * @param {boolean} ignoreNotExist - Create a new task if the given task dose
   * not exist.
   * @returns {Promise<boolean>}
   */
  updateTask(task, ignoreNotExist = false) {
    throw new Error('Not implemented');
  }
  /**
   * Terminate a task.
   * @param {string|Task} task - Task id or task object to terminate.
   * @returns {Promise<boolean>}
   */
  terminateTask(task) {
    throw new Error('Not implemented');
  }
  /**
   * Get all expired tasks.
   * @returns {Promise<Task[]>}
   */
  getExpiredTasks() {
    throw new Error('Not implemented');
  }

  constructor() {
    this[listenerSymbol] = [];
    this.executeTask = this.executeTask.bind(this);
    this.schedualExpirationCheck = this.schedualExpirationCheck.bind(this);

    this.schedualExpirationCheck();
  }
  /**
   * @private
   */
  async reschedualRunnerTasks(ip) {
    const tasks = await this.getAllTasks(ip);
    return Promise.all(tasks.map(task => {
      return Promise.resolve()
        .then(() => {
          task.runner = '';
          return this.schedualTask(task);
        })
        .then(() => {
          return null;
        })
        .catch(() => {
          return task;
        });
    }))
      .then(ret => {
        ret = ret.filter(val => val);
        if (ret.length > 0) {
          logger.error('Failed to reschedual runner tasks', ret);
          throw ERRORS.RESCHEDUAL_FAILED;
        }
        return true;
      });
  }
  /**
   * @param {Object} task
   * @param {string} [task.taskId] - Task id. If not present, create a new task.
   * @param {number} [task.start] - Timestamp when the task is created.
   * @param {number} task.interval - Repeat interval. 0 indicates the task only run once.
   * @param {number} [task.next] - When the task should be executed.
   * @param {string} [task.runner] - Server ip who is being responsible for the task.
   * @param {Object} task.data - Data passed to the executor.
   * @returns {Boolean} If dispatched successfully.
   */
  async schedualTask(task) {
    const now = Date.now();
    let needDispatch = false;
    // we need to create a new task
    if (!task.taskId) {
      task.taskId = uuid();
      task.start = now;
      needDispatch = true;
    }
    if (!task.start) task.start = now;
    if (!task.interval) task.interval = 0;
    if (!task.next) task.next = task.interval + now;

    // if last time the runner was not able to handle this task
    if (task.runner) {
      if (!task._expired) {
        task._expired = true;
      } else {
        task.runner = null;
        task._expired = false;
      }
    }
    // set runner
    if (!task.runner) {
      const servers = await this.getServerList();
      const server = servers[getRandomInt(0, servers.length - 1)];
      task.runner = server;
      needDispatch = true;
    }

    // TODO: to enable multi-server we need to throw errors when some server
    // wants to updateTask but its ip is not as the task.runner.
    return needDispatch ? this.updateAndDispatchTask(task) : this.updateTask(task);
  }
  /**
   * @private
   */
  async updateAndDispatchTask(task) {
    await this.updateTask(task, true);
    // send request to task runner to arrange the task
    await dispatchToRunner(task);
    return true;
  }
  /**
   * 
   * @param {string} [taskId] - Only run for the given task id 
   * @param {Function} callback
   */
  onRun(taskId, callback) {
    if (arguments.length === 1) {
      this[listenerSymbol].push(taskId);
    } else {
      this[listenerSymbol].push((task) => {
        if (task.id === taskId) callback(task);
      });
    }
  }
  /**
   * @private
   * @param {Task} task
   */
  async executeTask(task, force = false) {
    let fromSelf = false;
    if (typeof task === 'string') {
      task = await this.getTask(task);
      fromSelf = true;
    }
    // TODO: runningTask differs from process to process
    if (!fromSelf && runningTask[task.taskId]) {
      if (!force) return;
      else {
        // ensure only one executor is running
        clearTimeout(runningTask[task.taskId]);
      }
    }
    const now = Date.now();
    let diff = task.next - now;
    if (diff <= 0) {
      // Try to update task state. This ensures even if we have
      // multiple executors, only one executor will be executed.
      // Because others throw errors while update task state.
      if (task.interval) {
        task.next = now + task.interval;
        diff = task.interval;
        await this.updateTask(task, false);
      } else {
        await this.terminateTask(task);
        delete runningTask[task.taskId];
      }
      try {
        this[listenerSymbol].forEach(func => {
          func({
            taskId: task.taskId,
            id: task.taskId,
            data: task.data,
            start: task.start,
            next: task.next,
            interval: task.interval
          });
        });
      } catch (ex) {
        logger.error(ex);
      }
    }
    if (diff > 0) {
      runningTask[task.taskId] = setTimeout(this.executeTask, diff, task.taskId);
    }
  }
  /**
   * @private
   */
  async schedualExpirationCheck() {
    setTimeout(this.schedualExpirationCheck, config.taskExpirationCheckInterval);

    const tasks = await this.getExpiredTasks();
    const expired = {};
    tasks.forEach(task => {
      if (isExpired(task)) {
        if (task.runner === currentIp) {
          this.executeTask(task);
        }
        expired[task.taskId] = 1;
      }
    });
    // check expired tasks again and try to rearrange them
    if (Object.keys(expired).length > 0) {
      setTimeout(async () => {
        const tasks = await this.getExpiredTasks();
        let rearrange = [];
        tasks.forEach(task => {
          if (expired[task.taskId] && isExpired(task.taskId)) {
            rearrange.push(task);
          }
        });
        let count = 0;
        while (1) {
          if (rearrange.length === 0) break;
          if (count >= config.maxTaskReschedualTimes) {
            logger.error('Unable to re-schedual task', rearrange);
            return;
          }
          rearrange = (await Promise.all(rearrange.map(task => {
            return Promise.resolve()
              .then(() => {
                task.runner = '';
                return this.schedualTask(task);
              })
              .then(() => {
                return null;
              })
              .catch(() => {
                return task;
              });
          }))).filter(val => val);
          count++;
        }
      }, config.taskTimeout + getRandomInt(1, 3) * 1000);
    }
  }
}

function isExpired(task) {
  return Date.now() - task.next >= config.taskTimeout;
}

// create runner server
const server = http.createServer(async (req, res) => {
  const _url = url.parse(req.url, true);

  if (_url.pathname === '/dispatch') {
    const { taskId } = _url.query;
    if (taskId) {
      let task = await queueInstance.getTask(taskId);
      if (task.runner === currentIp) {
        logger.log('Get task', Date.now(), task);
        queueInstance.executeTask(task, true);
        return res.end(JSON.stringify({ result: true }));
      }
    }
    return res.end(JSON.stringify({ result: false }));
  }

  res.end();
});
exports.TaskQueueInterface = TaskQueueInterface;
/**
 * @param {Object} conf
 * @param {Task} conf.queueInstance
 */
exports.config = (conf) => {
  return new Promise((resolve) => {
    config = {
      ...config,
      ...conf
    };
    logger = config.logger || console;
    currentIp = config.currentIp || currentIp;
    queueInstance = config.queueInstance;
    if (!server.listening) {
      server.listen(config.runnerPort, () => {
        console.log('task runner established!');
        // register self
        resolve(queueInstance.registerServer(currentIp));
      });
    }
  });
};
