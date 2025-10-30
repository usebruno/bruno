const { app } = require('electron');

class SystemMonitor {
  constructor() {
    this.intervalId = null;
    this.isMonitoring = false;
    this.startTime = Date.now();
  }

  start(win, intervalMs = 2000) {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.startTime = Date.now();

    // Emit initial stats
    this.emitSystemStats(win);

    // Set up periodic monitoring
    // Use setTimeout pattern instead of setInterval to avoid overlapping calls
    this.scheduleNextEmit(win, intervalMs);
  }

  scheduleNextEmit(win, intervalMs) {
    if (!this.isMonitoring) {
      return;
    }

    this.intervalId = setTimeout(() => {
      this.emitSystemStats(win);
      this.scheduleNextEmit(win, intervalMs);
    }, intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    this.isMonitoring = false;
  }

  emitSystemStats(win) {
    try {
      const metrics = app.getAppMetrics();
      const currentTime = Date.now();

      let totalCPU = 0;
      let totalMemory = 0;

      for (const metric of metrics) {
        totalCPU += metric.cpu.percentCPUUsage;
        totalMemory += metric.memory.workingSetSize;
      }

      const uptime = (currentTime - this.startTime) / 1000;

      const systemResources = {
        cpu: totalCPU,
        memory: totalMemory,
        pid: process.pid,
        uptime: uptime,
        timestamp: new Date().toISOString()
      };

      if (win && !win.isDestroyed()) {
        win.webContents.send('main:filesync-system-resources', systemResources);
      }
    } catch (error) {
      console.error('Error getting system stats:', error);

      // Fallback stats using process.memoryUsage()
      const fallbackStats = {
        cpu: 0,
        memory: process.memoryUsage().rss,
        pid: process.pid,
        uptime: (Date.now() - this.startTime) / 1000,
        timestamp: new Date().toISOString()
      };

      if (win && !win.isDestroyed()) {
        win.webContents.send('main:filesync-system-resources', fallbackStats);
      }
    }
  }

  isRunning() {
    return this.isMonitoring;
  }
}

module.exports = SystemMonitor;
