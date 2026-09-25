const { performance } = require('node:perf_hooks');
const { getMainMemorySnapshot } = require('../benchmark/memory');
const pkg = require('../../package.json');

const isBenchmarkEnabled = () => {
  if (pkg.brunoBuild?.benchmark === true) {
    return true;
  }

  return process.env.BRUNO_BENCHMARK === 'true';
};

let aggregator = null;

const setBenchmarkAggregator = (nextAggregator) => {
  aggregator = nextAggregator;
};

const pushEvent = (event) => {
  if (!aggregator) {
    return;
  }

  aggregator.push(event);
};

const checkpoint = (name, meta = {}) => {
  if (!isBenchmarkEnabled()) {
    return;
  }

  pushEvent({
    v: 1,
    type: 'checkpoint',
    process: 'main',
    name,
    wallTs: new Date().toISOString(),
    monoMs: performance.now(),
    memory: getMainMemorySnapshot(),
    meta
  });
};

const createSpan = (name, meta = {}) => {
  if (!isBenchmarkEnabled()) {
    return { stop: () => {} };
  }

  const startMonoMs = performance.now();
  const memoryStart = getMainMemorySnapshot();

  return {
    stop: (endMeta = {}) => {
      const endMonoMs = performance.now();

      pushEvent({
        v: 1,
        type: 'span',
        process: 'main',
        name,
        wallTs: new Date().toISOString(),
        startMonoMs,
        endMonoMs,
        durationMs: endMonoMs - startMonoMs,
        memoryStart,
        memoryEnd: getMainMemorySnapshot(),
        meta: { ...meta, ...endMeta }
      });
    }
  };
};

module.exports = {
  isBenchmarkEnabled,
  checkpoint,
  createSpan,
  setBenchmarkAggregator
};
