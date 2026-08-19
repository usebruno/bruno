const chalk = require('chalk');
const { initializeShellEnv } = require('@usebruno/requests');

/**
 * Reading the shell environment starts the user's login shell to pick up PATH and proxy variables
 * that a GUI app or cron job would not otherwise pass down. On POSIX systems that costs roughly half
 * a second; on Windows there is nothing to read and it returns immediately. Only the commands that
 * actually need those variables ask for it, so `--version` and `--help` no longer pay for it.
 *
 * It is best-effort: if the shell fails, takes too long, or the user opted out, the command carries
 * on with the environment it already has.
 */

// Matches the guard bruno-electron uses in src/store/shell-env-state.js. This frees the command to
// get on with its work, but it cannot cancel a shell that is already running: a shell wedged on
// input can still delay process exit, and can still add variables after the command has read them.
const TIMEOUT_MS = 60_000;

// For callers that run bru repeatedly as a subprocess and already pass down a complete environment,
// where starting a shell is pure per-invocation latency.
const isDisabled = () => {
  const value = process.env.BRU_NO_SHELL_ENV;
  return value !== undefined && value !== '' && value !== '0' && value !== 'false';
};

const applyShellEnv = () => {
  if (isDisabled()) {
    return Promise.resolve();
  }

  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Shell environment initialization timed out')), TIMEOUT_MS);
  });

  // The variables land on process.env, so callers only need to know the work is done.
  return Promise.race([initializeShellEnv(), timeout])
    .then(() => undefined)
    .catch((err) => {
      console.error(chalk.yellow(`Warning: could not read the shell environment (${err.message}). Continuing.`));
    })
    .finally(() => clearTimeout(timer));
};

/** @type {null | Promise<void>} */
let shellEnvPromise = null;

/**
 * Resolves once the shell environment has been applied to process.env, or given up on. Safe to call
 * repeatedly; the shell is only ever started once per process.
 */
const ensureShellEnv = () => {
  if (!shellEnvPromise) {
    shellEnvPromise = applyShellEnv();
  }
  return shellEnvPromise;
};

module.exports = {
  ensureShellEnv,
  TIMEOUT_MS
};
