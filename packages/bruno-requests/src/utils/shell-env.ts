/**
 * Shell Environment Utility
 *
 * Fetches environment variables from the user's shell configuration files (e.g., .zshenv, .bashrc)
 */

import path from 'path';

export const PROXY_ENV_KEYS = [
  'http_proxy',
  'HTTP_PROXY',
  'https_proxy',
  'HTTPS_PROXY',
  'no_proxy',
  'NO_PROXY',
  'all_proxy',
  'ALL_PROXY'
] as const;

const fetchShellEnv = async (): Promise<Record<string, string>> => {
  // Windows handles environment variables differently - skip
  if (process.platform === 'win32') {
    return {};
  }

  try {
    // shell-env is ESM-only, so we use dynamic import
    const { shellEnv } = await import('shell-env');
    const env = await shellEnv();
    return env;
  } catch (error) {
    return {};
  }
};

/**
 * Initializes process.env with shell environment variables.
 * Should be called early in the app startup.
 *
 * @returns The fetched shell environment variables
 */
export const initializeShellEnv = async (): Promise<Record<string, string>> => {
  const shellEnvVars = await fetchShellEnv();
  for (const [key, value] of Object.entries(shellEnvVars)) {
    if (key === 'PATH' && process.env.PATH) {
      process.env.PATH = `${value}${path.delimiter}${process.env.PATH}`;
    } else if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
  return shellEnvVars;
};

/**
 * Like fetchShellEnv, but surfaces subprocess failure by returning null instead
 * of an empty object. Lets refreshShellEnvProxyVars tell "shell-env failed" apart
 * from "shell-env succeeded but has no proxy vars", so it can restore prior values
 * on failure rather than leave the user unproxied.
 */
const tryFetchShellEnv = async (): Promise<Record<string, string> | null> => {
  if (process.platform === 'win32') {
    return {};
  }

  try {
    const { shellEnv } = await import('shell-env');
    return await shellEnv();
  } catch (error) {
    return null;
  }
};

/**
 * Re-syncs proxy-related process.env values from the user's shell configuration.
 * Used when refreshing system proxy settings without restarting the app.
 *
 * @returns The fetched shell environment variables
 */
export const refreshShellEnvProxyVars = async (): Promise<Record<string, string>> => {
  // fetchShellEnv is a no-op on Windows, so running the delete-first flow here
  // would strip process.env proxy vars (registry-propagated, launcher-set, or inherited
  // from the parent shell) without any means to restore them. Preserve the additive-only
  // invariant that initializeShellEnv maintains on Windows.
  if (process.platform === 'win32') {
    return {};
  }

  // Snapshot and clear stale proxy vars first so shell-env does not inherit them
  // into the login shell subprocess (removed .zshrc exports would otherwise persist).
  const snapshot: Record<string, string | undefined> = {};
  for (const key of PROXY_ENV_KEYS) {
    snapshot[key] = process.env[key];
    delete process.env[key];
  }

  const shellEnvVars = await tryFetchShellEnv();

  if (shellEnvVars === null) {
    // Subprocess failed — restore prior values rather than leave the user unproxied.
    for (const key of PROXY_ENV_KEYS) {
      if (snapshot[key] !== undefined) {
        process.env[key] = snapshot[key] as string;
      }
    }
    return {};
  }

  for (const key of PROXY_ENV_KEYS) {
    const value = shellEnvVars[key];
    if (value) {
      process.env[key] = value;
    }
  }

  return shellEnvVars;
};
