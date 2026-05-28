const getIsRunningInRosetta = () => {
  const isMac = process.platform === 'darwin';
  const isArm64 = process.arch === 'arm64';

  if (!isMac) return false;
  if (isArm64) return false;

  const os = require('os');
  const isRunningOnSilicon = os.cpus().find((d) => d.model.includes('Apple'));
  if (!isRunningOnSilicon) {
    return false;
  }
  return true;
};

module.exports = {
  getIsRunningInRosetta
};
