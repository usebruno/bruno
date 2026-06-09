const { spawn } = require('child_process');

// npm package name grammar (scoped + unscoped). Conservative enough to prevent
// shell-metachar smuggling even though spawn() runs without a shell.
const NPM_NAME_REGEX = /^(?:@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/i;

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // npm installs can legitimately take minutes
const DEFAULT_MAX_OUTPUT_BYTES = 1024 * 1024; // bound captured stdout/stderr

const isValidNpmPackageName = (name) => typeof name === 'string' && NPM_NAME_REGEX.test(name);

// Keep only the trailing `cap` bytes - npm surfaces the actionable error at the
// end of its output, so the tail is what we want to show the user.
const appendCapped = (buffer, chunk, cap) => {
  const next = buffer + chunk;
  return next.length > cap ? next.slice(next.length - cap) : next;
};

/**
 * Runs `npm install --save <packages>` in a collection directory and resolves
 * with a structured result. Never rejects - runtime failures (non-zero exit,
 * npm-not-found, timeout) come back as `{ success: false, ... }` so callers
 * can surface a useful message.
 *
 * `spawnFn` and `timeoutMs` are injectable for testing.
 *
 * @returns {Promise<{ success: boolean, exitCode: number, stdout: string,
 *   stderr: string, installed: string[], errorCode?: string }>}
 */
const runNpmInstall = ({
  collectionPath,
  packages,
  spawnFn = spawn,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES,
  npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
}) => {
  const installed = Array.from(new Set(packages));
  const args = ['install', '--save', ...installed];

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timer = null;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve({ stdout, stderr, installed, ...result });
    };

    let child;
    try {
      child = spawnFn(npmCommand, args, { cwd: collectionPath, env: process.env, shell: false });
    } catch (err) {
      finish({ success: false, exitCode: -1, stderr: err.message, errorCode: 'SPAWN_FAILED' });
      return;
    }

    timer = setTimeout(() => {
      try {
        child.kill();
      } catch {
        // ignore - process may have already exited
      }
      finish({
        success: false,
        exitCode: -1,
        errorCode: 'TIMEOUT',
        stderr: `${stderr}\nnpm install timed out after ${Math.round(timeoutMs / 1000)}s.`
      });
    }, timeoutMs);

    child.stdout?.on('data', (chunk) => {
      stdout = appendCapped(stdout, chunk.toString(), maxOutputBytes);
    });
    child.stderr?.on('data', (chunk) => {
      stderr = appendCapped(stderr, chunk.toString(), maxOutputBytes);
    });

    child.on('error', (err) => {
      const isMissingNpm = err.code === 'ENOENT';
      finish({
        success: false,
        exitCode: -1,
        errorCode: isMissingNpm ? 'NPM_NOT_FOUND' : 'SPAWN_ERROR',
        stderr: isMissingNpm
          ? 'npm was not found on your PATH. Install Node.js/npm, then try again or run the command manually.'
          : `${stderr}\n${err.message}`
      });
    });

    child.on('close', (code) => {
      finish({ success: code === 0, exitCode: code });
    });
  });
};

module.exports = {
  isValidNpmPackageName,
  runNpmInstall,
  NPM_NAME_REGEX,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_MAX_OUTPUT_BYTES
};
