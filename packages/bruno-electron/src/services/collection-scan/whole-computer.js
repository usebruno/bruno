const path = require('node:path');
const { isWalkableMount } = require('../collection-search/mount-points');

const VOLUME_OS_FOLDERS = [
  'System', 'private', 'usr', 'bin', 'sbin', 'cores', 'Backups.backupdb',
  'Windows', 'Windows.old', 'Program Files', 'Program Files (x86)', 'ProgramData', 'Recovery', 'PerfLogs',
  '$RECYCLE.BIN', 'RECYCLER', 'RECYCLED', '$WinREAgent',
  '$Windows.~BT', '$Windows.~WS', '$SysReset', '$GetCurrent', 'Config.Msi', 'MSOCache', 'OneDriveTemp'
];

const MAC_SYSTEM_FOLDERS = ['/System', '/private/etc', '/private/var', '/dev', '/cores', '/bin', '/sbin', '/usr', '/Volumes'];
const LINUX_SYSTEM_FOLDERS = [
  '/run', '/boot', '/snap', '/nix', '/gnu', '/sysroot', '/lost+found', '/usr', '/bin', '/sbin',
  '/lib', '/lib32', '/lib64', '/libx32', '/etc', '/var/lib', '/var/cache', '/var/log', '/var/spool',
  '/var/crash', '/media', '/mnt'
];
const MAC_EXTRA_ROOTS = ['/usr/local', '/Applications'];
const LINUX_EXTRA_ROOTS = ['/usr/local'];
const WINDOWS_SYSTEM_FOLDER_VARIABLES = ['SystemRoot', 'ProgramFiles', 'ProgramFiles(x86)', 'ProgramData'];

const copiesInsideWiderMounts = (walkableMounts) =>
  walkableMounts.flatMap((mount) => walkableMounts
    .filter((wider) => wider !== mount && wider.device === mount.device)
    .map((wider) => ({ wider, relativeRoot: path.posix.relative(wider.root, mount.root) }))
    .filter(({ relativeRoot }) => relativeRoot !== '' && !relativeRoot.startsWith('..') && !path.posix.isAbsolute(relativeRoot))
    .map(({ wider, relativeRoot }) => path.posix.join(wider.path, relativeRoot))
    .filter((copyPath) => copyPath !== mount.path));

const volumeOsFolders = (volumeRoots, pathModule) =>
  volumeRoots.flatMap((volumeRoot) => VOLUME_OS_FOLDERS.map((name) => pathModule.join(volumeRoot, name)));

const planUnixComputer = ({ mounts, systemFolders, extraRoots }) => {
  const walkableMounts = mounts.filter(isWalkableMount);
  const volumeRoots = mounts.filter((mount) => mount.kind === 'removable').map((mount) => mount.path);
  return {
    roots: ['/', ...extraRoots, ...volumeRoots],
    prunePaths: [
      ...systemFolders,
      ...mounts.filter((mount) => !isWalkableMount(mount)).map((mount) => mount.path),
      ...copiesInsideWiderMounts(walkableMounts),
      ...volumeOsFolders(volumeRoots, path.posix)
    ]
  };
};

const planWindowsComputer = ({ mounts, env }) => {
  const driveRoots = mounts.filter(isWalkableMount).map((mount) => mount.path);
  return {
    roots: driveRoots,
    prunePaths: [
      ...volumeOsFolders(driveRoots, path.win32),
      ...WINDOWS_SYSTEM_FOLDER_VARIABLES.map((name) => env[name]).filter(Boolean)
    ]
  };
};

const planWholeComputer = ({ platform, mounts, env }) => {
  if (platform === 'darwin') {
    return planUnixComputer({ mounts, systemFolders: MAC_SYSTEM_FOLDERS, extraRoots: MAC_EXTRA_ROOTS });
  }
  if (platform === 'linux') {
    return planUnixComputer({ mounts, systemFolders: LINUX_SYSTEM_FOLDERS, extraRoots: LINUX_EXTRA_ROOTS });
  }
  if (platform === 'win32') {
    return planWindowsComputer({ mounts, env });
  }
  return { roots: [], prunePaths: [] };
};

module.exports = {
  planWholeComputer
};
