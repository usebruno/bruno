const { workerData, parentPort } = require('worker_threads');
const {
  jsonToCollectionBru,
} = require('@usebruno/lang');

try {
  const json = workerData;
  const bru = jsonToCollectionBru(json);
  parentPort.postMessage(bru);
}
catch(error) {
  console.error(error);
}