const { ipcRenderer, contextBridge, webUtils, shell } = require('electron');
const { isBenchmarkEnabled } = require('./utils/benchmark');
const {
  recordIpcInvokeStart,
  recordIpcInvokeEnd,
  drainIpcEvents
} = require('./benchmark/preload');

const benchmarkEnabled = isBenchmarkEnabled();

contextBridge.exposeInMainWorld('isPlaywright', process.env.PLAYWRIGHT === 'true');
contextBridge.exposeInMainWorld('isBenchmarkBuild', benchmarkEnabled);

if (benchmarkEnabled) {
  contextBridge.exposeInMainWorld('benchmarkDrainIpcEvents', drainIpcEvents);
}

const invokeWithBenchmark = async (channel, ...args) => {
  if (!benchmarkEnabled) {
    return ipcRenderer.invoke(channel, ...args);
  }

  const context = recordIpcInvokeStart(channel);

  try {
    return await ipcRenderer.invoke(channel, ...args);
  } finally {
    recordIpcInvokeEnd(channel, context);
  }
};

contextBridge.exposeInMainWorld('ipcRenderer', {
  invoke: (channel, ...args) => invokeWithBenchmark(channel, ...args),
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),
  on: (channel, handler) => {
    // Deliberately strip event as it includes `sender`
    const subscription = (event, ...args) => {
      // Ensure args is always an array to prevent undefined errors
      const safeArgs = args && args.length ? args : [];
      handler(...safeArgs);
    };
    ipcRenderer.on(channel, subscription);

    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },
  getFilePath(file) {
    const path = webUtils.getPathForFile(file);
    return path;
  },
  openExternal: (url) => shell.openExternal(url)
});
