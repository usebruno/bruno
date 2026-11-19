jest.mock('node:child_process', () => ({ execFile: jest.fn() }));
jest.mock('node:fs/promises', () => ({ readFile: jest.fn(), realpath: jest.fn() }));

const { execFile } = require('node:child_process');
const { readFile, realpath } = require('node:fs/promises');

const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');

const loadOnPlatform = (platform) => {
  Object.defineProperty(process, 'platform', { value: platform });
  let mountPoints;
  jest.isolateModules(() => {
    mountPoints = require('./mount-points');
  });
  return mountPoints;
};

const answerCommand = (output) => execFile.mockImplementation((command, args, options, callback) => callback(null, output));

const failCommand = () => execFile.mockImplementation((command, args, options, callback) => callback(new Error('timed out')));

const kindsOf = (mounts) => mounts.map(({ path, kind }) => [path, kind]);

const MAC_MOUNTS = [
  '/dev/disk3s1s1 on / (apfs, sealed, local, read-only, journaled)',
  '/dev/disk3s5 on /System/Volumes/Data (apfs, local, journaled, nobrowse, protect, root data)',
  '/dev/disk5s1 on /Users/me/work (apfs, local, journaled)',
  '//user@server/share on /Volumes/share (smbfs, nodev, nosuid, mounted by user)',
  '/dev/disk4s1 on /Volumes/USB Drive (msdos, local, nodev, nosuid, noowners)',
  '/dev/disk6s1 on /Volumes/Backup (1) (apfs, local, nodev, nosuid, journaled, noowners)',
  'sshfs@remote on /Users/me/remote (macfuse, nodev, nosuid, synchronous)'
].join('\n');

const LINUX_MOUNT_INFO = [
  '26 1 259:2 / / rw,relatime shared:1 - ext4 /dev/nvme0n1p2 rw,errors=remount-ro',
  '40 26 0:45 / /home/me/nfs rw,relatime shared:20 - nfs4 server:/export rw,vers=4.2',
  '41 26 8:17 / /media/me/USB\\040Drive rw,nosuid,nodev,relatime shared:21 - vfat /dev/sdb1 rw,fmask=0022',
  '42 26 0:46 / /home/me/remote rw,nosuid,nodev,relatime shared:22 - fuse.sshfs me@remote: rw,user_id=1000',
  '43 26 0:47 / /home/me/nas rw,relatime shared:23 - autofs systemd-1 rw,fd=50,direct',
  '44 26 0:48 / /home/me/back\\134slash rw,relatime shared:24 - nfs server:/backup rw',
  '45 26 8:33 / /data rw,relatime shared:25 - ext4 /dev/sdc1 rw'
].join('\n');

const WINDOWS_DRIVES = [
  'C:|3|NTFS|Windows',
  'D:|3|ReFS|Data',
  'E:|2|FAT32|USB STICK',
  'F:|5|CDFS|DVD',
  'G:|3|FAT32|Google Drive',
  'H:|3|FUSE-rclone|remote',
  'I:|2||',
  'R:|6|NTFS|RAM disk',
  'S:|3|NTFS|Windows',
  'Z:|4|NTFS|share',
  'A:|2|FAT|',
  'S:\\: => C:\\Users\\me\\code'
].join('\r\n');

