const fs = require('node:fs/promises');
const path = require('node:path');
const { runCommand, getPowerShellPath } = require('../collection-search/run-command');

const POWERSHELL_TIMEOUT = 10000;
const MAX_ENCODED_PATHS_LENGTH = 30000;
const CLOUD_CHECK_FILES_VARIABLE = 'BRUNO_CLOUD_CHECK_FILES';
const ICLOUD_SYNCED_HOME_FOLDERS = ['Desktop', 'Documents'];

const LIST_SYNC_ROOTS = [
  '$roots = Get-ItemProperty -Path \'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\SyncRootManager\\*\\UserSyncRoots\' -ErrorAction SilentlyContinue',
  '| ForEach-Object { $_.PSObject.Properties | Where-Object { $_.Name -like \'S-1-*\' } | ForEach-Object { $_.Value } };',
  '[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(($roots -join [char]10)))'
].join(' ');

const LIST_CLOUD_ONLY_FILES = [
  `$paths = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($env:${CLOUD_CHECK_FILES_VARIABLE})) -split [char]10;`,
  '$cloudOnly = foreach ($p in $paths) {',
  '$item = Get-Item -LiteralPath $p -Force -ErrorAction SilentlyContinue;',
  'if (-not $item -or ([int]$item.Attributes -band 0x441000)) { $p } };',
  '[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(($cloudOnly -join [char]10)))'
].join(' ');

const readJsonFile = (filePath) => fs.readFile(filePath, 'utf8').then(JSON.parse).catch(() => null);

const pathExists = (filePath) => fs.stat(filePath).then(() => true, () => false);

const runPowerShell = (script, env = process.env) =>
  runCommand(getPowerShellPath(env), ['-NoProfile', '-NonInteractive', '-Command', script], POWERSHELL_TIMEOUT, env);

const encodeLines = (lines) => Buffer.from(lines.join('\n'), 'utf8').toString('base64');

const decodeLines = (output) => Buffer.from(output.trim(), 'base64').toString('utf8').split('\n').filter(Boolean);

const toFolderKey = (folderPath) => folderPath.toLowerCase().replace(/[\\/]+$/, '');

const dropboxFolders = (info) =>
  [info?.personal?.path, info?.business?.path].filter((folderPath) => typeof folderPath === 'string' && folderPath.length > 0);

const readUnixDropboxFolders = async (homePath) => dropboxFolders(await readJsonFile(path.posix.join(homePath, '.dropbox', 'info.json')));

const findMacCloudFolders = async (homePath) => {
  const iCloudDrive = path.posix.join(homePath, 'Library', 'Mobile Documents');
  const [dropboxFolderList, ...isSynced] = await Promise.all([
    readUnixDropboxFolders(homePath),
    ...ICLOUD_SYNCED_HOME_FOLDERS.map((name) => pathExists(path.posix.join(iCloudDrive, 'com~apple~CloudDocs', name)))
  ]);
  const syncFolders = [iCloudDrive, path.posix.join(homePath, 'Library', 'CloudStorage'), ...dropboxFolderList];
  return {
    syncFolders,
    placeholderFolders: [
      ...syncFolders,
      ...ICLOUD_SYNCED_HOME_FOLDERS.filter((_name, index) => isSynced[index]).map((name) => path.posix.join(homePath, name))
    ]
  };
};

const findWindowsCloudFolders = async (homePath, env) => {
  const dropboxInfoFiles = [env.LOCALAPPDATA, env.APPDATA].filter(Boolean).map((folderPath) => path.win32.join(folderPath, 'Dropbox', 'info.json'));
  const [syncRootsOutput, ...dropboxInfos] = await Promise.all([
    runPowerShell(LIST_SYNC_ROOTS, env),
    ...dropboxInfoFiles.map(readJsonFile)
  ]);
  const folders = [
    env.OneDrive,
    env.OneDriveConsumer,
    env.OneDriveCommercial,
    path.win32.join(env.USERPROFILE || homePath, 'OneDrive'),
    ...(syncRootsOutput ? decodeLines(syncRootsOutput).filter((value) => /^[A-Za-z]:\\/.test(value)) : []),
    ...dropboxInfos.flatMap(dropboxFolders)
  ].filter(Boolean);
  const syncFolders = folders.filter((folderPath, index) => folders.findIndex((otherPath) => toFolderKey(otherPath) === toFolderKey(folderPath)) === index);
  return { syncFolders, placeholderFolders: syncFolders };
};

const findCloudFolders = async ({ platform, homePath, env }) => {
  if (platform === 'darwin') {
    return findMacCloudFolders(homePath);
  }
  if (platform === 'win32') {
    return findWindowsCloudFolders(homePath, env);
  }
  if (platform === 'linux') {
    return { syncFolders: await readUnixDropboxFolders(homePath), placeholderFolders: [] };
  }
  return { syncFolders: [], placeholderFolders: [] };
};

const isDatalessFile = async (filePath) => {
  const flags = await runCommand('/usr/bin/stat', ['-L', '-f', '%Sf', filePath], 2000);
  return flags === null || flags.trim().split(',').includes('dataless');
};

const toEncodablePathGroups = (filePaths) => {
  const groups = [];
  let group = [];
  let groupBytes = 0;
  filePaths.forEach((filePath) => {
    const pathBytes = Buffer.byteLength(filePath) + 1;
    if (group.length > 0 && Math.ceil((groupBytes + pathBytes) / 3) * 4 > MAX_ENCODED_PATHS_LENGTH) {
      groups.push(group);
      group = [];
      groupBytes = 0;
    }
    group.push(filePath);
    groupBytes += pathBytes;
  });
  return group.length > 0 ? [...groups, group] : groups;
};

const findCloudOnlyFiles = async (filePaths) => {
  const groups = toEncodablePathGroups(filePaths);
  const outputs = await Promise.all(groups.map((group) =>
    runPowerShell(LIST_CLOUD_ONLY_FILES, { ...process.env, [CLOUD_CHECK_FILES_VARIABLE]: encodeLines(group) })));
  return new Set(groups.flatMap((group, index) => (outputs[index] === null ? group : decodeLines(outputs[index]))));
};

module.exports = {
  findCloudFolders,
  isDatalessFile,
  findCloudOnlyFiles
};
