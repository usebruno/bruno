const { version } = require('../package.json');

const CLI_EPILOGUE = `Documentation: https://docs.usebruno.com (v${version})`;
const CLI_VERSION = version;

// Exit codes
const EXIT_STATUS = {
  // One or more assertions, tests, or requests failed
  ERROR_FAILED_COLLECTION: 1,
  // The specified output dir does not exist
  ERROR_MISSING_OUTPUT_DIR: 2,
  // request chain caused an endless loop
  ERROR_INFINTE_LOOP: 3,
  // bru was called outside of a collection root
  ERROR_NOT_IN_COLLECTION: 4,
  // The specified file was not found
  ERROR_FILE_NOT_FOUND: 5,
  // The specified environment was not found
  ERROR_ENV_NOT_FOUND: 6,
  // Environment override not presented as string or object
  ERROR_MALFORMED_ENV_OVERRIDE: 7,
  // Environment overrides format incorrect
  ERROR_INCORRECT_ENV_OVERRIDE: 8,
  // Invalid output format requested
  ERROR_INCORRECT_OUTPUT_FORMAT: 9,
  // Everything else
  ERROR_GENERIC: 255
};

module.exports = {
  CLI_EPILOGUE,
  CLI_VERSION,
  EXIT_STATUS
};
