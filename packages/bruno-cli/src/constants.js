const { version } = require('../package.json');

const CLI_EPILOGUE = `Documentation: https://docs.usebruno.com (v${version})`;
const CLI_VERSION = version;

// Exit codes
// One or more assertions, tests, or requests failed
const EXIT_STATUS_ERROR_FAILED_COLLECTION = 1;

// The specified output dir does not exist
const EXIT_STATUS_ERROR_MISSING_OUTPUT_DIR = 2;

// request chain caused an endless loop
const EXIT_STATUS_ERROR_INFINTE_LOOP = 3;

// bru was called outside of a collection root
const EXIT_STATUS_ERROR_NOT_IN_COLLECTION = 4;

// The specified file was not found
const EXIT_STATUS_ERROR_FILE_NOT_FOUND = 5;

// The specified environment was not found
const EXIT_STATUS_ERROR_ENV_NOT_FOUND = 6;

// Environment override not presented as string or object
const EXIT_STATUS_ERROR_MALFORMED_ENV_OVERRIDE = 7;

// Environment overrides format incorrect
const EXIT_STATUS_ERROR_INCORRECT_ENV_OVERRIDE = 8;

// Invalid output format requested
const EXIT_STATUS_ERROR_INCORRECT_OUTPUT_FORMAT = 9;

// Everything else
const EXIT_STATUS_ERROR_GENERIC = 255;

module.exports = {
  CLI_EPILOGUE,
  CLI_VERSION,
  EXIT_STATUS_ERROR_FAILED_COLLECTION,
  EXIT_STATUS_ERROR_MISSING_OUTPUT_DIR,
  EXIT_STATUS_ERROR_INFINTE_LOOP,
  EXIT_STATUS_ERROR_NOT_IN_COLLECTION,
  EXIT_STATUS_ERROR_FILE_NOT_FOUND,
  EXIT_STATUS_ERROR_ENV_NOT_FOUND,
  EXIT_STATUS_ERROR_MALFORMED_ENV_OVERRIDE,
  EXIT_STATUS_ERROR_INCORRECT_ENV_OVERRIDE,
  EXIT_STATUS_ERROR_INCORRECT_OUTPUT_FORMAT,
  EXIT_STATUS_ERROR_GENERIC
};