describe('mount points', () => {
  afterEach(() => {
    Object.defineProperty(process, 'platform', originalPlatform);
    jest.clearAllMocks();
  });

  describe('getSkippedMountPoints', () => {
    it('skips network, FUSE, removable and hidden system volumes on macOS', async () => {
      const { getSkippedMountPoints } = loadOnPlatform('darwin');
      answerCommand(MAC_MOUNTS);

      const skipped = await getSkippedMountPoints();

      expect([...skipped].sort()).toEqual([
        '/System/Volumes/Data',
        '/Users/me/remote',
        '/Volumes/Backup (1)',
        '/Volumes/USB Drive',
        '/Volumes/share'
      ]);
      expect(execFile).toHaveBeenCalledWith('/sbin/mount', [], { timeout: 3000, windowsHide: true }, expect.any(Function));
    });

    it('skips nothing on macOS when the mount table cannot be read', async () => {
      const { getSkippedMountPoints } = loadOnPlatform('darwin');
      failCommand();

      expect(await getSkippedMountPoints()).toEqual(new Set());
    });

    it('skips network, FUSE and removable volumes on Linux', async () => {
      const { getSkippedMountPoints } = loadOnPlatform('linux');
      readFile.mockResolvedValue(LINUX_MOUNT_INFO);

      const skipped = await getSkippedMountPoints();

      expect([...skipped].sort()).toEqual([
        '/home/me/back\\slash',
        '/home/me/nas',
        '/home/me/nfs',
        '/home/me/remote',
        '/media/me/USB Drive'
      ]);
      expect(readFile).toHaveBeenCalledWith('/proc/self/mountinfo', 'utf8');
    });

    it('skips nothing on Linux when the mount table cannot be read', async () => {
      const { getSkippedMountPoints } = loadOnPlatform('linux');
      readFile.mockRejectedValue(new Error('EACCES'));

      expect(await getSkippedMountPoints()).toEqual(new Set());
    });

    it('skips nothing on Windows, and lists no drives to find that out', async () => {
      const { getSkippedMountPoints } = loadOnPlatform('win32');

      expect(await getSkippedMountPoints()).toEqual(new Set());
      expect(execFile).not.toHaveBeenCalled();
      expect(readFile).not.toHaveBeenCalled();
    });
  });

  describe('readMountTable', () => {
    const { readMountTable } = require('./mount-points');

    it('reads the macOS mount table by absolute path and sorts each mount into local, removable, network or system', async () => {
      answerCommand([
        MAC_MOUNTS,
        'devfs on /dev (devfs, local)',
        '/dev/disk3s6 on /System/Volumes/VM (apfs, local, noexec, journaled, noatime)',
        'map auto_home on /System/Volumes/Data/home (autofs, automounted, nobrowse)',
        'remote:/export on /Users/me/mounted (lifs, nodev, nosuid)',
        'fuse-t:/sshfs on /Users/me/fuse (macfuse, local, nodev, nosuid)',
        '/dev/disk7s1 on /private/var/folders/x/T/installer (hfs, local, nodev, nosuid, nobrowse)',
        '/dev/disk8s1 on /Volumes/Automounted (apfs, local, automounted)'
      ].join('\n'));

      const mounts = await readMountTable({ platform: 'darwin' });

      expect(kindsOf(mounts)).toEqual([
        ['/', 'local'],
        ['/System/Volumes/Data', 'system'],
        ['/Users/me/work', 'local'],
        ['/Volumes/share', 'network'],
        ['/Volumes/USB Drive', 'removable'],
        ['/Volumes/Backup (1)', 'removable'],
        ['/Users/me/remote', 'network'],
        ['/dev', 'system'],
        ['/System/Volumes/VM', 'system'],
        ['/System/Volumes/Data/home', 'network'],
        ['/Users/me/mounted', 'network'],
        ['/Users/me/fuse', 'network'],
        ['/private/var/folders/x/T/installer', 'system'],
        ['/Volumes/Automounted', 'system']
      ]);
      expect(mounts[5]).toEqual({
        path: '/Volumes/Backup (1)',
        device: '/dev/disk6s1',
        fileSystem: 'apfs',
        root: '/',
        options: ['local', 'nodev', 'nosuid', 'journaled', 'noowners'],
        kind: 'removable'
      });
      expect(execFile).toHaveBeenCalledWith('/sbin/mount', [], { timeout: 3000, windowsHide: true }, expect.any(Function));
    });

    it('lists no mounts on macOS when the mount table cannot be read', async () => {
      failCommand();

      expect(await readMountTable({ platform: 'darwin' })).toEqual([]);
    });

    it('sorts each Linux mount into local, removable, network, cloud or system by its file system, with a tmpfs at /tmp or /var/tmp local and a disk at /mnt removable', async () => {
      readFile.mockResolvedValue([
        LINUX_MOUNT_INFO,
        '27 26 0:5 / /dev rw,nosuid shared:2 - devtmpfs devtmpfs rw,size=8000k',
        '28 26 0:24 / /proc rw,nosuid,nodev,noexec,relatime shared:12 - proc proc rw',
        '29 26 0:25 / /run rw,nosuid,nodev shared:5 - tmpfs tmpfs rw,mode=755',
        '30 26 7:1 / /snap/core22/1234 ro,nodev,relatime shared:30 - squashfs /dev/loop1 ro',
        '31 26 0:40 / /var/lib/docker/overlay2/abc/merged rw,relatime - overlay overlay rw,lowerdir=/x',
        '32 26 0:41 / /sys/fs/fuse/connections rw,relatime - fusectl fusectl rw',
        '50 26 0:50 / /home/me/ceph rw - ceph 10.0.0.1:/ rw',
        '51 26 0:51 / /home/me/smb rw - smbfs //server/share rw',
        '52 26 0:52 / /home/me/gdrive rw,nosuid,nodev - fuse.rclone gdrive: rw,user_id=1000',
        '53 26 0:53 / /run/user/1000/doc rw,nosuid,nodev - fuse.portal portal rw',
        '54 26 8:49 / /run/media/me/Backup rw - exfat /dev/sdd1 rw',
        '55 26 8:65 / /mnt/disk rw - xfs /dev/sde1 rw',
        '56 26 8:81 / /windows rw - fuseblk /dev/sdf1 rw,user_id=0',
        '57 26 0:54 / /home/me/Private rw - fuse.gocryptfs /home/me/.private rw',
        '59 26 0:56 / /tmp rw,nosuid,nodev shared:6 - tmpfs tmpfs rw',
        '60 26 0:57 / /var/tmp rw,nosuid,nodev - tmpfs tmpfs rw',
        '61 26 0:58 / /dev/shm rw,nosuid,nodev - tmpfs tmpfs rw',
        '62 26 8:113 / /mnt rw - ext4 /dev/sdh1 rw',
        'not a mount line',
        '58 26 0:55 / - ext4'
      ].join('\n'));

      const mounts = await readMountTable({ platform: 'linux' });

      expect(kindsOf(mounts)).toEqual([
        ['/', 'local'],
        ['/home/me/nfs', 'network'],
        ['/media/me/USB Drive', 'removable'],
        ['/home/me/remote', 'network'],
        ['/home/me/nas', 'network'],
        ['/home/me/back\\slash', 'network'],
        ['/data', 'local'],
        ['/dev', 'system'],
        ['/proc', 'system'],
        ['/run', 'system'],
        ['/snap/core22/1234', 'system'],
        ['/var/lib/docker/overlay2/abc/merged', 'system'],
        ['/sys/fs/fuse/connections', 'system'],
        ['/home/me/ceph', 'network'],
        ['/home/me/smb', 'network'],
        ['/home/me/gdrive', 'cloud'],
        ['/run/user/1000/doc', 'network'],
        ['/run/media/me/Backup', 'removable'],
        ['/mnt/disk', 'removable'],
        ['/windows', 'local'],
        ['/home/me/Private', 'local'],
        ['/tmp', 'local'],
        ['/var/tmp', 'local'],
        ['/dev/shm', 'system'],
        ['/mnt', 'removable']
      ]);
      expect(mounts[2]).toEqual({
        path: '/media/me/USB Drive',
        device: '8:17',
        fileSystem: 'vfat',
        root: '/',
        options: ['rw', 'nosuid', 'nodev', 'relatime'],
        kind: 'removable'
      });
    });

    it('keeps btrfs subvolumes local, because their roots are side by side', async () => {
      readFile.mockResolvedValue([
        '63 1 0:33 /root / rw,relatime shared:1 - btrfs /dev/nvme0n1p3 rw,compress=zstd:1,subvol=/root',
        '96 63 0:33 /home /home rw,relatime shared:50 - btrfs /dev/nvme0n1p3 rw,compress=zstd:1,subvol=/home',
        '30 1 0:27 /@ /srv rw - btrfs /dev/sda2 rw,subvol=/@',
        '31 30 0:27 /@home /srv/home rw - btrfs /dev/sda2 rw,subvol=/@home'
      ].join('\n'));

      expect(kindsOf(await readMountTable({ platform: 'linux' }))).toEqual([
        ['/', 'local'],
        ['/home', 'local'],
        ['/srv', 'local'],
        ['/srv/home', 'local']
      ]);
    });

    it('marks a mount as a duplicate when a wider mount of the same disk shows the same folder at a path no longer than its own', async () => {
      readFile.mockResolvedValue([
        '26 1 259:2 / / rw - ext4 /dev/nvme0n1p2 rw',
        '60 26 8:49 /projects /home/me/projects rw - ext4 /dev/sdd1 rw',
        '61 26 8:49 /my\\040files /home/me/files rw - ext4 /dev/sdd1 rw',
        '62 26 8:49 / /home/me/disk rw - ext4 /dev/sdd1 rw',
        '47 26 8:49 / /mnt/data rw - ext4 /dev/sdd1 rw',
        '63 26 8:65 /projects /home/me/other-disk rw - ext4 /dev/sde1 rw',
        '70 26 8:81 / /data2 rw - ext4 /dev/sdf1 rw',
        '71 70 8:81 / /data2 rw - ext4 /dev/sdf1 rw',
        '72 26 0:60 / /home/me/nfs rw - nfs4 server:/export rw',
        '73 26 0:60 / /home/me/nfs-again rw - nfs4 server:/export rw'
      ].join('\n'));

      const mounts = await readMountTable({ platform: 'linux' });

      expect(kindsOf(mounts)).toEqual([
        ['/', 'local'],
        ['/home/me/projects', 'local'],
        ['/home/me/files', 'local'],
        ['/home/me/disk', 'duplicate'],
        ['/mnt/data', 'removable'],
        ['/home/me/other-disk', 'local'],
        ['/data2', 'local'],
        ['/data2', 'local'],
        ['/home/me/nfs', 'network'],
        ['/home/me/nfs-again', 'network']
      ]);
      expect(mounts[2].root).toBe('/my files');
    });

    it('keeps a bind mount whose path is shorter than where the wider mount of the same disk shows that folder', async () => {
      readFile.mockResolvedValue([
        '26 1 259:2 / / rw - ext4 /dev/nvme0n1p2 rw',
        '40 26 8:49 / /mnt/storage rw - ext4 /dev/sdd1 rw',
        '41 26 8:49 /home /home rw - ext4 /dev/sdd1 rw',
        '42 26 8:49 /home/me/www /var/www rw - ext4 /dev/sdd1 rw'
      ].join('\n'));

      expect(kindsOf(await readMountTable({ platform: 'linux' }))).toEqual([
        ['/', 'local'],
        ['/mnt/storage', 'removable'],
        ['/home', 'local'],
        ['/var/www', 'local']
      ]);
    });

    it('lists no mounts on Linux when the mount table cannot be read', async () => {
      readFile.mockRejectedValue(new Error('EACCES'));

      expect(await readMountTable({ platform: 'linux' })).toEqual([]);
    });

    it('lists the Windows drives from one time-boxed PowerShell call and sorts each by drive type, file system and SUBST', async () => {
      answerCommand(WINDOWS_DRIVES);

      const mounts = await readMountTable({ platform: 'win32', env: { SystemDrive: 'C:', SystemRoot: 'D:\\WINDOWS' } });

      expect(kindsOf(mounts)).toEqual([
        ['C:\\', 'local'],
        ['D:\\', 'local'],
        ['E:\\', 'removable'],
        ['F:\\', 'system'],
        ['G:\\', 'cloud'],
        ['H:\\', 'cloud'],
        ['I:\\', 'system'],
        ['R:\\', 'system'],
        ['S:\\', 'duplicate'],
        ['Z:\\', 'network'],
        ['A:\\', 'system']
      ]);
      expect(mounts[0]).toEqual({ path: 'C:\\', device: 'C:', fileSystem: 'NTFS', options: [], kind: 'local' });
      expect(execFile).toHaveBeenCalledTimes(1);
      const [command, args, options] = execFile.mock.calls[0];
      expect([command, args.slice(0, 3), options]).toEqual([
        'D:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command'],
        { timeout: 10000, windowsHide: true }
      ]);
      expect(args[3]).toMatch(/^Get-CimInstance Win32_LogicalDisk .*DeviceID.*DriveType.*FileSystem.*VolumeName.*; subst$/);
    });

    it.each([
      ['PowerShell fails or times out', () => failCommand()],
      ['PowerShell lists no drives', () => answerCommand('S:\\: => C:\\Users\\me\\code\r\n')]
    ])('lists only the system drive as local on Windows when %s', async (_label, answer) => {
      answer();

      expect(await readMountTable({ platform: 'win32', env: { SystemDrive: 'd:' } })).toEqual([
        { path: 'D:\\', device: 'D:', fileSystem: 'NTFS', options: [], kind: 'local' }
      ]);
      expect(await readMountTable({ platform: 'win32', env: {} })).toEqual([
        { path: 'C:\\', device: 'C:', fileSystem: 'NTFS', options: [], kind: 'local' }
      ]);
      expect(execFile.mock.calls[1][0]).toBe('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe');
    });

    it('marks a volume under /Volumes connected over USB as usb when asked, asking diskutil about those volumes only', async () => {
      const busByVolume = { '/Volumes/USB Drive': 'USB', '/Volumes/Backup (1)': 'Thunderbolt' };
      execFile.mockImplementation((command, args, options, callback) => (command === '/sbin/mount'
        ? callback(null, MAC_MOUNTS)
        : callback(null, `<plist><dict><key>BusProtocol</key>\n\t<string>${busByVolume[args[2]]}</string></dict></plist>`)));

      const mounts = await readMountTable({ platform: 'darwin', detectUsb: true });

      expect(kindsOf(mounts)).toEqual(expect.arrayContaining([['/Volumes/USB Drive', 'usb'], ['/Volumes/Backup (1)', 'removable'], ['/', 'local']]));
      expect(execFile.mock.calls.filter(([command]) => command === '/usr/sbin/diskutil').map(([, args]) => args).sort()).toEqual([
        ['info', '-plist', '/Volumes/Backup (1)'],
        ['info', '-plist', '/Volumes/USB Drive']
      ]);
    });

    it('keeps a macOS volume searchable when diskutil fails, and asks diskutil nothing unless USB drives are wanted', async () => {
      execFile.mockImplementation((command, args, options, callback) => (command === '/sbin/mount' ? callback(null, MAC_MOUNTS) : callback(new Error('timed out'))));

      expect(kindsOf(await readMountTable({ platform: 'darwin', detectUsb: true }))).toContainEqual(['/Volumes/USB Drive', 'removable']);
      execFile.mockClear();
      await readMountTable({ platform: 'darwin' });
      expect(execFile.mock.calls.map(([command]) => command)).toEqual(['/sbin/mount']);
    });

    it('marks a Linux disk whose block device sits on a USB bus as usb when asked, but never the disk / is on', async () => {
      readFile.mockResolvedValue([
        LINUX_MOUNT_INFO,
        '46 26 259:2 /srv /srv rw - ext4 /dev/nvme0n1p2 rw'
      ].join('\n'));
      const sysfsPaths = {
        '/sys/dev/block/8:17': '/sys/devices/pci0000:00/0000:00:14.0/usb2/2-1/2-1:1.0/host6/target6:0:0/6:0:0:0/block/sdb/sdb1',
        '/sys/dev/block/8:33': '/sys/devices/pci0000:00/0000:00:17.0/ata3/host2/target2:0:0/2:0:0:0/block/sdc/sdc1'
      };
      realpath.mockImplementation(async (target) => {
        if (!sysfsPaths[target]) {
          throw new Error('ENOENT');
        }
        return sysfsPaths[target];
      });

      const mounts = await readMountTable({ platform: 'linux', detectUsb: true });

      expect(kindsOf(mounts)).toEqual(expect.arrayContaining([['/media/me/USB Drive', 'usb'], ['/data', 'local'], ['/', 'local'], ['/srv', 'local']]));
      expect(realpath.mock.calls.map(([target]) => target).sort()).toEqual(['/sys/dev/block/8:17', '/sys/dev/block/8:33']);
    });

    it('reads no sysfs on Linux unless USB drives are wanted', async () => {
      readFile.mockResolvedValue(LINUX_MOUNT_INFO);

      expect(kindsOf(await readMountTable({ platform: 'linux' }))).toContainEqual(['/media/me/USB Drive', 'removable']);
      expect(realpath).not.toHaveBeenCalled();
    });

    it('marks the Windows drives on a USB disk as usb when asked, but never the system drive or a drive it does not walk', async () => {
      answerCommand(`${WINDOWS_DRIVES}\r\nusb|E:\r\nusb|d:\r\nusb|C:\r\nusb|Z:`);

      const mounts = await readMountTable({ platform: 'win32', env: { SystemDrive: 'C:' }, detectUsb: true });

      expect(kindsOf(mounts)).toEqual(expect.arrayContaining([['C:\\', 'local'], ['D:\\', 'usb'], ['E:\\', 'usb'], ['Z:\\', 'network']]));
      expect(execFile.mock.calls[0][1][3]).toContain('MSFT_Disk');
      expect(execFile.mock.calls[0][1][3]).toContain('BusType -eq 7');
    });

    it('asks Windows about USB disks only when USB drives are wanted', async () => {
      answerCommand(WINDOWS_DRIVES);

      await readMountTable({ platform: 'win32', env: { SystemDrive: 'C:' } });

      expect(execFile.mock.calls[0][1][3]).not.toContain('MSFT_Disk');
    });

    it('lists no mounts on other platforms', async () => {
      expect(await readMountTable({ platform: 'freebsd' })).toEqual([]);
      expect(execFile).not.toHaveBeenCalled();
      expect(readFile).not.toHaveBeenCalled();
    });
  });

  describe('skippedMountPointsOf', () => {
    const { readMountTable, skippedMountPointsOf } = require('./mount-points');

    it('keeps the Choose folder rule on Linux, so a FUSE disk is skipped although the table calls it local', async () => {
      readFile.mockResolvedValue([
        LINUX_MOUNT_INFO,
        '56 26 8:81 / /windows rw - fuseblk /dev/sdf1 rw,user_id=0',
        '57 26 8:97 / /mnt/disk rw - ext4 /dev/sdg1 rw'
      ].join('\n'));

      const skipped = skippedMountPointsOf(await readMountTable({ platform: 'linux' }), 'linux');

      expect([...skipped].sort()).toEqual([
        '/home/me/back\\slash',
        '/home/me/nas',
        '/home/me/nfs',
        '/home/me/remote',
        '/media/me/USB Drive',
        '/mnt/disk',
        '/windows'
      ]);
    });

    it('skips nothing on Windows, whatever the drives are', async () => {
      answerCommand(WINDOWS_DRIVES);

      expect(skippedMountPointsOf(await readMountTable({ platform: 'win32', env: {} }), 'win32')).toEqual(new Set());
    });
  });
});
