const { app } = require('electron');
const { version: packageVersion } = require('../../package.json');

const getAppVersion = () => {
  return app?.getVersion?.() || packageVersion;
};

module.exports = {
  getAppVersion
};
