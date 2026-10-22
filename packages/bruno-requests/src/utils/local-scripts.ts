import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import process from 'node:process';
import {
  LocalScript,
  LocalScriptError,
  LOCAL_SCRIPT_NAME_PATTERN,
  LOCAL_SCRIPT_VAR_PREFIX,
  mergeLocalScriptsConfigs
} from '@usebruno/common/utils';

export {
  LocalScriptError,
  LOCAL_SCRIPT_NAME_PATTERN,
  LOCAL_SCRIPT_VAR_PREFIX,
  normalizeLocalScripts,
  mergeLocalScriptsConfigs
} from '@usebruno/common/utils';
export type { LocalScript } from '@usebruno/common/utils';

/**
 * Local scripts register shell commands and reference their output through
 * variables via `{{$script:name}}`. Commands are normally registered globally
 * (see local-scripts-store.ts); a collection's bruno.json `localScripts` block
 * is still honored for backward compatibility.
 *
 * Commands run on the host machine (never inside the request sandbox), so the
 * host is responsible for gating execution behind an explicit opt-in.
 */

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const LOCAL_SCRIPT_VAR_PATTERN = new RegExp(
  `\\{\\{${escapeRegExp(LOCAL_SCRIPT_VAR_PREFIX)}(${LOCAL_SCRIPT_NAME_PATTERN.source.replace(/^\^|\$$/g, '')})\\}\\}`,
  'g'
);
const DEFAULT_TIMEOUT_MS = 30000;
const MAX_OUTPUT_BYTES = 1024 * 1024;
const ERROR_STDERR_LIMIT = 2000;

/**
 * Environment variables that control command resolution, interpreter startup
 * or the dynamic loader. They can arrive through collection-provided sources
 * (selected bruno environment / dotenv), and a shared collection must not be
 * able to hijack a command the user registered — e.g.
 * `NODE_OPTIONS=--require ./evil.js`, a rewritten `PATH`, or
 * `DYLD_INSERT_LIBRARIES`. Values for these keys from the collection context
 * are dropped; the real values inherited from process.env remain.
 */
const isProtectedEnvKey = (key: string): boolean => {
  const upper = key.toUpperCase();
  return upper === 'NODE_OPTIONS'
    || upper === 'PATH'
    || upper.startsWith('LD_')
    || upper.startsWith('DYLD_');
};

export type LocalScriptResult = {
  name: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: string | null;
  duration: number;
};

export type LocalScriptExecutionContext = {
  cwd: string;
  /** Extra environment variables merged on top of process.env for the child process. */
  env?: Record<string, unknown>;
  /** Aborts the child process when the request is cancelled. */
  signal?: AbortSignal;
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  // Class instances (Buffer, stream, typed arrays, …) carry no string fields
  // worth scanning and can be expensive to walk byte by byte.
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
};

const killProcessTree = (child: ChildProcessWithoutNullStreams, onWindows: boolean) => {
  const pid = child.pid;
  if (!pid || child.killed || child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  if (onWindows) {
    // shell: true wraps the command in cmd.exe, so the child pid is the shell.
    // /T kills the whole process tree it spawned.
    spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true });
  } else {
    try {
      process.kill(-pid, 'SIGKILL');
    } catch {
      child.kill('SIGKILL');
    }
  }
};

/**
 * Run one registered command through the system shell in the given working
 * directory (the collection directory for request execution, the home
 * directory for manual test runs). Resolves with trimmed stdout, rejects on
 * non-zero exit, timeout or abort — the trailing newline strip mirrors shell
 * command substitution (`$(...)`).
 */
