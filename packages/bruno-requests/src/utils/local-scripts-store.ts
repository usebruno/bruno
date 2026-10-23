import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { LocalScriptError, normalizeLocalScripts, type LocalScript } from '@usebruno/common/utils';

/**
 * Global local scripts live outside any collection so they can be referenced
 * from every collection. The registry is a plain JSON file in the user's home
 * directory (`~/.bruno/local-scripts.json`) — a file instead of an
 * electron-store so the CLI can read the exact same registry without Electron.
 *
 * Shape: `{ "commands": [{ "name", "command", "timeout"? }] }`.
 */

export const GLOBAL_LOCAL_SCRIPTS_FILE_ENV = 'BRUNO_LOCAL_SCRIPTS_FILE';
const GLOBAL_LOCAL_SCRIPTS_DIR = '.bruno';
const GLOBAL_LOCAL_SCRIPTS_FILE = 'local-scripts.json';

export type GlobalLocalScriptsConfig = {
  commands: LocalScript[];
};

export type GlobalLocalScriptsFileOptions = {
  /** Overrides the registry location (CLI `--local-scripts`). */
  filePath?: string;
};

export const getGlobalLocalScriptsFilePath = (options: GlobalLocalScriptsFileOptions = {}): string => {
  if (typeof options.filePath === 'string' && options.filePath.trim() !== '') {
    return path.resolve(options.filePath);
  }
  const envPath = process.env[GLOBAL_LOCAL_SCRIPTS_FILE_ENV];
  if (envPath && envPath.trim() !== '') {
    return path.resolve(envPath);
  }
  return path.join(os.homedir(), GLOBAL_LOCAL_SCRIPTS_DIR, GLOBAL_LOCAL_SCRIPTS_FILE);
};

const isMissingFileError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 'ENOENT';

/**
 * Read and validate the global registry. A missing file is an empty registry;
 * a malformed file is an error so the user notices that commands will not run.
 */
export const loadGlobalLocalScriptsConfig = (options: GlobalLocalScriptsFileOptions = {}): GlobalLocalScriptsConfig => {
  const filePath = getGlobalLocalScriptsFilePath(options);
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    if (isMissingFileError(error)) {
      return { commands: [] };
    }
    throw new LocalScriptError(`Failed to read local scripts registry "${filePath}": ${(error as Error).message}`, {
      name: ''
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new LocalScriptError(`Local scripts registry "${filePath}" is not valid JSON: ${(error as Error).message}`, {
      name: ''
    });
  }

  return { commands: normalizeLocalScripts(parsed) };
};

/**
 * Validate and atomically persist the global registry. Commands may contain
 * secrets, so the file is written owner-only; the temp-file + rename avoids
 * readers observing a half-written file.
 */
export const saveGlobalLocalScriptsConfig = (
  config: unknown,
  options: GlobalLocalScriptsFileOptions = {}
): GlobalLocalScriptsConfig => {
  const normalized = { commands: normalizeLocalScripts(config) };
  const filePath = getGlobalLocalScriptsFilePath(options);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const tmpPath = `${filePath}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(tmpPath, `${JSON.stringify(normalized, null, 2)}\n`, { mode: 0o600 });
    fs.renameSync(tmpPath, filePath);
  } catch (error) {
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      // The write may have failed before the temp file was created.
    }
    throw new LocalScriptError(`Failed to write local scripts registry "${filePath}": ${(error as Error).message}`, {
      name: ''
    });
  }

  return normalized;
};
