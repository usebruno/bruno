/**
 * Custom error class for Bruno Runner that carries exit status codes
 */
class BrunoError extends Error {
  constructor(message, exitCode = null) {
    super(message);
    this.name = 'BrunoError';
    this.exitCode = exitCode;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BrunoError);
    }
  }
}

module.exports = {
  BrunoError
};