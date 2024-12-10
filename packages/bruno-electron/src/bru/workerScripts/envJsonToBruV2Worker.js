const { workerData, parentPort } = require('worker_threads');
const {
  envJsonToBruV2,
} = require('@usebruno/lang');

try {
  const json = workerData;
  const bru = envJsonToBruV2(json);
  parentPort.postMessage(bru);
}
catch(error) {
  console.error(error);
}