const path = require('node:path');

const SCANNER_ENTRY = path.join(__dirname, 'scanner-process.js');
const STOPPED_UNEXPECTEDLY = 'The collection scan stopped unexpectedly.';

class CollectionScanner {
  #fork;
  #send;
  #readLocations;
  #readRecents;
  #readExcludedPaths;
  #running = null;

  constructor({ fork, send, readLocations, readRecents, readExcludedPaths }) {
    this.#fork = fork;
    this.#send = send;
    this.#readLocations = readLocations;
    this.#readRecents = readRecents;
    this.#readExcludedPaths = readExcludedPaths;
  }

  async start(scanId) {
    if (this.#running?.scanId === scanId) {
      throw new Error(`Collection scan ${scanId} is already running`);
    }
    this.stop();
    const scan = { scanId, locations: null, child: null };
    this.#running = scan;
    try {
      const locations = await this.#readLocations();
      const recents = this.#readRecents();
      const excludedPaths = this.#readExcludedPaths();
      if (this.#running !== scan) {
        return null;
      }
      scan.locations = locations;
      scan.child = this.#fork(SCANNER_ENTRY, [], {
        serviceName: 'Bruno collection scan',
        stdio: 'inherit',
        env: { ...process.env, UV_THREADPOOL_SIZE: '8' }
      });
      const finishUnexpectedly = () => {
        if (this.#running === scan) {
          this.#finish(scan, [], STOPPED_UNEXPECTEDLY);
        }
      };
      scan.child.on('message', (message) => this.#handleMessage(scan, message));
      scan.child.on('error', finishUnexpectedly);
      scan.child.on('exit', finishUnexpectedly);
      scan.child.postMessage({
        locations: locations.map((location) => ({ id: location.id, path: location.path })),
        recents,
        excludedPaths
      });
      return { locations };
    } catch (error) {
      if (this.#running === scan) {
        this.#running = null;
      }
      throw error;
    }
  }

  cancel(scanId) {
    if (this.#running?.scanId === scanId) {
      this.stop();
    }
  }

  stop() {
    const child = this.#running?.child;
    this.#running = null;
    if (child && !child.kill()) {
      child.once('spawn', () => child.kill());
    }
  }

  #handleMessage(scan, message) {
    if (this.#running !== scan) {
      return;
    }
    if (message.type === 'batch') {
      this.#send('main:collection-scan:batch', { scanId: scan.scanId, collections: message.collections });
    } else if (message.type === 'done') {
      this.#finish(scan, message.locations, null);
    } else if (message.type === 'error') {
      this.#finish(scan, [], message.message || STOPPED_UNEXPECTEDLY);
    }
  }

  #finish(scan, reportedLocations, error) {
    this.#running = null;
    const reported = new Map(reportedLocations.map((location) => [location.id, location]));
    this.#send('main:collection-scan:done', {
      scanId: scan.scanId,
      locations: scan.locations.map((location) => {
        const { status, found } = reported.get(location.id) || { status: 'idle', found: 0 };
        return { ...location, status, found };
      }),
      error
    });
  }
}

module.exports = {
  CollectionScanner,
  SCANNER_ENTRY
};
