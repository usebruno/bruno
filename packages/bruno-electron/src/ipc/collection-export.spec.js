const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { dialog } = require('electron');
const { exportCollectionYaml } = require('./collection-export');

jest.mock('electron', () => ({
  dialog: {
    showSaveDialog: jest.fn()
  }
}));

describe('exportCollectionYaml', () => {
  const mainWindow = {};
  let exportDir;

  beforeEach(() => {
    jest.clearAllMocks();
    exportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-export-yaml-'));
  });

  afterEach(() => {
    fs.rmSync(exportDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  it('writes the content to the path chosen in the save dialog', async () => {
    const filePath = path.join(exportDir, 'My API.yml');
    dialog.showSaveDialog.mockResolvedValue({ filePath, canceled: false });

    const result = await exportCollectionYaml(mainWindow, 'My API', 'opencollection: 1.0.0\n');

    expect(dialog.showSaveDialog).toHaveBeenCalledWith(mainWindow, expect.objectContaining({ defaultPath: 'My API.yml' }));
    expect(result).toEqual({ success: true, filePath });
    expect(fs.readFileSync(filePath, 'utf8')).toBe('opencollection: 1.0.0\n');
  });

  it('reports a cancel without writing when the save dialog is dismissed', async () => {
    dialog.showSaveDialog.mockResolvedValue({ filePath: '', canceled: true });

    const result = await exportCollectionYaml(mainWindow, 'My API', 'opencollection: 1.0.0\n');

    expect(result).toEqual({ success: false, canceled: true });
    expect(fs.readdirSync(exportDir)).toEqual([]);
  });

  it('rejects non-string content before opening the save dialog', async () => {
    await expect(exportCollectionYaml(mainWindow, 'My API', { opencollection: '1.0.0' })).rejects.toThrow('Export content must be a string');
    expect(dialog.showSaveDialog).not.toHaveBeenCalled();
  });
});
