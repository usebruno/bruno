const { version } = require('../package.json');

const CLI_EPILOGUE = `Documentation: https://docs.usebruno.com (v${version})`;
const CLI_VERSION = version;

module.exports = {
  CLI_EPILOGUE,
  CLI_VERSION
};
