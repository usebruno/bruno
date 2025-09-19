import platform from 'platform';
import path from 'path';

const isWindowsOS = () => {
    const os = platform.os;
    const osFamily = os.family.toLowerCase();
    return osFamily.includes('windows');
};

const brunoPath = isWindowsOS() ? path.win32 : path.posix;

const getRelativePath = (absolutePath, collectionPath) => {
  try {
    const relativePath = brunoPath.relative(collectionPath, absolutePath);
    return relativePath || absolutePath;
  } catch (error) {
    return absolutePath;
  }
};

const getBasename = (filePath) => {
  if (!filePath) {
    return '';
  }
  const parts = filePath.split(path.sep);
  return parts[parts.length - 1];
};

const getDirPath = (filePath) => {
  const parts = filePath.split(path.sep);
  parts.pop();
  return parts.join(path.sep);
};

const getAbsoluteFilePath = (filePath, collectionPath) => {
  return brunoPath.resolve(collectionPath, filePath);
};

export default brunoPath;
export { getRelativePath, getBasename, getDirPath, getAbsoluteFilePath };
