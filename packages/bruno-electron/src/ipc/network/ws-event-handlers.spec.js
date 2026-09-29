jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn(), on: jest.fn() },
  app: {
    on: jest.fn(),
    getPath: jest.fn(() => require('node:os').tmpdir()),
    getVersion: jest.fn(() => '1.0.0')
  }
}));

const fakeWindow = {
  isDestroyed: () => false,
  webContents: { isDestroyed: () => false, send: jest.fn() }
};

describe('ws-event-handlers', () => {
  let app;
  let getWsClient;
  let registerWsEventHandlers;

  beforeEach(() => {
    jest.resetModules();
    ({ app } = require('electron'));
    app.on.mockClear();
    ({ getWsClient, registerWsEventHandlers } = require('./ws-event-handlers'));
  });

  it('returns the instance created at register time, not a require-time snapshot', () => {
    expect(getWsClient()).toBeUndefined();

    registerWsEventHandlers(fakeWindow);

    expect(typeof getWsClient()?.closeForCollection).toBe('function');
  });

  it('clears leftover websocket connections on window-all-closed', () => {
    registerWsEventHandlers(fakeWindow);
    const clearAllConnections = jest.spyOn(getWsClient(), 'clearAllConnections');
    const handler = app.on.mock.calls.find(([event]) => event === 'window-all-closed')?.[1];

    handler();

    expect(clearAllConnections).toHaveBeenCalled();
  });
});
