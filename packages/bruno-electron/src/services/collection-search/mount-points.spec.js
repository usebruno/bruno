jest.mock('node:child_process', () => ({ execFile: jest.fn() }));
jest.mock('node:fs/promises', () => ({ readFile: jest.fn() }));

const { execFile } = require('node:child_process');
const { readFile } = require('node:fs/promises');

const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');

const loadOnPlatform = (platform) => {
  Object.defineProperty(process, 'platform', { value: platform });
  let mountPoints;
  jest.isolateModules(() => {
    mountPoints = require('./mount-points');
  });
  return mountPoints;
};

describe('getSkippedMountPoints', () => {
  afterEach(() => {
    Object.defineProperty(process, 'platform', originalPlatform);
    jest.clearAllMocks();
  });

  it('skips network, FUSE, removable and hidden system volumes on macOS', async () => {
    const { getSkippedMountPoints } = loadOnPlatform('darwin');
    execFile.mockImplementation((command, args, options, callback) => callback(null, [
      '/dev/disk3s1s1 on / (apfs, sealed, local, read-only, journaled)',
      '/dev/disk3s5 on /System/Volumes/Data (apfs, local, journaled, nobrowse, protect, root data)',
      '/dev/disk5s1 on /Users/me/work (apfs, local, journaled)',
      '//user@server/share on /Volumes/share (smbfs, nodev, nosuid, mounted by user)',
      '/dev/disk4s1 on /Volumes/USB Drive (msdos, local, nodev, nosuid, noowners)',
      '/dev/disk6s1 on /Volumes/Backup (1) (apfs, local, nodev, nosuid, journaled, noowners)',
      'sshfs@remote on /Users/me/remote (macfuse, nodev, nosuid, synchronous)'
    ].join('\n')));

    const skipped = await getSkippedMountPoints();

    expect([...skipped].sort()).toEqual([
      '/System/Volumes/Data',
      '/Users/me/remote',
      '/Volumes/Backup (1)',
      '/Volumes/USB Drive',
      '/Volumes/share'
    ]);
    expect(execFile).toHaveBeenCalledWith('mount', [], { timeout: 3000 }, expect.any(Function));
  });

  it('skips nothing on macOS when the mount table cannot be read', async () => {
    const { getSkippedMountPoints } = loadOnPlatform('darwin');
    execFile.mockImplementation((command, args, options, callback) => callback(new Error('timed out')));

    expect(await getSkippedMountPoints()).toEqual(new Set());
  });

  it('skips network, FUSE and removable volumes on Linux', async () => {
    const { getSkippedMountPoints } = loadOnPlatform('linux');
    readFile.mockResolvedValue([
      '/dev/nvme0n1p2 / ext4 rw,relatime 0 0',
      'server:/export /home/me/nfs nfs4 rw 0 0',
      '/dev/sdb1 /media/me/USB\\040Drive vfat rw 0 0',
      'me@remote: /home/me/remote fuse.sshfs rw 0 0',
      'systemd-1 /home/me/nas autofs rw,relatime,direct 0 0',
      'server:/backup /home/me/back\\134slash nfs rw 0 0',
      '/dev/sdc1 /data ext4 rw 0 0'
    ].join('\n'));

    const skipped = await getSkippedMountPoints();

    expect([...skipped].sort()).toEqual([
      '/home/me/back\\slash',
      '/home/me/nas',
      '/home/me/nfs',
      '/home/me/remote',
      '/media/me/USB Drive'
    ]);
  });

  it('skips nothing on Linux when the mount table cannot be read', async () => {
    const { getSkippedMountPoints } = loadOnPlatform('linux');
    readFile.mockRejectedValue(new Error('EACCES'));

    expect(await getSkippedMountPoints()).toEqual(new Set());
  });

  it('skips nothing on Windows', async () => {
    const { getSkippedMountPoints } = loadOnPlatform('win32');

    expect(await getSkippedMountPoints()).toEqual(new Set());
    expect(execFile).not.toHaveBeenCalled();
    expect(readFile).not.toHaveBeenCalled();
  });
});
