const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const yaml = require('js-yaml');

jest.mock('electron', () => {
  const handlers = {};
  return {
    ipcMain: {
      handle: jest.fn((channel, handler) => {
        handlers[channel] = handler;
      }),
      on: jest.fn(),
      emit: jest.fn(),
      _getHandler: (channel) => handlers[channel]
    },
    dialog: { showOpenDialog: jest.fn() }
  };
});

let mockDefaultWorkspacePath = null;
jest.mock('../store/default-workspace', () => ({
  defaultWorkspaceManager: {
    getDefaultWorkspacePath: () => mockDefaultWorkspacePath,
    getDefaultWorkspaceUid: () => 'default'
  }
}));

let mockOpenedWorkspaces = [];
jest.mock('../store/last-opened-workspaces', () =>
  jest.fn().mockImplementation(() => ({ getAll: () => mockOpenedWorkspaces }))
);

jest.mock('./network/cert-utils', () => ({ getCertsAndProxyConfig: jest.fn() }));
jest.mock('./network/axios-instance', () => ({ makeAxiosInstance: jest.fn() }));
jest.mock('./swagger-fetch', () => ({ proxySwaggerFetch: jest.fn() }));

jest.mock('../utils/workspace-config', () => {
  const actual = jest.requireActual('../utils/workspace-config');
  return { ...actual, removeApiSpecFromWorkspace: jest.fn(actual.removeApiSpecFromWorkspace) };
});

const { ipcMain } = require('electron');
const registerApiSpecIpc = require('./apiSpec');
const { INVALID_EXTENSION_MESSAGE } = require('../app/apiSpecs');
const { removeApiSpecFromWorkspace } = require('../utils/workspace-config');

const writeWorkspaceYml = (workspacePath, specsYaml) => {
  const content = [
    'opencollection: 1.0.0',
    'info:',
    '  name: Test',
    '  type: workspace',
    'collections: []',
    specsYaml,
    'docs: \'\''
  ].join('\n');
  fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), content);
};

const readSpecs = (workspacePath) => yaml.load(fs.readFileSync(path.join(workspacePath, 'workspace.yml'), 'utf8')).specs ?? [];

