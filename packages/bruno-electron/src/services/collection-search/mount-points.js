const fs = require('node:fs/promises');
const path = require('node:path');
const { runCommand, getPowerShellPath } = require('./run-command');

const NETWORK_FILE_SYSTEMS = new Set([
  'nfs', 'nfs4', 'smbfs', 'smb3', 'cifs', 'afpfs', 'afp', 'webdav', 'davfs', 'davfs2',
  'sshfs', 'ftpfs', 'ncpfs', 'coda', '9p', 'autofs'
]);
const MAC_NETWORK_FILE_SYSTEMS = new Set(['smbfs', 'nfs', 'afpfs', 'webdav', 'autofs', 'macfuse', 'osxfuse', 'fuse-t', 'fuse', 'ftp', 'cifs']);
const LINUX_NETWORK_FILE_SYSTEMS = new Set([
  ...NETWORK_FILE_SYSTEMS, 'afs', 'ceph', 'virtiofs', 'fuse.sshfs', 'fuse.gvfsd-fuse', 'fuse.portal'
]);
const LINUX_LOCAL_FILE_SYSTEMS = new Set([
  'ext2', 'ext3', 'ext4', 'xfs', 'btrfs', 'f2fs', 'zfs', 'bcachefs', 'vfat', 'exfat', 'ntfs', 'ntfs3',
  'fuseblk', 'jfs', 'ecryptfs', 'fuse.gocryptfs', 'fuse.encfs', 'fuse.cryfs'
]);
const LINUX_TEMP_FOLDERS = new Set(['/tmp', '/var/tmp']);
const WINDOWS_LOCAL_FILE_SYSTEMS = new Set(['ntfs', 'refs', 'fat', 'fat32', 'exfat']);
const WINDOWS_DRIVE_KINDS = { 2: 'removable', 3: 'local', 4: 'network' };
const FLOPPY_DRIVES = new Set(['A:', 'B:']);

const MAC_REMOVABLE_MOUNT_PREFIXES = ['/Volumes/'];
const LINUX_REMOVABLE_MOUNT_PREFIXES = ['/media/', '/mnt/', '/run/media/'];

const LIST_WINDOWS_DRIVES = `Get-CimInstance Win32_LogicalDisk | ForEach-Object { '{0}|{1}|{2}|{3}' -f $_.DeviceID, $_.DriveType, $_.FileSystem, $_.VolumeName }; subst`;
const LIST_WINDOWS_USB_DRIVES = [
  '$usbDisks = @(Get-CimInstance -Namespace root/Microsoft/Windows/Storage -ClassName MSFT_Disk -ErrorAction SilentlyContinue',
  '| Where-Object { $_.BusType -eq 7 } | ForEach-Object { $_.Number });',
  'Get-CimInstance -Namespace root/Microsoft/Windows/Storage -ClassName MSFT_Partition -ErrorAction SilentlyContinue',
  '| Where-Object { ([string]$_.DriveLetter -match \'^[A-Za-z]$\') -and ($usbDisks -contains $_.DiskNumber) }',
  '| ForEach-Object { \'usb|{0}:\' -f $_.DriveLetter }'
].join(' ');
const USB_SYSFS_SEGMENT = /\/usb\d+\//;
const MAC_USB_BUS = /<key>BusProtocol<\/key>\s*<string>USB<\/string>/;

const isUnderAny = (mountPoint, prefixes) => prefixes.some((prefix) => mountPoint.startsWith(prefix));

const isVolumeMountPoint = (mountPoint, prefixes) =>
  prefixes.some((prefix) => mountPoint === prefix.slice(0, -1) || mountPoint.startsWith(prefix));

const isWalkableMount = (mount) => mount.kind === 'local' || mount.kind === 'removable';

const isSkippedMount = ({ path: mountPoint, fileSystem, options }, removablePrefixes) =>
  LINUX_NETWORK_FILE_SYSTEMS.has(fileSystem)
  || fileSystem.includes('fuse')
  || options.includes('nobrowse')
  || (mountPoint !== '/' && isUnderAny(mountPoint, removablePrefixes));

