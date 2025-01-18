const { workerQueue, workerQueueSmall } = require('./bruWorker');


// collections can have bru files of varying sizes. we use two worker threads:
// - one thread handles smaller files (<SIZE_LIMIT), so they get processed quickly and show up in the gui faster.
// - the other thread takes care of larger files (>=SIZE_LIMIT). Splitting the processing like this helps with parsing performance.
const SIZE_LIMIT = 0.1 * 1024 * 1024;

const getSize = (data) => {
  return typeof data === 'string' ? Buffer.byteLength(data, 'utf8') : Buffer.byteLength(JSON.stringify(data), 'utf8');
}

const runBruToJsonV2Worker = async (data) => {
  const size = getSize(data);
  if(size < SIZE_LIMIT) {
    const res = await workerQueue.enqueue({ taskData: data, size }, 'runBruToJsonV2Worker');
    return res;
  }
  else {
    const res = await workerQueueSmall.enqueue({ taskData: data, size }, 'runBruToJsonV2Worker');
    return res;
  }
}

const runJsonToBruV2Worker = async (data) => {
  const size = getSize(data);
  if(size < SIZE_LIMIT) {
    const res = await workerQueue.enqueue({ taskData: data, size }, 'runJsonToBruV2Worker');
    return res;
  }
  else {
    const res = await workerQueueSmall.enqueue({ taskData: data, size }, 'runJsonToBruV2Worker');
    return res;
  }
}

const runBruToEnvJsonV2Worker = async (data) => {
  const size = getSize(data);
  if(size < SIZE_LIMIT) {
    const res = await workerQueue.enqueue({ taskData: data, size }, 'runBruToEnvJsonV2Worker');
    return res;
  }
  else {
    const res = await workerQueueSmall.enqueue({ taskData: data, size }, 'runBruToEnvJsonV2Worker');
    return res;
  }
}

const runEnvJsonToBruV2Worker = async (data) => {
  const size = getSize(data);
  if(size < SIZE_LIMIT) {
    const res = await workerQueue.enqueue({ taskData: data, size }, 'runEnvJsonToBruV2Worker');
    return res;
  }
  else {
    const res = await workerQueueSmall.enqueue({ taskData: data, size }, 'runEnvJsonToBruV2Worker');
    return res;
  }
}

const runCollectionBruToJsonWorker = async (data) => {
  const size = getSize(data);
  if(size < SIZE_LIMIT) {
    const res = await workerQueue.enqueue({ taskData: data, size }, 'runCollectionBruToJsonWorker');
    return res;
  }
  else {
    const res = await workerQueueSmall.enqueue({ taskData: data, size }, 'runCollectionBruToJsonWorker');
    return res;
  }
}

const runJsonToCollectionBruWorker = async (data) => {
  const size = getSize(data);
  if(size < SIZE_LIMIT) {
    const res = await workerQueue.enqueue({ taskData: data, size }, 'runJsonToCollectionBruWorker');
    return res;
  }
  else {
    const res = await workerQueueSmall.enqueue({ taskData: data, size }, 'runJsonToCollectionBruWorker');
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