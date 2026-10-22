import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import process from 'node:process';

/**
 * Local scripts let a collection register shell commands in bruno.json and
 * reference their output from environment variables via `{{$script:name}}`.
 *
 * Commands run on the host machine (never inside the request sandbox), so the
 * host is responsible for gating execution behind an explicit opt-in.
 */

export const LOCAL_SCRIPT_VAR_PATTERN = /\{\{\$script:([A-Za-z0-9_][A-Za-z0-9._-]*)\}\}/g;
export const LOCAL_SCRIPT_VAR_PREFIX = '$script:';
const LOCAL_SCRIPT_NAME_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9._-]*$/;
const DEFAULT_TIMEOUT_MS = 30000;
const MAX_OUTPUT_BYTES = 1024 * 1024;
const ERROR_STDERR_LIMIT = 2000;

export type LocalScript = {
  name: string;
  command: string;
  timeout?: number;
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

export class LocalScriptError extends Error {
  scriptName: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;

  constructor(message: string, details: { name: string; stderr?: string; exitCode?: number | null; timedOut?: boolean }) {
    super(message);
    this.name = 'LocalScriptError';
    this.scriptName = details.name;
    this.stderr = details.stderr || '';
    this.exitCode = details.exitCode === undefined ? null : details.exitCode;
    this.timedOut = details.timedOut === true;
  }
}

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  // Class instances (Buffer, stream, typed arrays, …) carry no string fields
  // worth scanning and can be expensive to walk byte by byte.
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
};

/**
 * Validate and de-duplicate the `localScripts.commands` list from bruno.json.
 * Later entries with the same name win, mirroring object-key semantics.
 */
export const normalizeLocalScripts = (config: unknown): LocalScript[] => {
  if (!isPlainRecord(config) || !Array.isArray(config.commands)) {
    return [];
  }

  const byName = new Map<string, LocalScript>();
  for (const entry of config.commands) {
    if (!isPlainRecord(entry)) {
      throw new LocalScriptError('Each local script entry must be an object with "name" and "command"', { name: '' });
    }
    const { name, command, timeout } = entry;
    if (typeof name !== 'string' || !LOCAL_SCRIPT_NAME_PATTERN.test(name)) {
      throw new LocalScriptError(
        `Invalid local script name "${String(name)}". Use letters, digits, "_", ".", "-" and start with a letter, digit or "_".`,
        { name: String(name) }
      );
    }
    if (typeof command !== 'string' || command.trim() === '') {
      throw new LocalScriptError(`Local script "${name}" is missing a command`, { name });
    }
    if (timeout !== undefined && (typeof timeout !== 'number' || timeout <= 0)) {
      throw new LocalScriptError(`Local script "${name}" has an invalid timeout (must be a positive number of ms)`, { name });
    }
    byName.set(name, { name, command, timeout });
  }

  return [...byName.values()];
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
 * Run one registered command through the system shell with the collection
 * directory as cwd. Resolves with trimmed stdout, rejects on non-zero exit,
 * timeout or abort — the trailing newline strip mirrors shell command
 * substitution (`$(...)`).
 */
export const executeLocalScript = (script: LocalScript, context: LocalScriptExecutionContext): Promise<LocalScriptResult> => {
  const timeout = typeof script.timeout === 'number' && script.timeout > 0 ? script.timeout : DEFAULT_TIMEOUT_MS;
  const onWindows = process.platform === 'win32';
  const childEnv: Record<string, string | undefined> = { ...process.env };
  if (context.env) {
    for (const [key, value] of Object.entries(context.env)) {
      if (value === undefined || value === null) continue;
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

export type ResolveLocalScriptEnvVarsResult = {
  envVars: Record<string, unknown>;
  /** Outputs keyed by interpolation name (`$script:name`), to merge into the request's interpolation variables. */
  scriptVariables: Record<string, string>;
  results: LocalScriptResult[];
};

/**
 * Run every `{{$script:name}}` reference found among the environment variable
 * values or directly inside the request (url, headers, body, auth, …) once and
 * substitute the outputs. Variables without a reference are returned
 * untouched; each referenced command runs at most once even when the reference
 * appears in several places (or multiple times in one value).
 */
export const resolveLocalScriptEnvVars = async (
  envVars: Record<string, unknown> | null | undefined,
  scriptsConfig: unknown,
  context: LocalScriptExecutionContext,
  /** Additional value (typically the prepared request) scanned for direct references. */
  scanTarget?: unknown
): Promise<ResolveLocalScriptEnvVarsResult> => {
  if (!envVars || typeof envVars !== 'object') {
    return { envVars: { ...(envVars || {}) }, scriptVariables: {}, results: [] };
  }

  const scripts = normalizeLocalScripts(scriptsConfig);
  const referencedNames = [...new Set([...collectLocalScriptRefs(envVars), ...collectLocalScriptRefs(scanTarget)])];
  if (referencedNames.length === 0) {
    return { envVars: { ...envVars }, scriptVariables: {}, results: [] };
  }

  const byName = new Map(scripts.map((script) => [script.name, script]));
  const unknown = referencedNames.filter((name) => !byName.has(name));
  if (unknown.length > 0) {
    throw new LocalScriptError(
      `Variables reference local scripts that are not registered in bruno.json: ${unknown.join(', ')}`,
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
  const results = await Promise.all(
    referencedNames.map((name) =>
      executeLocalScript(byName.get(name)!, childContext).then((result) => {
        outputs.set(name, result.stdout);
        return result;
      })
    )
  );

  const scriptVariables: Record<string, string> = {};
  for (const [name, stdout] of outputs) {
    scriptVariables[`${LOCAL_SCRIPT_VAR_PREFIX}${name}`] = stdout;
  }

  return {
    envVars: replaceScriptRefs(envVars, outputs) as Record<string, unknown>,
    scriptVariables,
    results
  };
};
