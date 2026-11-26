const { planWholeComputer } = require('./whole-computer');

const mount = (path, kind, device = path, root = '/') => ({ path, kind, device, root });

const SAMPLE_VOLUME_OS_FOLDERS = ['System', 'private', 'Windows', 'Program Files', '$RECYCLE.BIN', 'OneDriveTemp'];

const sampleVolumeOsFolders = (volumeRoot, separator) => SAMPLE_VOLUME_OS_FOLDERS.map((name) => `${volumeRoot}${separator}${name}`);

describe('planWholeComputer', () => {
  describe('on macOS', () => {
    const mounts = [
      mount('/', 'local'),
      mount('/dev', 'system'),
      mount('/System/Volumes/Data', 'system'),
      mount('/System/Volumes/Data/home', 'network'),
      mount('/Users/me/code', 'local'),
      mount('/Users/me/gdrive', 'network'),
      mount('/Volumes/USB', 'removable'),
      mount('/Volumes/Projects', 'removable'),
      mount('/Volumes/share', 'network'),
      mount('/Volumes/.timemachine/backup', 'system')
    ];

    it('walks /, /usr/local, /Applications and every volume under /Volumes', () => {
      const { roots, volumeRoots } = planWholeComputer({ platform: 'darwin', mounts, env: {} });

      expect(roots).toEqual(['/', '/usr/local', '/Applications']);
      expect(volumeRoots).toEqual(['/Volumes/USB', '/Volumes/Projects']);
    });

    it('prunes the system folders, every mount it does not walk, and the OS folders at the top of each volume', () => {
      const { prunePaths, mountPrunePaths } = planWholeComputer({ platform: 'darwin', mounts, env: {} });

      expect(prunePaths).toEqual(expect.arrayContaining([
        '/System', '/private/etc', '/private/var', '/dev', '/usr', '/Volumes',
        ...sampleVolumeOsFolders('/Volumes/USB', '/'),
        ...sampleVolumeOsFolders('/Volumes/Projects', '/')
      ]));
      expect(mountPrunePaths).toEqual(expect.arrayContaining([
        '/dev', '/System/Volumes/Data', '/System/Volumes/Data/home', '/Users/me/gdrive', '/Volumes/share', '/Volumes/.timemachine/backup'
      ]));
      expect([...prunePaths, ...mountPrunePaths]).not.toContain('/Users/me/code');
    });

    it('still stays out of /System and /dev when the mount table could not be read', () => {
      const { roots, prunePaths } = planWholeComputer({ platform: 'darwin', mounts: [], env: {} });

      expect(roots).toEqual(['/', '/usr/local', '/Applications']);
      expect(prunePaths).toEqual(expect.arrayContaining(['/System', '/dev']));
    });

    it('keeps /private/tmp, /Users, /opt and other top-level folders walked', () => {
      const { prunePaths } = planWholeComputer({ platform: 'darwin', mounts, env: {} });

      ['/private', '/private/tmp', '/tmp', '/Users', '/Users/Shared', '/opt'].forEach((folderPath) => {
        expect(prunePaths).not.toContain(folderPath);
      });
    });
  });

  describe('on Linux', () => {
    const mounts = [
      mount('/', 'local'),
      mount('/home', 'local'),
      mount('/data', 'local'),
      mount('/proc', 'system'),
      mount('/snap/core22/1234', 'system'),
      mount('/home/me/nfs', 'network'),
      mount('/home/me/gdrive', 'cloud'),
      mount('/home/me/projects', 'duplicate'),
      mount('/media/me/USB', 'removable'),
      mount('/run/media/me/Backup', 'removable'),
      mount('/mnt/data', 'removable'),
      mount('/mnt/nas', 'network')
    ];

    it('walks /, /usr/local and every removable mount', () => {
      const { roots, volumeRoots } = planWholeComputer({ platform: 'linux', mounts, env: {} });

      expect(roots).toEqual(['/', '/usr/local']);
      expect(volumeRoots).toEqual(['/media/me/USB', '/run/media/me/Backup', '/mnt/data']);
    });

    it('prunes the system folders, every mount it does not walk, and the OS folders at the top of each removable root', () => {
      const { prunePaths, mountPrunePaths } = planWholeComputer({ platform: 'linux', mounts, env: {} });

      expect(prunePaths).toEqual(expect.arrayContaining([
        '/run', '/boot', '/snap', '/nix', '/gnu', '/sysroot', '/usr', '/etc', '/var/lib', '/var/log', '/media', '/mnt',
        ...sampleVolumeOsFolders('/media/me/USB', '/'),
        ...sampleVolumeOsFolders('/run/media/me/Backup', '/'),
        ...sampleVolumeOsFolders('/mnt/data', '/')
      ]));
      expect(mountPrunePaths).toEqual(expect.arrayContaining([
        '/proc', '/snap/core22/1234', '/home/me/nfs', '/home/me/gdrive', '/home/me/projects', '/mnt/nas'
      ]));
    });

    it('walks a disk mounted straight at /mnt or /media as a volume', () => {
      const { roots, volumeRoots, prunePaths } = planWholeComputer({ platform: 'linux', mounts: [mount('/', 'local'), mount('/mnt', 'removable'), mount('/media', 'removable')], env: {} });

      expect(roots).toEqual(['/', '/usr/local']);
      expect(volumeRoots).toEqual(['/mnt', '/media']);
      expect(prunePaths).toEqual(expect.arrayContaining(['/mnt/Windows', '/media/System']));
      expect(prunePaths).not.toContain('/mnt');
      expect(prunePaths).not.toContain('/media');
    });

    it('prunes the copy of a bind mount inside the wider mount of the same disk, but never the bind mount itself', () => {
      const { prunePaths, mountPrunePaths } = planWholeComputer({
        platform: 'linux',
        mounts: [
          mount('/', 'local', '259:2', '/'),
          mount('/srv', 'local', '259:2', '/srv'),
          mount('/mnt/storage', 'removable', '8:49', '/'),
          mount('/home', 'local', '8:49', '/home'),
          mount('/var/www', 'local', '8:49', '/home/me/www'),
          mount('/home/me/backup', 'duplicate', '8:49', '/')
        ],
        env: {}
      });

      expect(mountPrunePaths).toEqual(expect.arrayContaining(['/home/me/backup', '/mnt/storage/home', '/mnt/storage/home/me/www', '/home/me/www']));
      ['/srv', '/mnt/storage', '/home'].forEach((folderPath) => {
        expect(mountPrunePaths).not.toContain(folderPath);
        expect(prunePaths).not.toContain(folderPath);
      });
    });

    it('keeps a folder another disk is mounted on, although a bind mount’s folder would show there', () => {
      const { mountPrunePaths } = planWholeComputer({
        platform: 'linux',
        mounts: [
          mount('/', 'local', '259:2', '/'),
          mount('/data', 'local', '8:49', '/'),
          mount('/srv/team', 'local', '8:49', '/team'),
          mount('/srv/docs', 'local', '8:49', '/docs'),
          mount('/data/team', 'local', '8:65', '/')
        ],
        env: {}
      });

      expect(mountPrunePaths).toContain('/data/docs');
      expect(mountPrunePaths).not.toContain('/data/team');
    });

    it.each([
      ['a network mount', [mount('/', 'local'), mount('/usr/local', 'network')]],
      ['inside a network mount of /usr', [mount('/', 'local'), mount('/usr', 'network')]]
    ])('does not walk /usr/local when it is %s, and prunes the mount', (_label, mountsWithNetworkUsr) => {
      const { roots, mountPrunePaths } = planWholeComputer({ platform: 'linux', mounts: mountsWithNetworkUsr, env: {} });

      expect(roots).toEqual(['/']);
      expect(mountPrunePaths).toEqual(mountsWithNetworkUsr.filter((drive) => drive.kind === 'network').map((drive) => drive.path));
    });

    it('still walks /usr/local when / itself is a mount it does not walk', () => {
      expect(planWholeComputer({ platform: 'linux', mounts: [mount('/', 'system')], env: {} }).roots).toEqual(['/', '/usr/local']);
    });

    it('keeps /home, /opt, /srv, /var/www, /data, the temp folders and other top-level folders walked', () => {
      const { prunePaths } = planWholeComputer({ platform: 'linux', mounts, env: {} });

      ['/home', '/opt', '/srv', '/var', '/var/www', '/data', '/root', '/workspace', '/tmp', '/var/tmp'].forEach((folderPath) => {
        expect(prunePaths).not.toContain(folderPath);
      });
    });
  });

  it.each([
    ['macOS', 'darwin', [mount('/', 'local'), mount('/Volumes/USB', 'usb'), mount('/Volumes/Thunderbolt', 'removable')], '/Volumes/USB', '/Volumes/Thunderbolt'],
    ['Linux', 'linux', [mount('/', 'local'), mount('/media/me/USB', 'usb'), mount('/data', 'usb'), mount('/mnt/disk', 'removable')], '/media/me/USB', '/mnt/disk'],
    ['Windows', 'win32', [mount('C:\\', 'local'), mount('E:\\', 'usb'), mount('D:\\', 'local')], 'E:\\', 'D:\\']
  ])('on %s neither walks nor enters a USB drive, but walks other disks', (_label, platform, mounts, usbDrive, otherDisk) => {
    const { roots, volumeRoots, mountPrunePaths } = planWholeComputer({ platform, mounts, env: {} });

    expect([...roots, ...volumeRoots]).not.toContain(usbDrive);
    expect([...roots, ...volumeRoots]).toContain(otherDisk);
    if (platform !== 'win32') {
      expect(mountPrunePaths).toEqual(expect.arrayContaining(mounts.filter((drive) => drive.kind === 'usb').map((drive) => drive.path)));
    }
  });

  describe('on Windows', () => {
    const mounts = [
      mount('C:\\', 'local'),
      mount('D:\\', 'local'),
      mount('E:\\', 'removable'),
      mount('F:\\', 'system'),
      mount('G:\\', 'cloud'),
      mount('S:\\', 'duplicate'),
      mount('Z:\\', 'network')
    ];

    it('walks every local or removable drive', () => {
      expect(planWholeComputer({ platform: 'win32', mounts, env: {} }).roots).toEqual(['C:\\', 'D:\\', 'E:\\']);
    });

    it('prunes the OS folders at the top of every walked drive, then Windows, the program folders and ProgramData', () => {
      const env = {
        'SystemRoot': 'C:\\WINDOWS',
        'ProgramFiles': 'C:\\Program Files',
        'ProgramFiles(x86)': 'C:\\Program Files (x86)',
        'ProgramData': 'C:\\ProgramData'
      };

      const { prunePaths } = planWholeComputer({ platform: 'win32', mounts, env });

      expect(prunePaths).toEqual(expect.arrayContaining([
        ...sampleVolumeOsFolders('C:', '\\'),
        ...sampleVolumeOsFolders('D:', '\\'),
        ...sampleVolumeOsFolders('E:', '\\'),
        'C:\\WINDOWS',
        'C:\\Program Files',
        'C:\\Program Files (x86)',
        'C:\\ProgramData'
      ]));
      expect(prunePaths.some((prunePath) => prunePath.startsWith('F:') || prunePath.startsWith('Z:'))).toBe(false);
    });

    it('prunes only the volume OS folders when the system folder variables are not set', () => {
      const { prunePaths } = planWholeComputer({ platform: 'win32', mounts: [mount('C:\\', 'local')], env: {} });

      expect(prunePaths.every((prunePath) => prunePath.startsWith('C:\\'))).toBe(true);
      expect(prunePaths).toEqual(expect.arrayContaining(sampleVolumeOsFolders('C:', '\\')));
    });
  });

  it('plans nothing on other platforms', () => {
    expect(planWholeComputer({ platform: 'freebsd', mounts: [mount('/', 'local')], env: {} })).toEqual({ roots: [], volumeRoots: [], prunePaths: [], mountPrunePaths: [] });
  });
});
