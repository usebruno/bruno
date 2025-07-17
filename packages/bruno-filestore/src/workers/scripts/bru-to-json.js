const { parentPort } = require('worker_threads');
const { parseRequest } = require('../../index');

parentPort.on('message', (workerData) => {
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