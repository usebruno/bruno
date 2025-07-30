import { useMemo } from 'react';

const VARIABLE_NAME_REGEX = /\{\{([^}]+)\}\}/g;
const ENV_VAR_REFERENCE_REGEX = /^\s*\{\{.*\}\}\s*$/;

export const useDetectSensitiveField = (collection) => {
  const envVars = useMemo(() => {
    if (!collection) {
      return [];
    }
    const activeEnv = collection?.environments?.find((env) => env.uid === collection.activeEnvironmentUid);
    if (!activeEnv || !Array.isArray(activeEnv.variables)) {
      return [];
    }
    return activeEnv.variables;
  }, [collection]);

  // Checks if the value is a single environment variable reference (e.g., {{API_KEY}})
  const isEnvVarReference = (value) => {
    return typeof value === 'string' && ENV_VAR_REFERENCE_REGEX.test(value);
  };

  // Extracts all variable names from a string (e.g., "Bearer {{TOKEN}}-{{SUFFIX}}" → ["TOKEN", "SUFFIX"])
  const extractVarNames = (value) => {
    if (!value || typeof value !== 'string') {
      return [];
    }
    const matches = [];
    let match;
    while ((match = VARIABLE_NAME_REGEX.exec(value)) !== null) {
      matches.push(match[1].trim());
    }
    return matches;
  };

  // Checks if a variable is present and not marked as secret in the environment
  const isVarNotSecret = (varName, envVars = []) => {
    const found = envVars.find((v) => v.name === varName);
    return found && !found.secret;
  };

  const isSensitive = (value) => {
    if (value && !isEnvVarReference(value)) {
      return {
        showWarning: true,
        warningMessage: 'Store sensitive info as a secret variable or in a .env file'
      };
    }

    if (value && typeof value === 'string') {
      const varNames = extractVarNames(value);
      if (varNames.some((varName) => isVarNotSecret(varName, envVars))) {
        return {
          showWarning: true,
          warningMessage: 'Mark the environment variable as secret for better security.'
        };
      }
    }

    // No warning needed
    return { showWarning: false };
  };

  return {
    isSensitive
  };
};