const macMountKind = (mountPoint, fileSystem, options) => {
  if (MAC_NETWORK_FILE_SYSTEMS.has(fileSystem) || !options.includes('local')) {
    return 'network';
  }
  if (options.includes('nobrowse') || options.includes('automounted') || mountPoint === '/dev' || mountPoint.startsWith('/System/Volumes/')) {
    return 'system';
  }
  return isVolumeMountPoint(mountPoint, MAC_REMOVABLE_MOUNT_PREFIXES) ? 'removable' : 'local';
};

const parseMacMounts = (text) =>
  text
    .split('\n')
    .map((line) => line.match(/^(.+?) on (.+) \(([^()]*)\)$/))
    .filter(Boolean)
    .map(([, device, mountPoint, flags]) => {
      const [fileSystem, ...options] = flags.split(', ');
      return { path: mountPoint, device, fileSystem, root: '/', options, kind: macMountKind(mountPoint, fileSystem, options) };
    });

const decodeMountPath = (value) => value.replace(/\\([0-7]{3})/g, (_match, octal) => String.fromCharCode(parseInt(octal, 8)));

const linuxMountKind = (mountPoint, fileSystem) => {
  if (LINUX_NETWORK_FILE_SYSTEMS.has(fileSystem)) {
    return 'network';
  }
  if (LINUX_LOCAL_FILE_SYSTEMS.has(fileSystem)) {
    return isVolumeMountPoint(mountPoint, LINUX_REMOVABLE_MOUNT_PREFIXES) ? 'removable' : 'local';
  }
  if (fileSystem === 'tmpfs' && LINUX_TEMP_FOLDERS.has(mountPoint)) {
    return 'local';
  }
  return fileSystem.startsWith('fuse.') ? 'cloud' : 'system';
};

const parseMountInfoLine = (line) => {
  const separator = line.indexOf(' - ');
  if (separator < 0) {
    return null;
  }
  const fields = line.slice(0, separator).split(' ');
  const [fileSystem] = line.slice(separator + 3).split(' ');
  if (fields.length < 6 || !fileSystem) {
    return null;
  }
  const [, , device, root, mountPoint, options] = fields;
  const decodedMountPoint = decodeMountPath(mountPoint);
  return {
    path: decodedMountPoint,
    device,
    fileSystem,
    root: decodeMountPath(root),
    options: options.split(','),
    kind: linuxMountKind(decodedMountPoint, fileSystem)
  };
};

const isSameOrInsideRoot = (root, parentRoot) =>
  root === parentRoot || root.startsWith(parentRoot.endsWith('/') ? parentRoot : `${parentRoot}/`);

const markBindMountDuplicates = (mounts) => {
  const kept = [];
  const duplicates = new Set();
  mounts
    .filter(isWalkableMount)
    .sort((first, second) => first.path.length - second.path.length || first.root.length - second.root.length)
    .forEach((mount) => {
      const isDuplicate = kept.some((keptMount) => {
        if (keptMount.device !== mount.device || !isSameOrInsideRoot(mount.root, keptMount.root)) {
          return false;
        }
        const keptPathOfSameFolder = path.posix.join(keptMount.path, path.posix.relative(keptMount.root, mount.root));
        return keptPathOfSameFolder !== mount.path && keptPathOfSameFolder.length <= mount.path.length;
      });
      if (isDuplicate) {
        duplicates.add(mount);
      } else {
        kept.push(mount);
      }
    });
  return mounts.map((mount) => (duplicates.has(mount) ? { ...mount, kind: 'duplicate' } : mount));
};

const parseLinuxMountInfo = (text) => markBindMountDuplicates(text.split('\n').map(parseMountInfoLine).filter(Boolean));

const windowsDriveKind = ({ device, driveType, fileSystem, volumeName }, substDrives) => {
  if (substDrives.has(device)) {
    return 'duplicate';
  }
  const kind = FLOPPY_DRIVES.has(device) ? 'system' : (WINDOWS_DRIVE_KINDS[driveType] || 'system');
  if (kind !== 'local' && kind !== 'removable') {
    return kind;
  }
  if (!fileSystem) {
    return 'system';
  }
  const isCloudDrive = !WINDOWS_LOCAL_FILE_SYSTEMS.has(fileSystem.toLowerCase()) || volumeName.trim().toLowerCase() === 'google drive';
  return isCloudDrive ? 'cloud' : kind;
};

