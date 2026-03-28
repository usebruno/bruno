/**
 * Safely merges per-environment dotenv variables into envVars.
 * Filters prototype pollution keys and preserves __name__ metadata.
 */
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const safeMergeEnvDotEnvVars = (envVars, envDotEnvVars) => {
  if (!envDotEnvVars || typeof envDotEnvVars !== 'object' || Object.keys(envDotEnvVars).length === 0) {
    return envVars;
  }

  const envName = envVars.__name__;
  for (const [key, value] of Object.entries(envDotEnvVars)) {
    if (!UNSAFE_KEYS.has(key)) {
      envVars[key] = value;
    }
  }
  if (envName !== undefined) {
    envVars.__name__ = envName;
  }

  return envVars;
};

module.exports = { safeMergeEnvDotEnvVars };
