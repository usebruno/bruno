import { safeExec } from '../network/system-proxy/utils/common';

const SYSTEM_ENV_REGISTRY_KEY = 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment';
const USER_ENV_REGISTRY_KEY = 'HKCU\\Environment';

const REG_ENV_LINE = /^\s+(\S+)\s+(REG_SZ|REG_EXPAND_SZ)\s+(.+)$/;

/**
 * Parses `reg query` output for environment variable registry keys.
 */
export const parseRegEnvironmentOutput = (stdout: string): Record<string, string> => {
  const env: Record<string, string> = {};

  for (const line of stdout.split('\n')) {
    const match = line.match(REG_ENV_LINE);
    if (!match) continue;

    const [, name, , value] = match;
    env[name] = value.trim();
  }

  return env;
};

const expandRegistryEnv = (env: Record<string, string>): Record<string, string> => {
  const expanded = { ...env };
  let changed = true;
  let iterations = 0;

  while (changed && iterations < 10) {
    changed = false;
    iterations += 1;

    for (const [key, value] of Object.entries(expanded)) {
      const newValue = value.replace(/%([^%]+)%/g, (_, name: string) => {
        return expanded[name] ?? process.env[name] ?? `%${name}%`;
      });

      if (newValue !== value) {
        expanded[key] = newValue;
        changed = true;
      }
    }
  }

  return expanded;
};

/**
 * Reads user and system environment variables from the Windows registry.
 * GUI apps may not see vars set in System Properties until restart; this mirrors
 * what a new login session would pick up (similar to shell-env on Unix).
 */
export const fetchWindowsShellEnv = async (): Promise<Record<string, string>> => {
  const execOpts = {
    timeout: 10_000,
    windowsHide: true,
    maxBuffer: 1024 * 1024
  };

  const [systemStdout, userStdout] = await Promise.all([
    safeExec('reg', ['query', SYSTEM_ENV_REGISTRY_KEY], execOpts),
    safeExec('reg', ['query', USER_ENV_REGISTRY_KEY], execOpts)
  ]);

  const env = {
    ...parseRegEnvironmentOutput(systemStdout ?? ''),
    ...parseRegEnvironmentOutput(userStdout ?? '')
  };

  return expandRegistryEnv(env);
};
