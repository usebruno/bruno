const { workerData, parentPort } = require('worker_threads');
const {
  bruToJsonV2,
} = require('@usebruno/lang');

try {
  const bru = workerData;
  const json = bruToJsonV2(bru);
  parentPort.postMessage(json);
}
catch(error) {
  console.error(error);
  parentPort.postMessage({ error: error?.message });
}