jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn(), on: jest.fn() },
  app: {
    on: jest.fn(),
    getPath: jest.fn(() => require('node:os').tmpdir()),
    getVersion: jest.fn(() => '1.0.0')
  }
}));

const { app } = require('electron');
const { getWsClient, registerWsEventHandlers } = require('./ws-event-handlers');

const fakeWindow = {
  isDestroyed: () => false,
  webContents: { isDestroyed: () => false, send: jest.fn() }
};

const lastWindowAllClosedHandler = () => {
  const calls = app.on.mock.calls.filter(([event]) => event === 'window-all-closed');
  return calls.at(-1)?.[1];
};

describe('getWsClient', () => {
  it('returns the instance created at register time, not a require-time snapshot', () => {
    expect(typeof getWsClient).toBe('function');
    expect(getWsClient()).toBeUndefined();

    registerWsEventHandlers(fakeWindow);

    expect(typeof getWsClient()?.closeForCollection).toBe('function');
  });
});

describe('window-all-closed', () => {
  it('clears leftover websocket connections', () => {
    registerWsEventHandlers(fakeWindow);
    const clearAllConnections = jest.spyOn(getWsClient(), 'clearAllConnections');

    lastWindowAllClosedHandler()();

    expect(clearAllConnections).toHaveBeenCalled();
  });
});
