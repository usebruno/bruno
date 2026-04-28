const path = require('path');
const { spawn } = require('child_process');

/**
 * Returns true only if scriptFile resolves to a path inside collectionPath.
 * Prevents traversal attacks via `../` sequences or absolute paths that escape
 * the collection directory. The path.sep suffix in the prefix check ensures a
 * sibling directory that shares a name prefix (e.g. /col vs /col-extra) is not
 * mistakenly accepted.
 */
function isScriptPathSafe(collectionPath, scriptFile) {
  const resolvedCollection = path.resolve(collectionPath);
  const resolvedScript = path.resolve(collectionPath, scriptFile);
  return resolvedScript === resolvedCollection || resolvedScript.startsWith(resolvedCollection + path.sep);
}

/**
 * Parses KEY=VALUE pairs from shell script stdout.
 * Supports both plain `KEY=VALUE` and `export KEY=VALUE` syntax.
 * Only the first `=` is treated as the delimiter; values may contain `=`.
 * Blank lines and comment lines are ignored.
 */
function parseEnvVarsFromOutput(output) {
  const vars = {};
  for (const line of output.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match) {
      vars[match[1]] = match[2];
    }
  }
  return vars;
}

/**
 * Spawns a registered collection script and resolves with its exit code and
 * captured stdout/stderr. The script is executed directly so its shebang line
 * determines the interpreter (e.g. #!/bin/bash, #!/usr/bin/env node).
 *
 * Optional `onStdout` and `onStderr` callbacks receive incremental chunks as
 * they arrive, so callers can stream output to the UI while the script is
 * still running. Each chunk is also accumulated into the resolved value.
 *
 * Callers are responsible for the security check (isScriptPathSafe) before calling this.
 */
function runShellScript(collectionPath, scriptFile, { onStdout, onStderr } = {}) {
  return new Promise((resolve, reject) => {
    const resolvedScript = path.resolve(collectionPath, scriptFile);
    const proc = spawn(resolvedScript, [], { cwd: collectionPath, env: process.env });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => {
      const chunk = d.toString();
      stdout += chunk;
      onStdout?.(chunk);
    });
    proc.stderr.on('data', (d) => {
      const chunk = d.toString();
      stderr += chunk;
      onStderr?.(chunk);
    });
    proc.on('close', (exitCode) => resolve({ exitCode, stdout, stderr }));
    proc.on('error', (err) => {
      if (err.code === 'EACCES') {
        reject(new Error(`Script is not executable. Run: chmod +x ${scriptFile}`));
      } else {
        reject(err);
      }
    });
  });
}

module.exports = { isScriptPathSafe, parseEnvVarsFromOutput, runShellScript };
