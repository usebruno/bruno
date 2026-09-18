const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class WalWriter {
  constructor(aggregator, sessionId, flushIntervalMs = 3000) {
    this.aggregator = aggregator;
    this.sessionId = sessionId;
    this.flushIntervalMs = flushIntervalMs;
    this.intervalId = null;
    this.filePath = this.resolveFilePath();
  }

  resolveFilePath() {
    const logDir = process.env.BRUNO_BENCHMARK_LOG_DIR
      || path.join(app.getPath('userData'), 'benchmark');

    return path.join(logDir, `checkpoints-${this.sessionId}.wal`);
  }

  async ensureDirectory() {
    await fs.promises.mkdir(path.dirname(this.filePath), { recursive: true });
  }

  start() {
    if (this.intervalId) {
      return;
    }

    this.intervalId = setInterval(() => {
      this.flush().catch((err) => {
        console.error('[benchmark] WAL flush failed:', err);
      });
    }, this.flushIntervalMs);
  }

  async flush() {
    const events = this.aggregator.drain();

    if (!events.length) {
      return;
    }

    await this.ensureDirectory();
    const payload = events.map((event) => JSON.stringify(event)).join('\n') + '\n';
    await fs.promises.appendFile(this.filePath, payload, 'utf8');
  }

  async stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    await this.flush();
  }
}

module.exports = WalWriter;
