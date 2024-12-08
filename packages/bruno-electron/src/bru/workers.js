const { workerQueue, workerQueueSmall } = require('./bruWorker');

// 0.1 MB
const SIZE_LIMIT = 0.1 * 1024 * 1024;

const getSize = (data) => {
  return typeof data === 'string' ? Buffer.byteLength(data, 'utf8') : Buffer.byteLength(JSON.stringify(data), 'utf8');
}

const runBruToJsonV2Worker = async (data) => {
  const size = getSize(data);
  if(size < SIZE_LIMIT) {
    const res = await workerQueue.enqueue({ taskData: data }, 'runBruToJsonV2Worker');
    return res;
  }
  else {
    const res = await workerQueueSmall.enqueue({ taskData: data }, 'runBruToJsonV2Worker');
    return res;
  }
}

const runJsonToBruV2Worker = async (data) => {
  const size = getSize(data);
  if(size < SIZE_LIMIT) {
    const res = await workerQueue.enqueue({ taskData: data }, 'runJsonToBruV2Worker');
    return res;
  }
  else {
    const res = await workerQueueSmall.enqueue({ taskData: data }, 'runJsonToBruV2Worker');
    return res;
  }
}

const runBruToEnvJsonV2Worker = async (data) => {
  const size = getSize(data);
  if(size < SIZE_LIMIT) {
    const res = await workerQueue.enqueue({ taskData: data }, 'runBruToEnvJsonV2Worker');
    return res;
  }
  else {
    const res = await workerQueueSmall.enqueue({ taskData: data }, 'runBruToEnvJsonV2Worker');
    return res;
  }
}

const runEnvJsonToBruV2Worker = async (data) => {
  const size = getSize(data);
  if(size < SIZE_LIMIT) {
    const res = await workerQueue.enqueue({ taskData: data }, 'runEnvJsonToBruV2Worker');
    return res;
  }
  else {
    const res = await workerQueueSmall.enqueue({ taskData: data }, 'runEnvJsonToBruV2Worker');
    return res;
  }
}

const runCollectionBruToJsonWorker = async (data) => {
  const size = getSize(data);
  if(size < SIZE_LIMIT) {
    const res = await workerQueue.enqueue({ taskData: data }, 'runCollectionBruToJsonWorker');
    return res;
  }
  else {
    const res = await workerQueueSmall.enqueue({ taskData: data }, 'runCollectionBruToJsonWorker');
    return res;
  }
}

const runJsonToCollectionBruWorker = async (data) => {
  const size = getSize(data);
  if(size < SIZE_LIMIT) {
    const res = await workerQueue.enqueue({ taskData: data }, 'runJsonToCollectionBruWorker');
    return res;
  }
  else {
    const res = await workerQueueSmall.enqueue({ taskData: data }, 'runJsonToCollectionBruWorker');
    return res;
  }
}

module.exports = {
  runBruToJsonV2Worker,
  runJsonToBruV2Worker,
  runBruToEnvJsonV2Worker,
  runEnvJsonToBruV2Worker,
  runCollectionBruToJsonWorker,
  runJsonToCollectionBruWorker
}