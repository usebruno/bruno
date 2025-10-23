const pidusage = require('pidusage');

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
    this.intervalId = setInterval(() => {
      this.emitSystemStats(win);
    }, intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isMonitoring = false;
  }

  async emitSystemStats(win) {
    try {
      const pid = process.pid;
      const stats = await pidusage(pid);
      const uptime = (Date.now() - this.startTime) / 1000;

      const systemResources = {
        cpu: stats.cpu || 0,
        memory: stats.memory || 0,
        pid: pid,
        uptime: uptime,
        timestamp: new Date().toISOString(),
      };

      win.webContents.send('main:filesync-system-resources', systemResources);
    } catch (error) {
      console.error('Error getting system stats:', error);

      // Fallback stats if pidusage fails
      const fallbackStats = {
        cpu: 0,
        memory: process.memoryUsage().rss,
        pid: process.pid,
        uptime: (Date.now() - this.startTime) / 1000,
        timestamp: new Date().toISOString(),
      };

      win.webContents.send('main:filesync-system-resources', fallbackStats);
    }
  }

  isRunning() {
    return this.isMonitoring;
  }
}

module.exports = SystemMonitor;
