const path = require('path');
const fs = require('fs');
const os = require('os');

jest.mock('electron', () => ({
  dialog: {
    showOpenDialog: jest.fn()
  }
}));

const { dialog } = require('electron');
const { browseDirectories } = require('../../filesystem');

describe('browseDirectories', () => {
  let tempDir;
  let dirA;
  let dirB;
  let filePath;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-browse-dirs-'));
    dirA = path.join(tempDir, 'collection-a');
    dirB = path.join(tempDir, 'collection-b');
    filePath = path.join(tempDir, 'note.txt');
    fs.mkdirSync(dirA);
    fs.mkdirSync(dirB);
    fs.writeFileSync(filePath, 'hello');
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    dialog.showOpenDialog.mockReset();
  });

  it('returns an empty array when the picker is cancelled', async () => {
    dialog.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });
    await expect(browseDirectories()).resolves.toEqual([]);
  });

  it('returns an empty array when no filePaths are provided', async () => {
    dialog.showOpenDialog.mockResolvedValue({});
    await expect(browseDirectories()).resolves.toEqual([]);
  });

  it('returns the selected directories as absolute paths', async () => {
    dialog.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [dirA, dirB] });
    const result = await browseDirectories();
    expect(result).toEqual([dirA, dirB]);
    result.forEach((p) => expect(path.isAbsolute(p)).toBe(true));
  });

  it('filters out entries that are not directories or non-existent paths', async () => {
    const missing = path.join(tempDir, 'does-not-exist');
    dialog.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [dirA, filePath, missing] });
    await expect(browseDirectories()).resolves.toEqual([dirA]);
  });

  it('opens a multi selection directory picker on the given window', async () => {
    dialog.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [dirA] });
    await browseDirectories('main-window');
    expect(dialog.showOpenDialog).toHaveBeenCalledWith('main-window', {
      properties: ['openDirectory', 'createDirectory', 'multiSelections']
    });
  });
});
