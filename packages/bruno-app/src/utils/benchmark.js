const FLUSH_INTERVAL_MS = 3000;

const getRendererMemory = () => {
  const memory = performance.memory;

  if (!memory) {
    return { heapUsed: null, rss: null, workingSet: null };
  }

  return {
    heapUsed: memory.usedJSHeapSize,
    rss: null,
    workingSet: null
  };
};

let checkpoint;
let createSpan;
let startBenchmarkFlush;
let stopBenchmarkFlush;
let flushEvents;

if (__BRUNO_BENCHMARK__) {
  const buffer = [];
  let flushIntervalId = null;

  const drainPreloadEvents = () => {
    if (typeof window.benchmarkDrainIpcEvents === 'function') {
      return window.benchmarkDrainIpcEvents();
    }

    return [];
  };

  const pushEvent = (event) => {
    buffer.push(event);
  };

  flushEvents = async () => {
    if (!window.ipcRenderer) {
      return;
    }

    const preloadEvents = drainPreloadEvents();

    if (!buffer.length && !preloadEvents.length) {
      return;
    }

    const events = buffer.splice(0, buffer.length);

    try {
      await window.ipcRenderer.invoke('benchmark:flush-events', [...events, ...preloadEvents]);
    } catch (err) {
      buffer.unshift(...events);
      console.error('[benchmark] Failed to flush renderer events:', err);
    }
  };

  checkpoint = (name, meta = {}) => {
    pushEvent({
      v: 1,
      type: 'checkpoint',
      process: 'renderer',
      name,
      wallTs: new Date().toISOString(),
      monoMs: performance.now(),
      memory: getRendererMemory(),
      meta
    });
  };

  createSpan = (name, meta = {}) => {
    const startMonoMs = performance.now();
    const memoryStart = getRendererMemory();

    return {
      stop: (endMeta = {}) => {
        const endMonoMs = performance.now();

        pushEvent({
          v: 1,
          type: 'span',
          process: 'renderer',
          name,
          wallTs: new Date().toISOString(),
          startMonoMs,
          endMonoMs,
          durationMs: endMonoMs - startMonoMs,
          memoryStart,
          memoryEnd: getRendererMemory(),
          meta: { ...meta, ...endMeta }
        });
      }
    };
  };

  startBenchmarkFlush = () => {
    if (flushIntervalId) {
      return;
    }

    flushIntervalId = setInterval(() => {
      flushEvents().catch((err) => {
        console.error('[benchmark] Periodic flush failed:', err);
      });
    }, FLUSH_INTERVAL_MS);
  };

  stopBenchmarkFlush = () => {
    if (!flushIntervalId) {
      return;
    }

    clearInterval(flushIntervalId);
    flushIntervalId = null;
  };
} else {
  checkpoint = () => {};
  createSpan = () => ({ stop: () => {} });
  startBenchmarkFlush = () => {};
  stopBenchmarkFlush = () => {};
  flushEvents = async () => {};
}

export { checkpoint, createSpan, startBenchmarkFlush, stopBenchmarkFlush, flushEvents };
