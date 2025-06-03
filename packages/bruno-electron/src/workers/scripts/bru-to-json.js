const { parentPort } = require('worker_threads');
const { parseRequest } = require('@usebruno/filestore');

parentPort.on('message', async (workerData) => {
  try {
    const bru = workerData;
    const json = parseRequest(bru);
    parentPort.postMessage(json);
  }
  catch(error) {
    console.error(error);
    parentPort.postMessage({ error: error?.message });
  }
});