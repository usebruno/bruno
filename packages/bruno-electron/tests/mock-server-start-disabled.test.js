jest.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: jest.fn(() => [])
  }
}));

jest.mock('../src/store/preferences', () => ({
  preferencesUtil: {
    isBetaFeatureEnabled: jest.fn()
  }
}));

const net = require('net');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { preferencesUtil } = require('../src/store/preferences');
const { checkPortAvailable, getStatus, start, stop } = require('../src/app/mock-server/mock-server');

const MOCK_SERVER_UID = 'mock-disabled-mid-start';

const getFreePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address();
    server.close(() => resolve(port));
  });
});

describe('mock-server start when the beta feature is turned off', () => {
  let workspacePath;

  beforeEach(() => {
    workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-mock-disabled-'));
  });

  afterEach(async () => {
    await stop(MOCK_SERVER_UID);
    fs.rmSync(workspacePath, { recursive: true, force: true });
  });

  it('does not keep a server running when the feature is turned off while it starts', async () => {
    preferencesUtil.isBetaFeatureEnabled.mockReturnValueOnce(true).mockReturnValue(false);
    const port = await getFreePort();

    await expect(start({
      mockServerUid: MOCK_SERVER_UID,
      serverName: 'Disabled Mid Start',
      sourceType: 'manual',
      workspacePath,
      port
    })).rejects.toThrow('Enable it in Preferences > Beta');

    expect(getStatus(MOCK_SERVER_UID, { workspacePath }).status).toBe('stopped');
    expect(await checkPortAvailable(port)).toEqual({ available: true, reason: null });
  });
});
