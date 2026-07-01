const { EXIT_STATUS } = require('../constants');

const ERROR_NAMES = Object.freeze({
  [EXIT_STATUS.ERROR_FAILED_COLLECTION]: 'run_failed',
  [EXIT_STATUS.ERROR_MISSING_OUTPUT_DIR]: 'output_dir_missing',
  [EXIT_STATUS.ERROR_INFINITE_LOOP]: 'request_loop',
  [EXIT_STATUS.ERROR_NOT_IN_COLLECTION]: 'not_in_collection',
  [EXIT_STATUS.ERROR_FILE_NOT_FOUND]: 'input_not_found',
  [EXIT_STATUS.ERROR_ENV_NOT_FOUND]: 'env_not_found',
  [EXIT_STATUS.ERROR_MALFORMED_ENV_OVERRIDE]: 'env_override_invalid_type',
  [EXIT_STATUS.ERROR_INCORRECT_ENV_OVERRIDE]: 'env_override_malformed',
  [EXIT_STATUS.ERROR_INCORRECT_OUTPUT_FORMAT]: 'invalid_output_format',
  [EXIT_STATUS.ERROR_INVALID_FILE]: 'invalid_file',
  [EXIT_STATUS.ERROR_WORKSPACE_NOT_FOUND]: 'workspace_not_found',
  [EXIT_STATUS.ERROR_GLOBAL_ENV_REQUIRES_WORKSPACE]: 'global_env_requires_workspace',
  [EXIT_STATUS.ERROR_GLOBAL_ENV_NOT_FOUND]: 'global_env_not_found',
  [EXIT_STATUS.ERROR_GENERIC]: 'internal_error'
});

const nameForCode = (code) => ERROR_NAMES[code] || 'internal_error';

module.exports = {
  ERROR_NAMES,
  nameForCode
};