const parseWindowsDrives = (text, systemDrive) => {
  const lines = text.split(/\r?\n/);
  const substDrives = new Set(lines
    .map((line) => line.match(/^([A-Za-z]:)\\: => /))
    .filter(Boolean)
    .map(([, device]) => device.toUpperCase()));
  const usbDrives = new Set(lines
    .map((line) => line.match(/^usb\|([A-Za-z]:)$/))
    .filter(Boolean)
    .map(([, device]) => device.toUpperCase()));
  return lines
    .map((line) => line.match(/^([A-Za-z]:)\|(\d+)\|([^|]*)\|(.*)$/))
    .filter(Boolean)
    .map(([, letter, driveType, fileSystem, volumeName]) => {
      const device = letter.toUpperCase();
      const kind = windowsDriveKind({ device, driveType, fileSystem, volumeName }, substDrives);
      return {
        path: `${device}\\`,
        device,
        fileSystem,
        options: [],
        kind: isWalkableMount({ kind }) && usbDrives.has(device) && device !== systemDrive ? 'usb' : kind
      };
    });
};

const readWindowsDrives = async (env, detectUsb) => {
  const systemDrive = (env.SystemDrive || 'C:').toUpperCase();
  const script = detectUsb ? `${LIST_WINDOWS_DRIVES}; ${LIST_WINDOWS_USB_DRIVES}` : LIST_WINDOWS_DRIVES;
  const drives = parseWindowsDrives((await runCommand(getPowerShellPath(env), ['-NoProfile', '-NonInteractive', '-Command', script], 10000)) || '', systemDrive);
  if (drives.length > 0) {
    return drives;
  }
  return [{ path: `${systemDrive}\\`, device: systemDrive, fileSystem: 'NTFS', options: [], kind: 'local' }];
};

const isMacUsbVolume = async ({ path: mountPoint }) =>
  MAC_USB_BUS.test((await runCommand('/usr/sbin/diskutil', ['info', '-plist', mountPoint], 3000)) || '');

const isLinuxUsbDevice = async ({ device }) => USB_SYSFS_SEGMENT.test(await fs.realpath(`/sys/dev/block/${device}`).catch(() => ''));

const markUsbMounts = async (mounts, isUsb, checkedKinds) => {
  const systemDevice = mounts.find((mount) => mount.path === '/')?.device;
  const isUsbMount = await Promise.all(mounts.map((mount) =>
    checkedKinds.includes(mount.kind) && mount.device !== systemDevice && isUsb(mount)));
  return mounts.map((mount, index) => (isUsbMount[index] ? { ...mount, kind: 'usb' } : mount));
};

const readMountTable = async ({ platform = process.platform, env = process.env, detectUsb = false } = {}) => {
  if (platform === 'darwin') {
    const mounts = parseMacMounts((await runCommand('/sbin/mount', [], 3000)) || '');
    return detectUsb ? markUsbMounts(mounts, isMacUsbVolume, ['removable']) : mounts;
  }
  if (platform === 'linux') {
    const mounts = parseLinuxMountInfo(await fs.readFile('/proc/self/mountinfo', 'utf8').catch(() => ''));
    return detectUsb ? markUsbMounts(mounts, isLinuxUsbDevice, ['local', 'removable']) : mounts;
  }
  if (platform === 'win32') {
    return readWindowsDrives(env, detectUsb);
  }
  return [];
};

const skippedMountPointsOf = (mounts, platform = process.platform) => {
  const removablePrefixes = platform === 'darwin' ? MAC_REMOVABLE_MOUNT_PREFIXES : LINUX_REMOVABLE_MOUNT_PREFIXES;
  return new Set(mounts.filter((mount) => isSkippedMount(mount, removablePrefixes)).map((mount) => mount.path));
};

const getSkippedMountPoints = async () => {
  if (process.platform === 'win32') {
    return new Set();
  }
  return skippedMountPointsOf(await readMountTable());
};

module.exports = {
  isWalkableMount,
  readMountTable,
  skippedMountPointsOf,
  getSkippedMountPoints
};
