const { workerData, parentPort } = require('worker_threads');
const {
  collectionBruToJson,
} = require('@usebruno/lang');

try {
  const bru = workerData;
  const json = collectionBruToJson(bru);
  parentPort.postMessage(json);
}
catch(error) {
  console.error(error);
}