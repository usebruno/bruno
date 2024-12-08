const { workerData, parentPort } = require('worker_threads');
const {
  bruToEnvJsonV2,
} = require('@usebruno/lang');

try {
  const bru = workerData;
  const json = bruToEnvJsonV2(bru);
  parentPort.postMessage(json);
}
catch(error) {
  console.error(error);
}