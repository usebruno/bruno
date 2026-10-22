/**
 * Pure local-script registry logic shared by the renderer, the Electron main
 * process and the CLI. Local scripts register shell commands that are
 * referenced through `{{$script:name}}`; the command output resolves the
 * variable at request time.
 *
 * Everything in this module is platform-neutral: command execution and the
 * on-disk registry live in @usebruno/requests (Node only).
 */

export const LOCAL_SCRIPT_VAR_PREFIX = '$script:';
export const LOCAL_SCRIPT_NAME_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9._-]*$/;

export type LocalScript = {
  name: string;
  command: string;
  timeout?: number;
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
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
};

/**
 * Validate and de-duplicate a `localScripts.commands` list.
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

/**
 * Merge script registries in priority order: entries from later configs win on
 * duplicate names. Used to combine the global registry with a collection's
 * legacy brunoConfig.localScripts block.
 */
export const mergeLocalScriptsConfigs = (...configs: unknown[]): { commands: LocalScript[] } => {
  const byName = new Map<string, LocalScript>();
  for (const config of configs) {
    for (const script of normalizeLocalScripts(config)) {
      byName.set(script.name, script);
    }
  }
  return { commands: [...byName.values()] };
};
