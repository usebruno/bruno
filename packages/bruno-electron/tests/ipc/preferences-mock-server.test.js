jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn(), on: jest.fn(), emit: jest.fn() },
  nativeTheme: {}
}));

const mockPreferencesState = { beta: {} };

jest.mock('../../src/store/preferences', () => ({
  getPreferences: jest.fn(() => mockPreferencesState),
  savePreferences: jest.fn(async (preferences) => {
    mockPreferencesState.beta = { ...preferences.beta };
  })
}));

jest.mock('../../src/app/mock-server/mock-server', () => ({
  isMockServerEnabled: () => Boolean(mockPreferencesState.beta['mock-server']),
  stopAll: jest.fn(() => Promise.resolve())
}));

jest.mock('../../src/utils/git', () => ({ getGitVersion: jest.fn() }));
jest.mock('../../src/store/global-environments', () => ({ globalEnvironmentsStore: {} }));
jest.mock('../../src/store/system-proxy', () => ({ getCachedSystemProxy: jest.fn(), fetchSystemProxy: jest.fn() }));
jest.mock('../../src/utils/default-location', () => ({ resolveDefaultLocation: jest.fn() }));
jest.mock('../../src/app/onboarding', () => jest.fn());
jest.mock('../../src/store/last-opened-collections', () => jest.fn());
jest.mock('../../src/store/window-state', () => jest.fn());
jest.mock('@usebruno/requests', () => ({ clearAgentCache: jest.fn(), clearPacCache: jest.fn() }));

const { ipcMain } = require('electron');
const mockServer = require('../../src/app/mock-server/mock-server');
const { savePreferences } = require('../../src/store/preferences');
const registerPreferencesIpc = require('../../src/ipc/preferences');

const withMockServer = (enabled) => ({ beta: { 'mock-server': enabled } });

const getSavePreferencesHandler = () => {
  registerPreferencesIpc({ webContents: { send: jest.fn() } });
  const [, handler] = ipcMain.handle.mock.calls.find(([channel]) => channel === 'renderer:save-preferences');
  return (preferences) => handler({}, preferences);
};

describe('renderer:save-preferences stopping mock servers', () => {
  let savePreferencesHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    savePreferencesHandler = getSavePreferencesHandler();
  });

  it('stops all mock servers when the mock server beta feature is turned off', async () => {
    mockPreferencesState.beta = { 'mock-server': true };

    await savePreferencesHandler(withMockServer(false));

    expect(savePreferences).toHaveBeenCalledWith(withMockServer(false));
    expect(mockServer.stopAll).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['stays on', true, true],
    ['stays off', false, false],
    ['is turned on', false, true]
  ])('leaves mock servers running when the beta feature %s', async (_label, before, after) => {
    mockPreferencesState.beta = { 'mock-server': before };

    await savePreferencesHandler(withMockServer(after));

    expect(mockServer.stopAll).not.toHaveBeenCalled();
  });

  it('does not stop mock servers when saving preferences fails', async () => {
    mockPreferencesState.beta = { 'mock-server': true };
    savePreferences.mockRejectedValueOnce(new Error('invalid preferences'));

    await expect(savePreferencesHandler(withMockServer(false))).rejects.toThrow('invalid preferences');
    expect(mockServer.stopAll).not.toHaveBeenCalled();
  });
});
