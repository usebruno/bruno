const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

let mockUserDataPath;

jest.mock('electron', () => ({
  app: { getPath: () => mockUserDataPath }
}));

const { TransientManager, transientManager } = require('./index');

describe('TransientManager', () => {
  let manager;

  beforeEach(() => {
    manager = new TransientManager();
    mockUserDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-user-data-'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(mockUserDataPath, { recursive: true, force: true });
  });

  it('is shared as one instance', () => {
    expect(transientManager).toBeInstanceOf(TransientManager);
  });

  it('lives under tmp/transient in the app data directory', () => {
    expect(manager.getDirectoryBase()).toBe(path.join(mockUserDataPath, 'tmp', 'transient'));
  });

  it('removes the transient request and scratch folders left by earlier sessions', () => {
    const base = manager.getDirectoryBase();
    fs.mkdirSync(path.join(base, 'bruno-abc123'), { recursive: true });
    fs.writeFileSync(path.join(base, 'bruno-abc123', 'metadata.json'), '{}');
    fs.mkdirSync(path.join(base, 'bruno-scratch-def456'), { recursive: true });

    manager.clear();

    expect(fs.existsSync(base)).toBe(false);
  });

  it('leaves the rest of the app data directory alone', () => {
    fs.mkdirSync(manager.getDirectoryBase(), { recursive: true });
    fs.writeFileSync(path.join(mockUserDataPath, 'preferences.json'), '{}');

    manager.clear();

    expect(fs.existsSync(path.join(mockUserDataPath, 'preferences.json'))).toBe(true);
  });

  it('does nothing when there is no transient directory', () => {
    expect(() => manager.clear()).not.toThrow();
  });

  it('does not stop the app from starting when the directory cannot be removed', () => {
    jest.spyOn(fs, 'rmSync').mockImplementation(() => {
      throw new Error('EBUSY: resource busy or locked');
    });
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => manager.clear()).not.toThrow();
    expect(console.warn).toHaveBeenCalled();
  });
});
