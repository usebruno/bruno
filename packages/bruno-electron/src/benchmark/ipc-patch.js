const { performance } = require('node:perf_hooks');
const { getMainMemorySnapshot } = require('./memory');
const { extractBenchmarkContext } = require('./extract-context');

const patchIpcMainForBenchmark = (ipcMain, aggregator) => {
  const originalHandle = ipcMain.handle.bind(ipcMain);

  ipcMain.handle = (channel, listener) => {
    return originalHandle(channel, async (event, ...args) => {
      const id = `${channel}-${performance.now()}`;
      const startMonoMs = performance.now();
      const memoryStart = getMainMemorySnapshot();
      const meta = extractBenchmarkContext(args);
      const metaFields = Object.keys(meta).length ? { meta } : {};

      aggregator.push({
        v: 1,
        type: 'ipc',
        id,
        channel,
        side: 'main',
        phase: 'handler-start',
        monoMs: startMonoMs,
        memory: memoryStart,
        ...metaFields
      });

      try {
        return await listener(event, ...args);
      } finally {
        const endMonoMs = performance.now();

        aggregator.push({
          v: 1,
          type: 'ipc',
          id,
          channel,
          side: 'main',
          phase: 'handler-end',
          monoMs: endMonoMs,
          durationMs: endMonoMs - startMonoMs,
          memory: getMainMemorySnapshot(),
          memoryStart,
          ...metaFields
        });
      }
    });
  };
};

module.exports = { patchIpcMainForBenchmark };
