const path = require('node:path');

const makeChild = () => {
  const child = {
    handlers: {},
    on(event, fn) {
      this.handlers[event] = fn;
    },
    postMessage(msg) {
      if (msg.type === 'discover') {
        const { id, collections } = msg;
        const collectionPath = collections?.[0]?.path;
        setImmediate(() => {
          if (collectionPath) {
            this.handlers.message?.({ id, type: 'hit', collectionPath, relativePath: 'ping.bru' });
          }
          this.handlers.message?.({ id, type: 'complete' });
        });
      }
    },
    kill: jest.fn()
  };
  return child;
};

let mockForkChild;
jest.mock('electron', () => ({
  utilityProcess: {
    fork: jest.fn(() => {
      mockForkChild = makeChild();
      return mockForkChild;
    })
  }
}));

const { discoverCollections, cancelDiscovery, shutdownRipgrepHost } = require('../../src/services/search-index/ripgrep-host');

describe('ripgrep-host', () => {
  afterEach(() => {
    shutdownRipgrepHost();
    mockForkChild = null;
    jest.clearAllMocks();
  });

  it('streams file hits and completes discovery', async () => {
    const collectionPath = path.join('/tmp', 'Alpha');
    const hits = [];
    const { promise } = discoverCollections({
      term: 'needle',
      collections: [{ path: collectionPath, name: 'Alpha' }],
      onHit: (root, relativePath) => hits.push({ root, relativePath })
    });
    await promise;
    expect(hits).toEqual([{ root: collectionPath, relativePath: 'ping.bru' }]);
  });

  it('rejects pending work when the utility process exits', async () => {
    const stalledChild = makeChild();
    stalledChild.postMessage = () => {};
    const { utilityProcess } = require('electron');
    utilityProcess.fork.mockReturnValueOnce(stalledChild);
    shutdownRipgrepHost();

    const collectionPath = path.join('/tmp', 'Beta');
    const { promise } = discoverCollections({
      term: 'x',
      collections: [{ path: collectionPath, name: 'Beta' }],
      onHit: () => {}
    });
    stalledChild.handlers.exit?.();
    await expect(promise).rejects.toThrow(/exited/i);
  });

  it('drops cancelled discovery without completing', async () => {
    const collectionPath = path.join('/tmp', 'Gamma');
    let settled = false;
    const { id, promise } = discoverCollections({
      term: 'y',
      collections: [{ path: collectionPath, name: 'Gamma' }],
      onHit: () => {}
    });
    promise.then(() => { settled = true; }).catch(() => {});
    cancelDiscovery(id);
    await new Promise((r) => setImmediate(r));
    expect(settled).toBe(false);
  });
});
