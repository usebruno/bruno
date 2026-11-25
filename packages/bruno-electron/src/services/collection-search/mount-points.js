const fs = require('node:fs/promises');
const { execFile } = require('node:child_process');

const NETWORK_FILE_SYSTEMS = new Set([
  'nfs', 'nfs4', 'smbfs', 'smb3', 'cifs', 'afpfs', 'afp', 'webdav', 'davfs', 'davfs2',
  'sshfs', 'ftpfs', 'ncpfs', 'coda', '9p', 'autofs'
]);

const REMOVABLE_MOUNT_PREFIXES = process.platform === 'darwin' ? ['/Volumes/'] : ['/media/', '/mnt/', '/run/media/'];

const isSkippedMount = ({ mountPoint, fileSystem, options }) =>
  NETWORK_FILE_SYSTEMS.has(fileSystem)
  || fileSystem.includes('fuse')
  || options.includes('nobrowse')
  || (mountPoint !== '/' && REMOVABLE_MOUNT_PREFIXES.some((prefix) => mountPoint.startsWith(prefix)));

const readMacMounts = () =>
  new Promise((resolve) => {
    execFile('mount', [], { timeout: 3000 }, (error, stdout) => {
      if (error) {
        resolve([]);
        return;
      }
      resolve(String(stdout)
        .split('\n')
        .map((line) => line.match(/^(.+?) on (.+) \(([^()]*)\)$/))
        .filter(Boolean)
        .map((match) => {
          const [fileSystem, ...options] = match[3].split(', ');
          return { mountPoint: match[2], fileSystem, options };
        }));
    });
  });

const decodeMountPath = (value) => value.replace(/\\([0-7]{3})/g, (_match, octal) => String.fromCharCode(parseInt(octal, 8)));

const readLinuxMounts = async () => {
  try {
    const mounts = await fs.readFile('/proc/mounts', 'utf8');
    return mounts
      .split('\n')
      .map((line) => line.split(' '))
      .filter((parts) => parts.length >= 4)
      .map((parts) => ({ mountPoint: decodeMountPath(parts[1]), fileSystem: parts[2], options: parts[3].split(',') }));
  } catch (error) {
    return [];
  }
};

const getSkippedMountPoints = async () => {
  let mounts = [];
  if (process.platform === 'darwin') {
    mounts = await readMacMounts();
  } else if (process.platform === 'linux') {
    mounts = await readLinuxMounts();
  }
  return new Set(mounts.filter(isSkippedMount).map((mount) => mount.mountPoint));
};

module.exports = {
  getSkippedMountPoints
};
