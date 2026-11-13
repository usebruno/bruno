const fs = require('node:fs/promises');

const lstatIfReparsePoint = (entry, entryPath) =>
  (process.platform === 'win32' && entry.isSymbolicLink() ? fs.lstat(entryPath).catch(() => null) : null);

const isRealFolder = async (entry, entryPath) =>
  entry.isDirectory() || Boolean((await lstatIfReparsePoint(entry, entryPath))?.isDirectory());

const isRealFile = async (entry, entryPath) =>
  entry.isFile() || Boolean((await lstatIfReparsePoint(entry, entryPath))?.isFile());

module.exports = {
  isRealFolder,
  isRealFile
};
