const BATCH_INTERVAL_MS = 250;

const createBatchSender = (send) => {
  let pending = [];
  let timer = null;
  let lastSentAt = -Infinity;

  const flush = () => {
    clearTimeout(timer);
    timer = null;
    if (pending.length > 0) {
      send(pending);
      pending = [];
      lastSentAt = Date.now();
    }
  };

  const add = (collection) => {
    pending.push(collection);
    if (timer === null) {
      timer = setTimeout(flush, Math.max(0, BATCH_INTERVAL_MS - (Date.now() - lastSentAt)));
    }
  };

  return { add, flush };
};

module.exports = {
  createBatchSender
};
