const { ipcMain } = require('electron');

const registerSystemMonitorIpc = (mainWindow, systemMonitor) => {
  ipcMain.handle('renderer:start-system-monitoring', (event, intervalMs = 2000) => {
    try {
      systemMonitor.start(mainWindow, intervalMs);
      return { success: true };
    } catch (error) {
      console.error('Error starting system monitoring:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('renderer:stop-system-monitoring', (event) => {
    try {
      systemMonitor.stop();
      return { success: true };
    } catch (error) {
      console.error('Error stopping system monitoring:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('renderer:is-system-monitoring-active', (event) => {
    try {
      const isActive = systemMonitor.isRunning();
      return { success: true, isActive };
    } catch (error) {
      console.error('Error checking system monitoring status:', error);
      return { success: false, error: error.message, isActive: false };
    }
  });
};

module.exports = registerSystemMonitorIpc;
