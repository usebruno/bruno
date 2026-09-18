const { performance } = require('node:perf_hooks');
const { nanoid } = require('nanoid');

const ipcEvents = [];

const recordIpcInvokeStart = (channel) => {
  const id = nanoid(8);
  const monoMs = performance.now();

  ipcEvents.push({
    v: 1,
    type: 'ipc',
    id,
    channel,
    side: 'renderer',
    phase: 'invoke-start',
    monoMs
  });

  return { id, startMonoMs: monoMs };
};

const recordIpcInvokeEnd = (channel, context) => {
  const endMonoMs = performance.now();

  ipcEvents.push({
    v: 1,
    type: 'ipc',
    id: context.id,
    channel,
    side: 'renderer',
    phase: 'invoke-end',
    monoMs: endMonoMs,
    durationMs: endMonoMs - context.startMonoMs
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
