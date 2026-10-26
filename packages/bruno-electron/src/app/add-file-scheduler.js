/**
 * FIFO drain for chokidar `add` events: start at most one add per macrotick.
 * The next file starts when runAdd calls releaseSlot (or when the promise settles).
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

  const scheduleNext = () => {
    if (!draining || queue.length === 0) {
      if (queue.length === 0) {
        draining = false;
      }
      return;
    }

    timer = setImmediate(processTick);
  };

  const processTick = () => {
    timer = null;
    if (!draining || queue.length === 0) {
      draining = false;
      return;
    }

    const pathname = queue.shift();
    let released = false;
    const releaseSlot = () => {
      if (released) {
        return;
      }
      released = true;
      scheduleNext();
    };

    try {
      Promise.resolve(runAdd(pathname, releaseSlot))
        .catch((err) => {
          console.error('[collection-watcher] add failed for', pathname, err);
        })
        .finally(() => {
          releaseSlot();
        });
    } catch (err) {
      console.error('[collection-watcher] add failed for', pathname, err);
      releaseSlot();
    }
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
