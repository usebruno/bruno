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
 * Re-syncs proxy-related process.env values from the user's shell configuration.
 * Used when refreshing system proxy settings without restarting the app.
 *
 * @returns The fetched shell environment variables
 */
export const refreshShellEnvProxyVars = async (): Promise<Record<string, string>> => {
  // Clear stale proxy vars first so shell-env does not inherit them into the
  // login shell subprocess (removed .zshrc exports would otherwise persist).
  for (const key of PROXY_ENV_KEYS) {
    delete process.env[key];
  }

  const shellEnvVars = await fetchShellEnv();

  for (const key of PROXY_ENV_KEYS) {
    const value = shellEnvVars[key];
    if (value) {
      process.env[key] = value;
    }
  }

  return shellEnvVars;
};
