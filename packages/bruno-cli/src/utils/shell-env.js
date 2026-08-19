const chalk = require('chalk');
const { fetchShellEnv, applyShellEnv } = require('@usebruno/requests');

/**
 * Reading the shell environment starts the user's login shell to pick up PATH and proxy variables
 * that a GUI app or cron job would not otherwise pass down. On POSIX systems that costs roughly half
 * a second; on Windows there is nothing to read and it returns immediately. Only the commands that
 * actually need those variables ask for it, so `--version` and `--help` no longer pay for it.
 *
 * It is best-effort: if the shell fails, takes too long, or the user opted out, the command carries
 * on with the environment it already has.
 */

// Matches the guard bruno-electron uses in src/store/shell-env-state.js. It cannot cancel a shell
// that is already running - shell-env exposes no signal or timeout - so a wedged shell can still
// delay process exit. It does bound how long the command waits, and because the merge happens only
// on the winning branch below, a result that arrives after the timeout is never applied.
const TIMEOUT_MS = 60_000;

// For callers that run bru repeatedly as a subprocess and already pass down a complete environment,
// where starting a shell is pure per-invocation latency.
const isDisabled = () => {
  const value = process.env.BRU_NO_SHELL_ENV;
  return value !== undefined && value !== '' && value !== '0' && value !== 'false';
};

const fetchAndApplyShellEnv = () => {
  if (isDisabled()) {
    return Promise.resolve();
  }

  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Shell environment initialization timed out')), TIMEOUT_MS);
  });

  // Fetching and applying are separate steps on purpose: if the timeout wins the race, the merge
  // below never runs, so a late-arriving environment cannot change PATH or proxy settings underneath
  // a run that has already read them.
  return Promise.race([fetchShellEnv(), timeout])
    .then((shellEnvVars) => {
      applyShellEnv(shellEnvVars);
    })
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
    shellEnvPromise = fetchAndApplyShellEnv();
  }
  return shellEnvPromise;
};

module.exports = {
  ensureShellEnv,
  TIMEOUT_MS
};
