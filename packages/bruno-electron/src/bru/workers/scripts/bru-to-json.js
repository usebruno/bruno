const { parentPort } = require('worker_threads');
const {
  bruToJsonV2,
} = require('@usebruno/lang');

parentPort.on('message', (workerData) => {
  try {
    const bru = workerData;
    const json = bruToJsonV2(bru);
    parentPort.postMessage(json);
  }
  catch(error) {
    console.error(error);
    parentPort.postMessage({ error: error?.message });
  }
});