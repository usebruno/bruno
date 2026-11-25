const mockHandlers = {};

jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn((channel, handler) => {
      mockHandlers[channel] = handler;
    }),
    on: jest.fn()
  },
  app: { on: jest.fn(), getVersion: jest.fn(() => '0.0.0'), getPath: jest.fn(() => require('os').tmpdir()) },
  BrowserWindow: { getAllWindows: jest.fn(() => []) }
}));

jest.mock('electron-store', () => {
  return jest.fn().mockImplementation((opts = {}) => {
    const data = { ...(opts.defaults || {}) };
    return {
      get: (key, fallback) => (key in data ? data[key] : fallback),
      set: (key, value) => {
        data[key] = value;
      }
    };
  });
});

const registerNetworkIpc = require('../../src/ipc/network/index');

const makeRequest = (uid, name, seq, script) => ({
  uid,
  name,
  seq,
  type: 'http-request',
  request: {
    method: 'GET',
    url: 'http://localhost:1/never-called',
    headers: [],
    params: [],
    body: { mode: 'none' },
    auth: { mode: 'none' },
    script: { req: script }
  }
});

describe('renderer:run-collection-folder - bru.runner.stopExecution()', () => {
  it('stops the run when the pre-request script calls stopExecution() and then throws', async () => {
    const mainWindow = { webContents: { send: jest.fn() } };
    registerNetworkIpc(mainWindow);

    const collection = {
      uid: 'collection-uid',
      pathname: '/tmp/stop-execution-collection',
      brunoConfig: { scripts: {} },
      root: {},
      items: [
        makeRequest('req-1', 'Validate input', 1, `bru.runner.stopExecution();\nthrow new Error('Invalid input');`),
        makeRequest('req-2', 'Follow-up', 2, `throw new Error('Follow-up pre-request script ran');`)
      ]
    };

    await mockHandlers['renderer:run-collection-folder']({}, null, collection, { name: 'Test', variables: [] }, {}, false, 0);

    const events = mainWindow.webContents.send.mock.calls
      .filter(([channel]) => channel === 'main:run-folder-event')
      .map(([, payload]) => payload);

    const errors = events.filter((e) => e.type === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ itemUid: 'req-1', error: 'Invalid input' });
    expect(events.some((e) => e.itemUid === 'req-2')).toBe(false);
    expect(events[events.length - 1]).toMatchObject({
      type: 'testrun-ended',
      statusText: 'collection run was terminated!'
    });
  });
});
