const fsPromises = require('node:fs/promises');
const { isRealFolder, isRealFile } = require('./entry-kind');

const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');

const entryOfType = (type) => ({
  isDirectory: () => type === 'folder',
  isFile: () => type === 'file',
  isSymbolicLink: () => type === 'link'
});

const statsOfType = (type) => ({
  isDirectory: () => type === 'folder',
  isFile: () => type === 'file'
});

describe('entry kinds', () => {
  let lstat;

  beforeEach(() => {
    lstat = jest.spyOn(fsPromises, 'lstat');
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', originalPlatform);
    lstat.mockRestore();
  });

  const onWindows = () => Object.defineProperty(process, 'platform', { value: 'win32' });

  it('takes a plain folder or file at face value', async () => {
    onWindows();

    expect(await isRealFolder(entryOfType('folder'), 'C:\\work\\api')).toBe(true);
    expect(await isRealFile(entryOfType('file'), 'C:\\work\\api.json')).toBe(true);
    expect(lstat).not.toHaveBeenCalled();
  });

  it('never follows a link outside Windows', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });

    expect(await isRealFolder(entryOfType('link'), '/work/link')).toBe(false);
    expect(await isRealFile(entryOfType('link'), '/work/link')).toBe(false);
    expect(lstat).not.toHaveBeenCalled();
  });

  it('recognises OneDrive placeholders that Windows lists as links', async () => {
    onWindows();
    lstat.mockResolvedValueOnce(statsOfType('folder')).mockResolvedValueOnce(statsOfType('file'));

    expect(await isRealFolder(entryOfType('link'), 'C:\\OneDrive\\api')).toBe(true);
    expect(await isRealFile(entryOfType('link'), 'C:\\OneDrive\\openapi.yaml')).toBe(true);
  });

  it('leaves real Windows links and junctions out', async () => {
    onWindows();
    lstat.mockResolvedValue(statsOfType('link'));

    expect(await isRealFolder(entryOfType('link'), 'C:\\work\\junction')).toBe(false);
    expect(await isRealFile(entryOfType('link'), 'C:\\work\\link')).toBe(false);
  });

  it('treats an entry that cannot be checked as neither', async () => {
    onWindows();
    lstat.mockRejectedValue(Object.assign(new Error('gone'), { code: 'ENOENT' }));

    expect(await isRealFolder(entryOfType('link'), 'C:\\work\\gone')).toBe(false);
    expect(await isRealFile(entryOfType('link'), 'C:\\work\\gone')).toBe(false);
  });
});
