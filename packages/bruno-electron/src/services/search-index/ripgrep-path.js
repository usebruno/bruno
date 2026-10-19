const path = require('node:path');
const { createRequire } = require('node:module');

const resolvePackageRoot = () => {
  const anchorPaths = [
    path.join(__dirname, '../../../package.json'),
    path.join(__dirname, '../../../../package.json')
  ];
  for (const anchor of anchorPaths) {
    try {
      const req = createRequire(anchor);
      const entry = req.resolve('@vscode/ripgrep-universal');
      return path.dirname(path.dirname(entry));
    } catch (_) {
      // try the next install layout (workspace hoisting vs package-local)
    }
  }
  throw new Error('Could not resolve @vscode/ripgrep-universal');
};

const packageRoot = resolvePackageRoot();

const unpackAsarPath = (filePath) => {
  if (!filePath || typeof filePath !== 'string') return filePath;
  return filePath.replace('app.asar', 'app.asar.unpacked');
};

const binPathFor = ({ os, arch }) => {
  const binaryName = os === 'win32' ? 'rg.exe' : 'rg';
  return path.join(packageRoot, 'bin', `${os}-${arch}`, binaryName);
};

const getRipgrepPath = () => {
  const arch = process.env.npm_config_arch || process.arch;
  return unpackAsarPath(binPathFor({ os: process.platform, arch }));
};

module.exports = { getRipgrepPath, unpackAsarPath, binPathFor };
