const { ipcMain } = require('electron');
const { nanoid } = require('nanoid');
const { isBenchmarkEnabled, checkpoint, setBenchmarkAggregator } = require('../utils/benchmark');
const BenchmarkAggregator = require('./aggregator');
const WalWriter = require('./wal-writer');
const { patchIpcMainForBenchmark } = require('./ipc-patch');
const { registerBenchmarkIpc } = require('../ipc/benchmark');

let walWriter = null;

const startBenchmark = () => {
  if (!isBenchmarkEnabled()) {
    return null;
  }

  const aggregator = new BenchmarkAggregator();
  const sessionId = nanoid(10);

  setBenchmarkAggregator(aggregator);
  patchIpcMainForBenchmark(ipcMain, aggregator);
  registerBenchmarkIpc(aggregator);

  walWriter = new WalWriter(aggregator, sessionId);
  walWriter.start();

  console.log(`[benchmark] WAL path: ${walWriter.filePath}`);
  checkpoint('app-ready', { sessionId });

  return {
    aggregator,
    walWriter,
    sessionId
  };
};

const stopBenchmark = async () => {
  if (!walWriter) {
    return;
  }

  checkpoint('app-quit');
  await walWriter.stop();
  walWriter = null;
};

module.exports = {
  startBenchmark,
  stopBenchmark
};
