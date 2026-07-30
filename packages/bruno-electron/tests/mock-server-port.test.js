jest.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: jest.fn(() => [])
  }
}));

const net = require('net');
const path = require('path');
const os = require('os');
const fs = require('fs');
const {
  checkPortAvailable,
  suggestPort,
  start,
  stop
} = require('../src/app/mock-server/mock-server');

const listen = (host) => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, host, () => resolve(server));
});

describe('mock-server port availability', () => {
  let server;
  let workspacePath;

  afterEach(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      server = null;
    }
    try {
      await stop('mock-self-port');
    } catch {
      // not running
    }
    if (workspacePath) {
      fs.rmSync(workspacePath, { recursive: true, force: true });
      workspacePath = null;
    }
  });

  it('treats a wildcard listener as unavailable', async () => {
    server = await listen('0.0.0.0');
    const port = server.address().port;

    const result = await checkPortAvailable(port);

    expect(result).toEqual({ available: false, reason: 'system' });
  });

  it('suggestPort skips an occupied wildcard port', async () => {
    server = await listen('0.0.0.0');
    const port = server.address().port;

    const suggested = await suggestPort(port);

    expect(suggested).toBe(port + 1);
  });

  it('treats a free port as available', async () => {
    server = await listen('127.0.0.1');
    const port = server.address().port;
    await new Promise((resolve) => server.close(resolve));
    server = null;

    const result = await checkPortAvailable(port);

    expect(result).toEqual({ available: true, reason: null });
  });

  it('does not treat a running mock as a system conflict for itself', async () => {
    workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-mock-port-'));
    server = await listen('127.0.0.1');
    const port = server.address().port;
    await new Promise((resolve) => server.close(resolve));
    server = null;

    await start({
      mockServerUid: 'mock-self-port',
      serverName: 'Self Port',
      sourceType: 'manual',
      workspacePath,
      port
    });

    const forSelf = await checkPortAvailable(port, { mockServerUid: 'mock-self-port' });
    const forOther = await checkPortAvailable(port, { mockServerUid: 'other-mock' });

    expect(forSelf).toEqual({ available: true, reason: null });
    expect(forOther).toEqual({ available: false, reason: 'bruno' });
  });
});
