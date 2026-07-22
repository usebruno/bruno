// Mocks must be declared before requiring the module under test.
const mockHandle = jest.fn();
jest.mock('electron', () => ({
  ipcMain: { handle: (...args) => mockHandle(...args) }
}));

const mockGetSecurityConfig = jest.fn();
jest.mock('../../src/store/collection-security', () =>
  jest.fn().mockImplementation(() => ({
    getSecurityConfigForCollection: (...args) => mockGetSecurityConfig(...args)
  }))
);

const mockRunShellScript = jest.fn();
jest.mock('../../src/utils/collection-scripts', () => ({
  isScriptPathSafe: jest.fn(() => true),
  parseEnvVarsFromOutput: jest.fn(() => ({})),
  runShellScript: (...args) => mockRunShellScript(...args)
}));

const registerCollectionScriptsIpc = require('../../src/ipc/scripts');

describe('renderer:run-collection-script — payload validation', () => {
  let handler;
  let mainWindow;

  beforeEach(() => {
    jest.clearAllMocks();
    mainWindow = {
      isDestroyed: () => false,
      webContents: { send: jest.fn() }
    };
    registerCollectionScriptsIpc(mainWindow);
    // The handler is the second arg to the most recent ipcMain.handle call.
    const call = mockHandle.mock.calls.find((c) => c[0] === 'renderer:run-collection-script');
    handler = call[1];
    mockGetSecurityConfig.mockReturnValue({ jsSandboxMode: 'developer' });
  });

  test('rejects when collectionPath is missing', async () => {
    const result = await handler({}, { collectionUid: 'c1', script: { uid: 's', file: 'run.sh' } });
    expect(result.error).toMatch(/collection path/i);
    expect(mockRunShellScript).not.toHaveBeenCalled();
  });

  test('rejects when collectionPath is not a string', async () => {
    const result = await handler({}, {
      collectionUid: 'c1',
      collectionPath: 123,
      script: { uid: 's', file: 'run.sh' }
    });
    expect(result.error).toMatch(/collection path/i);
    expect(mockRunShellScript).not.toHaveBeenCalled();
  });

  test('rejects when script is missing', async () => {
    const result = await handler({}, { collectionUid: 'c1', collectionPath: '/c' });
    expect(result.error).toMatch(/script/i);
    expect(mockRunShellScript).not.toHaveBeenCalled();
  });

  test('rejects when script.file is missing', async () => {
    const result = await handler({}, {
      collectionUid: 'c1',
      collectionPath: '/c',
      script: { uid: 's' }
    });
    expect(result.error).toMatch(/script\.file|script file/i);
    expect(mockRunShellScript).not.toHaveBeenCalled();
  });

  test('rejects when script.file is not a string', async () => {
    const result = await handler({}, {
      collectionUid: 'c1',
      collectionPath: '/c',
      script: { uid: 's', file: 42 }
    });
    expect(result.error).toMatch(/script\.file|script file/i);
    expect(mockRunShellScript).not.toHaveBeenCalled();
  });

  test('proceeds with a fully-formed payload', async () => {
    mockRunShellScript.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
    const result = await handler({}, {
      collectionUid: 'c1',
      collectionPath: '/c',
      script: { uid: 's', file: 'run.sh' }
    });
    expect(result.exitCode).toBe(0);
    expect(mockRunShellScript).toHaveBeenCalledTimes(1);
  });

  test('blocks execution when sandbox mode is not developer', async () => {
    mockGetSecurityConfig.mockReturnValue({ jsSandboxMode: 'safe' });
    const result = await handler({}, {
      collectionUid: 'c1',
      collectionPath: '/c',
      script: { uid: 's', file: 'run.sh' }
    });
    expect(result.error).toMatch(/developer mode/i);
    expect(mockRunShellScript).not.toHaveBeenCalled();
  });
});