export const executeLocalScript = (script: LocalScript, context: LocalScriptExecutionContext): Promise<LocalScriptResult> => {
  const timeout = typeof script.timeout === 'number' && script.timeout > 0 ? script.timeout : DEFAULT_TIMEOUT_MS;
  const onWindows = process.platform === 'win32';
  const childEnv: Record<string, string | undefined> = { ...process.env };
  if (context.env) {
    for (const [key, value] of Object.entries(context.env)) {
      if (value === undefined || value === null) continue;
      if (isProtectedEnvKey(key)) continue;
      childEnv[key] = typeof value === 'string' ? value : String(value);
    }
  }

  return new Promise<LocalScriptResult>((resolve, reject) => {
    let settled = false;
    let stdoutBytes = Buffer.alloc(0);
    let stderrBytes = Buffer.alloc(0);
    let outputTruncated = false;
    let timedOut = false;
    const startedAt = Date.now();

    let child: ChildProcessWithoutNullStreams;
    try {
      child = spawn(script.command, {
        shell: true,
        cwd: context.cwd,
        env: childEnv,
        windowsHide: true,
        // A new process group on POSIX lets us kill the shell together with
        // whatever it spawned.
        detached: !onWindows
      });
    } catch (error) {
      reject(new LocalScriptError(`Failed to launch local script "${script.name}": ${(error as Error).message}`, {
        name: script.name
      }));
      return;
    }

    const fail = (message: string, extra?: { exitCode?: number | null; timedOut?: boolean }) => {
      if (settled) return;
      settled = true;
      killProcessTree(child, onWindows);
      cleanup();
      reject(
        new LocalScriptError(message, {
          name: script.name,
          stderr: stderrBytes.toString('utf8', 0, ERROR_STDERR_LIMIT),
          exitCode: extra?.exitCode,
          timedOut: extra?.timedOut
        })
      );
    };

    const appendOutput = (buffer: Buffer, chunk: Buffer): { buffer: Buffer; truncated: boolean } => {
      if (buffer.length >= MAX_OUTPUT_BYTES) {
        return { buffer, truncated: true };
      }
      const remaining = MAX_OUTPUT_BYTES - buffer.length;
      if (chunk.length > remaining) {
        return { buffer: Buffer.concat([buffer, chunk.subarray(0, remaining)]), truncated: true };
      }
      return { buffer: Buffer.concat([buffer, chunk]), truncated: false };
    };

    child.stdout?.on('data', (chunk: Buffer) => {
      const result = appendOutput(stdoutBytes, chunk);
      stdoutBytes = result.buffer;
      if (result.truncated && !outputTruncated) {
        outputTruncated = true;
        fail(`Local script "${script.name}" exceeded the ${MAX_OUTPUT_BYTES} byte output limit`);
      }
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      const result = appendOutput(stderrBytes, chunk);
      stderrBytes = result.buffer;
      if (result.truncated && !outputTruncated) {
        outputTruncated = true;
        fail(`Local script "${script.name}" exceeded the ${MAX_OUTPUT_BYTES} byte output limit`);
      }
    });

    const timer = setTimeout(() => {
      timedOut = true;
      killProcessTree(child, onWindows);
      fail(`Local script "${script.name}" timed out after ${timeout} ms`, { timedOut: true });
    }, timeout);

    const onAbort = () => {
      killProcessTree(child, onWindows);
      fail(`Local script "${script.name}" was cancelled`);
    };
    context.signal?.addEventListener('abort', onAbort, { once: true });
    // The abort may have fired in the gap before the listener was attached.
    if (context.signal?.aborted) {
      onAbort();
    }

    function cleanup() {
      clearTimeout(timer);
      context.signal?.removeEventListener('abort', onAbort);
    }

    child.on('error', (error) => {
      fail(`Local script "${script.name}" failed to start: ${error.message}`);
    });

    child.on('close', (exitCode, signal) => {
      if (settled) return;
      cleanup();

      if (exitCode !== 0) {
        const stderr = stderrBytes.toString('utf8', 0, ERROR_STDERR_LIMIT);
        const reason = timedOut ? `timed out after ${timeout} ms` : `exited with code ${exitCode}`;
        settled = true;
        reject(
          new LocalScriptError(
            `Local script "${script.name}" ${reason}${stderr ? `: ${stderr.trim()}` : ''}`,
            { name: script.name, stderr, exitCode, timedOut }
          )
        );
        return;
      }

      settled = true;
      // Shell command substitution strips trailing newlines; match that so
      // token values don't carry an accidental CRLF.
      const stdout = stdoutBytes.toString('utf8').replace(/[\r\n]+$/, '');
      resolve({
        name: script.name,
        stdout,
        stderr: stderrBytes.toString('utf8'),
        exitCode,
        signal,
        duration: Date.now() - startedAt
      });
    });
  });
};

/** Collect the distinct `{{$script:name}}` references found inside a (possibly nested) value. */
export const collectLocalScriptRefs = (value: unknown): string[] => {
  const names = new Set<string>();

  const walk = (input: unknown) => {
    if (typeof input === 'string') {
      const matches = input.matchAll(new RegExp(LOCAL_SCRIPT_VAR_PATTERN.source, 'g'));
      for (const match of matches) {
        names.add(match[1]);
      }
    } else if (Array.isArray(input)) {
      input.forEach(walk);
    } else if (isPlainRecord(input)) {
      Object.values(input).forEach(walk);
    }
  };

  walk(value);
  return [...names];
};

const replaceScriptRefs = (value: unknown, outputs: Map<string, string>): unknown => {
  if (typeof value === 'string') {
    return value.replace(new RegExp(LOCAL_SCRIPT_VAR_PATTERN.source, 'g'), (match, name) => {
      return outputs.has(name) ? outputs.get(name)! : match;
    });
  }
  if (Array.isArray(value)) {
    return value.map((item) => replaceScriptRefs(item, outputs));
  }
  if (isPlainRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceScriptRefs(item, outputs)]));
  }
  return value;
};

