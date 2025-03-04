const createQueuedActionDispatcher = ({ batchSize = 10, dispatch }) => {
  const actionQueue = [];

  const processBatch = () => {
    for (let i = 0; i < batchSize && actionQueue.length > 0; i++) {
      dispatch(actionQueue.shift());
    }
    if (actionQueue.length > 0) {
      setTimeout(processBatch, 0);
    }
  };

  return (action) => {
    actionQueue.push(action);
    if (actionQueue.length === 1) {
      setTimeout(processBatch, 0);
    }
  };
};

export default createQueuedActionDispatcher;
