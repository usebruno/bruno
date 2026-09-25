const { ipcMain } = require('electron');

const registerBenchmarkIpc = (aggregator) => {
  ipcMain.handle('benchmark:flush-events', (_event, events = []) => {
    if (Array.isArray(events)) {
      aggregator.push(...events);
    }

    return true;
  });
};

module.exports = { registerBenchmarkIpc };
