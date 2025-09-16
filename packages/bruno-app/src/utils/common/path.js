import platform from 'platform';
import path from 'path';

const isWindowsOS = () => {
    const os = platform.os;
    const osFamily = os.family.toLowerCase();
    return osFamily.includes('windows');
};

const brunoPath = isWindowsOS() ? path.win32 : path.posix;

const getRelativePath = (toPath, fromPath) => {
  try {
    const relativePath = brunoPath.relative(fromPath, toPath);
    
    if(relativePath === '') {
      return '.';
    }

    return relativePath || toPath;
  } catch (error) {
    return toPath;
  }
};

const getBasename = (relativePath, fromPath) => {
  if (!relativePath) {
    return '';
  }

  console.log('relativePath', relativePath);
  console.log('fromPath', fromPath);

  const resolvedPath = brunoPath.resolve(fromPath, relativePath);
  const basename = brunoPath.basename(resolvedPath);

  return basename;
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
