const { app } = require('electron');

const getMainMemorySnapshot = () => {
  const mem = process.memoryUsage();
  let workingSet = null;

  try {
    const metrics = app.getAppMetrics();
    const mainMetric = metrics.find((metric) => metric.type === 'Browser') || metrics[0];

    if (mainMetric?.memory?.workingSetSize != null) {
      workingSet = mainMetric.memory.workingSetSize * 1024;
    }
  } catch (err) {
    // Benchmark builds should keep running even if metrics are unavailable.
  }

  return {
    heapUsed: mem.heapUsed,
    rss: mem.rss,
    workingSet
  };
};

module.exports = { getMainMemorySnapshot };
