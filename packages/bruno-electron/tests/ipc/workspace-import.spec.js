const fs = require('fs');
const os = require('os');
const path = require('path');

jest.mock('electron', () => ({ ipcMain: { handle: jest.fn(), on: jest.fn() }, dialog: {} }), { virtual: true });
jest.mock('electron-is-dev', () => false, { virtual: true });
jest.mock('archiver', () => jest.fn(), { virtual: true });
jest.mock('extract-zip', () => jest.fn());
jest.mock('../../src/utils/filesystem', () => ({
  sanitizeName: (name) => name,
  removeGitMetadata: jest.fn().mockResolvedValue(undefined)
}));
jest.mock('../../src/utils/common', () => ({ generateUidBasedOnHash: () => 'test-workspace' }));
jest.mock('../../src/utils/workspace-lock', () => ({}));
jest.mock('../../src/utils/workspace-startup', () => ({}));
jest.mock('../../src/store/last-opened-workspaces', () => jest.fn(() => ({ add: jest.fn() })));
jest.mock('../../src/store/default-workspace', () => ({
  defaultWorkspaceManager: { getDefaultWorkspacePath: () => null }
}));
jest.mock('../../src/store/workspace-environments', () => ({}));
jest.mock('../../src/store/global-environments', () => ({}));

const { ipcMain } = require('electron');
const extractZip = require('extract-zip');
const registerWorkspaceIpc = require('../../src/ipc/workspace');

describe('workspace archive validation before moving files', () => {
  let root;
  let destination;
  let archive;
  let handler;
  let mainWindow;

  beforeEach(() => {
    jest.clearAllMocks();
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-workspace-import-'));
    destination = path.join(root, 'destination');
    fs.mkdirSync(destination);
    archive = path.join(root, 'fixture.zip');
    fs.writeFileSync(archive, 'extraction is mocked; config validation and file moves are real');
    mainWindow = { webContents: { send: jest.fn() } };
    registerWorkspaceIpc(mainWindow);
    handler = ipcMain.handle.mock.calls.find(([name]) => name === 'renderer:import-workspace')[1];
  });

  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  const extractedConfig = (config, wrapped) => {
    extractZip.mockImplementation(async (_archive, { dir }) => {
      const workspace = wrapped ? path.join(dir, 'wrapper') : dir;
      fs.mkdirSync(workspace, { recursive: true });
      fs.writeFileSync(path.join(workspace, 'workspace.yml'), config);
      fs.writeFileSync(path.join(workspace, 'notes.txt'), 'fixture data');
    });
  };

  test.each([false, true])('invalid type leaves no imported files (wrapped=%s)', async (wrapped) => {
    extractedConfig('info:\n  name: Example\n  type: collection\n', wrapped);
    await expect(handler({}, archive, destination)).rejects.toThrow('not a bruno workspace');
    expect(fs.readdirSync(destination)).toEqual([]);
    expect(mainWindow.webContents.send).not.toHaveBeenCalled();
  });

  test('missing name leaves no imported files', async () => {
    extractedConfig('info:\n  type: workspace\n', false);
    await expect(handler({}, archive, destination)).rejects.toThrow('valid name');
    expect(fs.readdirSync(destination)).toEqual([]);
  });

  test.each([false, true])('valid workspace imports successfully (wrapped=%s)', async (wrapped) => {
    extractedConfig('opencollection: 1.0.0\ninfo:\n  name: Example\n  type: workspace\ncollections: []\n', wrapped);
    const result = await handler({}, archive, destination);
    expect(result.success).toBe(true);
    expect(fs.readdirSync(destination)).toEqual(['Example']);
    expect(fs.readFileSync(path.join(result.workspacePath, 'notes.txt'), 'utf8')).toBe('fixture data');
    expect(mainWindow.webContents.send).toHaveBeenCalledWith(
      'main:workspace-opened', result.workspacePath, result.workspaceUid, expect.objectContaining({ name: 'Example' })
    );
  });
});
