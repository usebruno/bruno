/**
 * FIFO drain for chokidar `add` events: start at most one add per macrotick so
 * ipcMain can run between starts. Does not await runAdd.
 */
const createAddFileScheduler = (runAdd) => {
  const queue = [];
  let draining = false;
  let timer = null;

  const stop = () => {
    queue.length = 0;
    draining = false;
    if (timer) {
      clearImmediate(timer);
      timer = null;
    }
  };

  const processTick = () => {
    timer = null;
    if (queue.length === 0) {
      draining = false;
      return;
    }

    const pathname = queue.shift();
    timer = setImmediate(processTick);
    Promise.resolve(runAdd(pathname)).catch((err) => {
      console.error('[collection-watcher] add failed for', pathname, err);
    });
  };

  return {
    enqueue(pathname) {
      queue.push(pathname);
      if (!draining) {
        draining = true;
        processTick();
      }
    },
    clear: stop
  };
};

module.exports = {
  createAddFileScheduler
};
