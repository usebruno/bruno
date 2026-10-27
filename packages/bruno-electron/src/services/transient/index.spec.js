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
    fs.rmSync(mockUserDataPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  });

  it('is shared as one instance', () => {
    expect(transientManager).toBeInstanceOf(TransientManager);
  });

  it('lives under tmp/transient/<pid> in the app data directory', () => {
    expect(manager.getRootDirectory()).toBe(path.join(mockUserDataPath, 'tmp', 'transient'));
    expect(manager.getDirectoryBase()).toBe(path.join(mockUserDataPath, 'tmp', 'transient', String(process.pid)));
  });

  describe('clearStale', () => {
    const deadPid = 2147483646;

    beforeEach(() => {
      const realKill = process.kill;
      jest.spyOn(process, 'kill').mockImplementation((pid, signal) => {
        if (pid === deadPid) {
          throw Object.assign(new Error('kill ESRCH'), { code: 'ESRCH' });
        }
        return realKill.call(process, pid, signal);
      });
    });

    it('removes folders left by processes that are no longer running', async () => {
      const stale = path.join(manager.getRootDirectory(), String(deadPid));
      fs.mkdirSync(path.join(stale, 'bruno-abc123'), { recursive: true });
      fs.writeFileSync(path.join(stale, 'bruno-abc123', 'metadata.json'), '{}');
      fs.mkdirSync(path.join(stale, 'bruno-scratch-def456'), { recursive: true });

      await manager.clearStale();

      expect(fs.existsSync(stale)).toBe(false);
    });

    it('removes a folder left under the current process id by an earlier process', async () => {
      const own = manager.getDirectoryBase();
      fs.mkdirSync(path.join(own, 'bruno-abc123'), { recursive: true });

      await manager.clearStale();

      expect(fs.existsSync(own)).toBe(false);
    });

    it('keeps folders of other running instances', async () => {
      const otherPid = 4242;
      process.kill.mockImplementation((pid) => {
        if (pid === otherPid) return true;
        throw Object.assign(new Error('kill ESRCH'), { code: 'ESRCH' });
      });
      const other = path.join(manager.getRootDirectory(), String(otherPid), 'bruno-abc123');
      fs.mkdirSync(other, { recursive: true });

      await manager.clearStale();

      expect(fs.existsSync(other)).toBe(true);
    });

    it('treats a process it is not permitted to signal as running', async () => {
      const otherPid = 4243;
      process.kill.mockImplementation(() => {
        throw Object.assign(new Error('kill EPERM'), { code: 'EPERM' });
      });
      const other = path.join(manager.getRootDirectory(), String(otherPid));
      fs.mkdirSync(other, { recursive: true });

      await manager.clearStale();

      expect(fs.existsSync(other)).toBe(true);
    });

    it('removes folders from the older layout that are not keyed by process id', async () => {
      const legacy = path.join(manager.getRootDirectory(), 'bruno-abc123');
      fs.mkdirSync(legacy, { recursive: true });

      await manager.clearStale();

      expect(fs.existsSync(legacy)).toBe(false);
    });

    it('leaves the rest of the app data directory alone', async () => {
      fs.mkdirSync(manager.getRootDirectory(), { recursive: true });
      fs.writeFileSync(path.join(mockUserDataPath, 'preferences.json'), '{}');

      await manager.clearStale();

      expect(fs.existsSync(path.join(mockUserDataPath, 'preferences.json'))).toBe(true);
    });

    it('does nothing when there is no transient directory', async () => {
      await expect(manager.clearStale()).resolves.toBeUndefined();
    });

    it('does not stop the app from starting when a folder cannot be removed', async () => {
      fs.mkdirSync(path.join(manager.getRootDirectory(), String(deadPid)), { recursive: true });
      jest.spyOn(fs.promises, 'rm').mockRejectedValue(new Error('EBUSY: resource busy or locked'));
      jest.spyOn(console, 'warn').mockImplementation(() => {});

      await expect(manager.clearStale()).resolves.toBeUndefined();
      expect(console.warn).toHaveBeenCalled();
    });
  });
});
