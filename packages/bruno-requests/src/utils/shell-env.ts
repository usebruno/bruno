/**
 * Shell Environment Utility
 *
 * Fetches environment variables from the user's shell configuration files (e.g., .zshenv, .bashrc)
 */

import path from 'path';

export const fetchShellEnv = async (): Promise<Record<string, string> | null> => {
  // Windows handles environment variables differently - skip
  // everything related to windows proxy settings is handled by the system proxy resolver i.e getSystemProxy()
  if (process.platform === 'win32') {
    return {};
  }

  try {
    // shell-env is ESM-only, so we use dynamic import
    const { shellEnv } = await import('shell-env');
    const env = await shellEnv();
    return env;
  } catch (error) {
    return null;
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

  if (shellEnvVars === null) {
    return {};
  }

  for (const [key, value] of Object.entries(shellEnvVars)) {
    if (key === 'PATH' && process.env.PATH) {
      process.env.PATH = `${value}${path.delimiter}${process.env.PATH}`;
    } else if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
  return shellEnvVars;
};
