const { parentPort } = require('worker_threads');
const { stringifyRequest } = require('@usebruno/filestore');

parentPort.on('message', (workerData) => {
  try {
    const json = workerData;
    const bru = stringifyRequest(json);
    parentPort.postMessage(bru);
  }
  catch(error) {
    console.error(error);
    parentPort.postMessage({ error: error?.message });
  }
});