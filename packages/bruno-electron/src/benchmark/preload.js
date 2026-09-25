const { performance } = require('node:perf_hooks');
const { nanoid } = require('nanoid');
const { extractBenchmarkContext } = require('./extract-context');

const ipcEvents = [];

const recordIpcInvokeStart = (channel, ...args) => {
  const id = nanoid(8);
  const monoMs = performance.now();
  const meta = extractBenchmarkContext(args);

  ipcEvents.push({
    v: 1,
    type: 'ipc',
    id,
    channel,
    side: 'renderer',
    phase: 'invoke-start',
    monoMs,
    ...(Object.keys(meta).length ? { meta } : {})
  });

  return { id, startMonoMs: monoMs, meta };
};

const recordIpcInvokeEnd = (channel, context) => {
  const endMonoMs = performance.now();
  const meta = context.meta || {};

  ipcEvents.push({
    v: 1,
    type: 'ipc',
    id: context.id,
    channel,
    side: 'renderer',
    phase: 'invoke-end',
    monoMs: endMonoMs,
    durationMs: endMonoMs - context.startMonoMs,
    ...(Object.keys(meta).length ? { meta } : {})
  });
};

const drainIpcEvents = () => {
  const drained = ipcEvents.splice(0, ipcEvents.length);
  return drained;
};

module.exports = {
  recordIpcInvokeStart,
  recordIpcInvokeEnd,
  drainIpcEvents
};
