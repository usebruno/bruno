const { workerData, parentPort } = require('worker_threads');
const {
  jsonToBruV2,
} = require('@usebruno/lang');
try {
  const json = workerData;
  const bru = jsonToBruV2(json);
  parentPort.postMessage(bru);
}
catch(error) {
  console.error(error);
  parentPort.postMessage({ error: error?.message });
}