/**
 * Scalar environment variables are exposed to the child process so a token
 * command can use the collection's credentials. Non-string values are
 * stringified; objects/arrays can't map to env vars and are skipped.
 */
const toScalarEnv = (envVars: Record<string, unknown>): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(envVars)) {
    if (key === '__name__') continue;
    // Injected script outputs are interpolation variables, not shell exports
    // (their names contain ':' and would be invalid on Windows anyway).
    if (key.startsWith(LOCAL_SCRIPT_VAR_PREFIX)) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      result[key] = String(value);
    }
  }
  return result;
};

export type ResolveLocalScriptVariablesOptions = {
  envVars: Record<string, unknown> | null | undefined;
  /** Distinct names found by collectLocalScriptRefs over envVars and the request. */
  referencedNames: string[];
  /** Registries in priority order (global file, then legacy collection config); later entries win. */
  scriptsConfigs: unknown[];
  context: LocalScriptExecutionContext;
};

export type ResolveLocalScriptVariablesResult = {
  /** Copy of envVars with script references inside values replaced. */
  envVars: Record<string, unknown>;
  /** Outputs keyed by interpolation name (`$script:name`), to merge into the request's interpolation variables. */
  scriptVariables: Record<string, string>;
};

/**
 * Run every referenced local command once and substitute its output:
 * references nested inside environment-variable values are replaced here
 * (interpolation is single-pass, so they would never resolve themselves),
 * while outputs keyed `$script:name` let the regular interpolation pass
 * resolve direct references anywhere in the request.
 */
export const resolveLocalScriptVariables = async (
  options: ResolveLocalScriptVariablesOptions
): Promise<ResolveLocalScriptVariablesResult> => {
  const { referencedNames, scriptsConfigs, context } = options;
  const envVars = options.envVars && typeof options.envVars === 'object' ? options.envVars : {};

  const scripts = mergeLocalScriptsConfigs(...scriptsConfigs).commands;
  const byName = new Map(scripts.map((script) => [script.name, script]));
  const unknown = referencedNames.filter((name) => !byName.has(name));
  if (unknown.length > 0) {
    throw new LocalScriptError(
      `Variables reference local scripts that are not registered: ${unknown.join(', ')}. `
      + 'Register them in Local Scripts (or in the collection\'s bruno.json).',
      { name: unknown[0] }
    );
  }

  const outputs = new Map<string, string>();
  // Explicit context env (e.g. the collection's dotenv) wins over scalar
  // bruno environment variables.
  const childContext: LocalScriptExecutionContext = {
    ...context,
    env: { ...toScalarEnv(envVars), ...(context.env || {}) }
  };
  await Promise.all(
    referencedNames.map((name) =>
      executeLocalScript(byName.get(name)!, childContext).then((result) => {
        outputs.set(name, result.stdout);
      })
    )
  );

  const scriptVariables: Record<string, string> = {};
  for (const [name, stdout] of outputs) {
    scriptVariables[`${LOCAL_SCRIPT_VAR_PREFIX}${name}`] = stdout;
  }

  return {
    envVars: replaceScriptRefs(envVars, outputs) as Record<string, unknown>,
    scriptVariables
  };
};

/**
 * Merge resolved script outputs into the shared runtime env-var object and
 * return a rollback that undoes the merge. Runners (folder runner, `bru run`)
 * share one env-var object across sequential requests, while script outputs
 * are request-scoped: without rollback, request A's token would leak into
 * request B, and a template pre-substituted with it would suppress a fresh
 * command run. A key the request scripts explicitly overwrote via
 * bru.setEnvVar is left as-is.
 */
export const mergeLocalScriptOutputs = (
  envVars: Record<string, unknown>,
  resolvedEnvVars: Record<string, unknown>,
  scriptVariables: Record<string, string>
): (() => void) => {
  const added: string[] = [];
  const replaced: Array<{ key: string; original: unknown; resolved: unknown }> = [];
  for (const [key, value] of Object.entries({ ...resolvedEnvVars, ...scriptVariables })) {
    if (Object.prototype.hasOwnProperty.call(envVars, key)) {
      if (envVars[key] !== value) {
        replaced.push({ key, original: envVars[key], resolved: value });
      }
    } else {
      added.push(key);
    }
    envVars[key] = value;
  }
  return () => {
    for (const key of added) {
      delete envVars[key];
    }
    for (const { key, original, resolved } of replaced) {
      if (envVars[key] === resolved) {
        envVars[key] = original;
      }
    }
  };
};
