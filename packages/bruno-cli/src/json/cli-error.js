const { EXIT_STATUS } = require('../constants');
const { nameForCode } = require('./error-names');

// Thrown by core handlers to signal a user-visible failure (missing file, bad
// payload, etc.). The yargs wrapper catches and routes through writer.exitWithError;
// the serve dispatcher catches and emits an error envelope inline without exiting
// the whole process.
class CliError extends Error {
  constructor({ code = EXIT_STATUS.ERROR_GENERIC, name, message, details } = {}) {
    super(message || name || 'cli_error');
    this.code = code;
    this.name = name || nameForCode(code);
    if (details !== undefined) this.details = details;
  }
}

module.exports = { CliError };
