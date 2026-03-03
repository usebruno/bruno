/**
 * Shell Environment Utility
 *
 * Fetches environment variables from the user's shell configuration files (e.g., .zshenv, .bashrc)
 */

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
  Object.assign(process.env, shellEnvVars);
  return shellEnvVars;
};
