const { app } = require('electron');

class SystemMonitor {
  constructor() {
    this.intervalId = null;
    this.isMonitoring = false;
    this.startTime = null;
  }

  start(win, intervalMs = 2000) {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;

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
      const currentTime = new Date();

      if (metrics.length === 0) {
        throw new Error('No metrics found');
      }

      if (this.startTime == null) {
        let creationTime = metrics[0].creationTime;

        for (const metric of metrics) {
          creationTime = Math.min(creationTime, metric.creationTime);
        }

        this.startTime = new Date(creationTime);
      }

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
        timestamp: currentTime.toISOString()
      };

      if (win && !win.isDestroyed()) {
        win.webContents.send('main:filesync-system-resources', systemResources);
      }
    } catch (error) {
      console.error('Error getting system stats:', error);

      const memory = process.memoryUsage();
      const currentTime = new Date();

      const uptime = !this.startTime ? 0 : (currentTime - this.startTime) / 1000;

      // Fallback stats using process.memoryUsage()
      const fallbackStats = {
        cpu: 0,
        memory: memory.rss,
        pid: process.pid,
        uptime: uptime,
        timestamp: currentTime.toISOString()
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
