const LogWatcher = require('./logWatcher');

let instance = null;

module.exports = {
  getWatcher: (logsPath) => {
    if (!instance) {
      instance = new LogWatcher(logsPath);
    }
    return instance;
  },

  resetWatcher: () => {
    if (instance) {
      instance.removeAllListeners('encounter');
      instance.close(); // <- Close chokidar watcher
      instance = null;
      console.log('LogWatcher reset.');
    }
  },
};
