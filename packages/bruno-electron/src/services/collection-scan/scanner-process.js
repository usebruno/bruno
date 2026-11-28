const os = require('node:os');
const { scanLocations } = require('./scan');
const { createBatchSender } = require('./batch-sender');

const runScannerProcess = (port) => {
  port.once('message', async ({ data }) => {
    const { locations, recents, excludedPaths, homePath, knownFolders } = data;
    try {
      os.setPriority(os.constants.priority.PRIORITY_BELOW_NORMAL);
    } catch (error) {}
    const batches = createBatchSender((collections) => port.postMessage({ type: 'batch', collections }));
    try {
      const statuses = await scanLocations({ locations, recents, excludedPaths, homePath, knownFolders, onCollection: batches.add });
      batches.flush();
      port.postMessage({ type: 'done', locations: statuses });
      process.exit(0);
    } catch (error) {
      port.postMessage({ type: 'error', message: error.message });
      process.exit(1);
    }
  });
};

module.exports = {
  runScannerProcess
};

if (process.parentPort) runScannerProcess(process.parentPort);
