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

jest.mock('../store/default-workspace', () => ({
  defaultWorkspaceManager: {
    getDefaultWorkspacePath: () => null,
    getDefaultWorkspaceUid: () => 'default'
  }
}));

jest.mock('./network/cert-utils', () => ({ getCertsAndProxyConfig: jest.fn() }));
jest.mock('./network/axios-instance', () => ({ makeAxiosInstance: jest.fn() }));
jest.mock('./swagger-fetch', () => ({ proxySwaggerFetch: jest.fn() }));

const { ipcMain } = require('electron');
const registerApiSpecIpc = require('./apiSpec');

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

    mainWindow = { webContents: { send: jest.fn() } };
    watcher = { hasWatcher: jest.fn(), removeWatcher: jest.fn() };
    registerApiSpecIpc(mainWindow, watcher, []);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  describe('renderer:rename-api-spec', () => {
    const invoke = (...args) => ipcMain._getHandler('renderer:rename-api-spec')({}, ...args);

    test('updates the workspace entry name and broadcasts the new config', async () => {
      const specPath = path.join(workspacePath, 'a', 'openapi.yaml');

      await invoke(specPath, 'Renamed API', workspacePath);

      expect(readSpecs(workspacePath)).toEqual([{ name: 'Renamed API', path: 'a/openapi.yaml' }]);
      expect(mainWindow.webContents.send).toHaveBeenCalledWith(
        'main:workspace-config-updated',
        workspacePath,
        expect.any(String),
        expect.objectContaining({ specs: [{ name: 'Renamed API', path: 'a/openapi.yaml' }] })
      );
    });

    test('leaves the spec file untouched', async () => {
      const specPath = path.join(workspacePath, 'a', 'openapi.yaml');
      const before = fs.readFileSync(specPath, 'utf8');

      await invoke(specPath, 'Renamed API', workspacePath);

      expect(fs.existsSync(specPath)).toBe(true);
      expect(fs.readFileSync(specPath, 'utf8')).toBe(before);
    });

    test('rejects an empty name and does not broadcast', async () => {
      const specPath = path.join(workspacePath, 'a', 'openapi.yaml');

      await expect(invoke(specPath, '', workspacePath)).rejects.toThrow('API spec name is required');

      expect(readSpecs(workspacePath)[0].name).toBe('Orders API');
      expect(mainWindow.webContents.send).not.toHaveBeenCalled();
    });

    test('rejects when the workspace path is missing', async () => {
      await expect(invoke(path.join(workspacePath, 'a', 'openapi.yaml'), 'X', null)).rejects.toThrow('Workspace path is required');
    });
  });

  describe('renderer:clone-api-spec', () => {
    const invoke = (...args) => ipcMain._getHandler('renderer:clone-api-spec')({}, ...args);
    let sourcePath;
    let targetDir;

    beforeEach(() => {
      sourcePath = path.join(workspacePath, 'a', 'openapi.yaml');
      targetDir = path.join(workspacePath, 'apispec');
      fs.mkdirSync(targetDir);
    });

    test('copies the file with the source extension and adds a workspace entry with the typed name', async () => {
      const targetPath = await invoke(sourcePath, 'Orders API copy', targetDir, workspacePath);

      expect(targetPath).toBe(path.join(targetDir, 'Orders API copy.yaml'));
      expect(fs.readFileSync(targetPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
      expect(readSpecs(workspacePath)).toEqual([
        { name: 'Orders API', path: 'a/openapi.yaml' },
        { name: 'Orders API copy', path: 'apispec/Orders API copy.yaml' }
      ]);
      expect(mainWindow.webContents.send).toHaveBeenCalledWith(
        'main:workspace-config-updated',
        workspacePath,
        expect.any(String),
        expect.objectContaining({ specs: expect.arrayContaining([expect.objectContaining({ name: 'Orders API copy' })]) })
      );
      expect(ipcMain.emit).toHaveBeenCalledWith('main:apispec-opened', mainWindow, targetPath, expect.any(String), workspacePath);
    });

    test('rejects when the target file already exists and writes nothing', async () => {
      fs.writeFileSync(path.join(targetDir, 'Orders API copy.yaml'), 'existing');

      await expect(invoke(sourcePath, 'Orders API copy', targetDir, workspacePath)).rejects.toThrow('already exists');

      expect(fs.readFileSync(path.join(targetDir, 'Orders API copy.yaml'), 'utf8')).toBe('existing');
      expect(readSpecs(workspacePath)).toHaveLength(1);
    });

    test('rejects a name that is not a valid filename', async () => {
      await expect(invoke(sourcePath, '   ', targetDir, workspacePath)).rejects.toThrow();

      expect(fs.readdirSync(targetDir)).toEqual([]);
      expect(readSpecs(workspacePath)).toHaveLength(1);
    });

    test('refuses to copy a file that is not a known spec', async () => {
      const secret = path.join(workspacePath, 'a', 'secret.yaml');
      fs.writeFileSync(secret, 'token: abc');

      await expect(invoke(secret, 'Leaked', targetDir, workspacePath)).rejects.toThrow('not open in this workspace');

      expect(fs.readdirSync(targetDir)).toEqual([]);
      expect(readSpecs(workspacePath)).toHaveLength(1);
    });

    test('rejects a target location that is not a directory', async () => {
      await expect(invoke(sourcePath, 'X', path.join(workspacePath, 'nope'), workspacePath)).rejects.toThrow('not an existing directory');

      expect(readSpecs(workspacePath)).toHaveLength(1);
    });

    test('clones a watched spec without a workspace entry when no workspace path is given', async () => {
      watcher.hasWatcher.mockReturnValue(true);
      const targetPath = await invoke(sourcePath, 'Loose copy', targetDir, null);

      expect(fs.existsSync(targetPath)).toBe(true);
      expect(readSpecs(workspacePath)).toHaveLength(1);
      expect(mainWindow.webContents.send).not.toHaveBeenCalledWith('main:workspace-config-updated', expect.anything(), expect.anything(), expect.anything());
    });
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

    test('deletes a watched spec that has no workspace entry', async () => {
      watcher.hasWatcher.mockReturnValue(true);

      await invoke(specPath, null);

      expect(fs.existsSync(specPath)).toBe(false);
      expect(readSpecs(workspacePath)).toHaveLength(1);
      expect(mainWindow.webContents.send).not.toHaveBeenCalled();
    });

    test('refuses a path that is neither a workspace spec nor watched, and touches nothing', async () => {
      const strayFile = path.join(workspacePath, 'notes.yaml');
      fs.writeFileSync(strayFile, 'keep me');

      await expect(invoke(strayFile, workspacePath)).rejects.toThrow('not open in this workspace');

      expect(fs.readFileSync(strayFile, 'utf8')).toBe('keep me');
      expect(watcher.removeWatcher).not.toHaveBeenCalled();
    });

    test('refuses a file without a spec extension', async () => {
      const secret = path.join(workspacePath, 'id_rsa');
      fs.writeFileSync(secret, 'private');

      await expect(invoke(secret, workspacePath)).rejects.toThrow();

      expect(fs.existsSync(secret)).toBe(true);
    });

    test('refuses to delete a directory and leaves the workspace untouched', async () => {
      const dirPath = path.join(workspacePath, 'a');

      await expect(invoke(dirPath, workspacePath)).rejects.toThrow();

      expect(fs.existsSync(specPath)).toBe(true);
      expect(readSpecs(workspacePath)).toHaveLength(1);
    });

    test('rejects an empty path', async () => {
      await expect(invoke('', workspacePath)).rejects.toThrow('API spec path is required');
    });
  });
});