describe('api spec ipc handlers', () => {
  let tmpDir;
  let workspacePath;
  let mainWindow;
  let watcher;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-apispec-ipc-'));
    workspacePath = path.join(tmpDir, 'workspace');
    fs.mkdirSync(path.join(workspacePath, 'a'), { recursive: true });
    fs.writeFileSync(path.join(workspacePath, 'a', 'openapi.yaml'), 'openapi: 3.0.0\ninfo:\n  title: Orders API\npaths: {}\n');
    writeWorkspaceYml(workspacePath, ['specs:', '  - name: Orders API', '    path: a/openapi.yaml'].join('\n'));

    mockOpenedWorkspaces = [workspacePath];
    mockDefaultWorkspacePath = null;
    removeApiSpecFromWorkspace.mockClear();
    mainWindow = { webContents: { send: jest.fn() } };
    watcher = { hasWatcher: jest.fn(), removeWatcher: jest.fn() };
    registerApiSpecIpc(mainWindow, watcher, []);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  describe('renderer:delete-api-spec', () => {
    const invoke = (...args) => ipcMain._getHandler('renderer:delete-api-spec')({}, ...args);
    let specPath;

    beforeEach(() => {
      specPath = path.join(workspacePath, 'a', 'openapi.yaml');
    });

    test('stops the watcher, deletes the file, removes the workspace entry and broadcasts', async () => {
      await invoke(specPath, workspacePath);

      expect(watcher.removeWatcher).toHaveBeenCalledWith(specPath, mainWindow);
      expect(fs.existsSync(specPath)).toBe(false);
      expect(readSpecs(workspacePath)).toEqual([]);
      expect(mainWindow.webContents.send).toHaveBeenCalledWith(
        'main:workspace-config-updated',
        workspacePath,
        expect.any(String),
        expect.objectContaining({ specs: [] })
      );
    });

    test('still removes the workspace entry when the file is already gone', async () => {
      fs.rmSync(specPath);

      await expect(invoke(specPath, workspacePath)).resolves.toBeUndefined();

      expect(readSpecs(workspacePath)).toEqual([]);
    });

    test('refuses a watched spec that no workspace lists, so a watcher alone is not a licence to delete', async () => {
      watcher.hasWatcher.mockReturnValue(true);

      await expect(invoke(specPath, null)).rejects.toThrow('is not an open workspace');

      expect(fs.existsSync(specPath)).toBe(true);
      expect(watcher.removeWatcher).not.toHaveBeenCalled();
    });

    test('refuses a workspace the user has not opened, even when it lists the spec', async () => {
      mockOpenedWorkspaces = [];

      await expect(invoke(specPath, workspacePath)).rejects.toThrow('is not an open workspace');

      expect(fs.existsSync(specPath)).toBe(true);
    });

    test('refuses a path this workspace does not list, and touches nothing', async () => {
      const strayFile = path.join(workspacePath, 'notes.yaml');
      fs.writeFileSync(strayFile, 'keep me');

      await expect(invoke(strayFile, workspacePath)).rejects.toThrow('is not listed in this workspace');

      expect(fs.readFileSync(strayFile, 'utf8')).toBe('keep me');
      expect(watcher.removeWatcher).not.toHaveBeenCalled();
    });

    test('refuses a file without a spec extension', async () => {
      const secret = path.join(workspacePath, 'id_rsa');
      fs.writeFileSync(secret, 'private');

      await expect(invoke(secret, workspacePath)).rejects.toThrow(INVALID_EXTENSION_MESSAGE);

      expect(fs.existsSync(secret)).toBe(true);
    });

    test('refuses to delete a listed directory and keeps its workspace entry', async () => {
      const dirPath = path.join(workspacePath, 'folder.yaml');
      fs.mkdirSync(dirPath);
      writeWorkspaceYml(workspacePath, [
        'specs:',
        '  - name: openapi',
        '    path: a/openapi.yaml',
        '  - name: folder',
        '    path: folder.yaml'
      ].join('\n'));

      await expect(invoke(dirPath, workspacePath)).rejects.toMatchObject({ code: 'ERR_FS_EISDIR' });

      expect(fs.statSync(dirPath).isDirectory()).toBe(true);
      expect(readSpecs(workspacePath).map((spec) => spec.path)).toEqual(['a/openapi.yaml', 'folder.yaml']);
      expect(watcher.removeWatcher).not.toHaveBeenCalled();
    });

    describe('with three specs listed', () => {
      beforeEach(() => {
        fs.writeFileSync(path.join(workspacePath, 'a', 'first.yaml'), 'openapi: 3.0.0\n');
        fs.writeFileSync(path.join(workspacePath, 'a', 'last.yaml'), 'openapi: 3.0.0\n');
        writeWorkspaceYml(workspacePath, [
          'specs:',
          '  - name: first',
          '    path: a/first.yaml',
          '  - name: Orders API',
          '    path: a/openapi.yaml',
          '  - name: last',
          '    path: a/last.yaml'
        ].join('\n'));
      });

      test('deleting the middle spec keeps the others in order', async () => {
        await invoke(specPath, workspacePath);

        expect(readSpecs(workspacePath)).toEqual([
          { name: 'first', path: 'a/first.yaml' },
          { name: 'last', path: 'a/last.yaml' }
        ]);
      });

      test('leaves the file and the workspace untouched, in order, when the file is in use', async () => {
        const before = fs.readFileSync(path.join(workspacePath, 'workspace.yml'), 'utf8');
        const busy = Object.assign(new Error('EBUSY: resource busy or locked'), { code: 'EBUSY' });
        const rm = jest.spyOn(fs.promises, 'rm').mockRejectedValueOnce(busy);

        await expect(invoke(specPath, workspacePath)).rejects.toThrow('The file is in use by another program. Close it and try again.');

        expect(fs.existsSync(specPath)).toBe(true);
        expect(fs.readFileSync(path.join(workspacePath, 'workspace.yml'), 'utf8')).toBe(before);
        expect(removeApiSpecFromWorkspace).not.toHaveBeenCalled();
        expect(watcher.removeWatcher).not.toHaveBeenCalled();
        expect(mainWindow.webContents.send).not.toHaveBeenCalled();
        rm.mockRestore();
      });

      test('keeps the entry when its removal fails after the file is gone, and a retry completes the delete', async () => {
        removeApiSpecFromWorkspace.mockRejectedValueOnce(new Error('workspace.yml is read-only'));

        await expect(invoke(specPath, workspacePath)).rejects.toThrow('workspace.yml is read-only');

        expect(fs.existsSync(specPath)).toBe(false);
        expect(readSpecs(workspacePath).map((spec) => spec.path)).toEqual(['a/first.yaml', 'a/openapi.yaml', 'a/last.yaml']);

        await invoke(specPath, workspacePath);

        expect(readSpecs(workspacePath).map((spec) => spec.path)).toEqual(['a/first.yaml', 'a/last.yaml']);
      });
    });

    test.each([
      ['EPERM', 'EPERM: operation not permitted'],
      ['EACCES', 'EACCES: permission denied']
    ])('explains the %s permission error', async (code, message) => {
      const denied = Object.assign(new Error(message), { code });
      const rm = jest.spyOn(fs.promises, 'rm').mockRejectedValueOnce(denied);

      await expect(invoke(specPath, workspacePath)).rejects.toThrow('Bruno does not have permission to delete this file.');

      expect(readSpecs(workspacePath)).toHaveLength(1);
      rm.mockRestore();
    });

    test('retries a briefly locked file instead of failing on the first try', async () => {
      const rm = jest.spyOn(fs.promises, 'rm');

      await invoke(specPath, workspacePath);

      expect(rm).toHaveBeenCalledWith(specPath, expect.objectContaining({ force: true, maxRetries: 5, retryDelay: 100 }));
      rm.mockRestore();
    });

    test('deletes from the cleaned-up path that the workspace check approved', async () => {
      const rm = jest.spyOn(fs.promises, 'rm');

      await invoke([workspacePath, 'a', 'b', '..', 'openapi.yaml'].join(path.sep), workspacePath);

      expect(rm).toHaveBeenCalledWith(specPath, expect.anything());
      expect(fs.existsSync(specPath)).toBe(false);
      rm.mockRestore();
    });

    test('deletes a spec listed by the default workspace', async () => {
      mockOpenedWorkspaces = [];
      mockDefaultWorkspacePath = workspacePath;

      await invoke(specPath, workspacePath);

      expect(fs.existsSync(specPath)).toBe(false);
      expect(readSpecs(workspacePath)).toEqual([]);
    });

    test('rejects an empty path', async () => {
      await expect(invoke('', workspacePath)).rejects.toThrow('API spec path is required');
    });
  });
});
