import { useMemo } from 'react';

// Regex to extract variable names in the format {{variableName}} from a string
const VARIABLE_NAME_REGEX = /\{\{([^}]+)\}\}/g;

export const useIdentifySensitiveField = (collection) => {
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

  const isVarNotSecret = (varName, envVars = []) => {
    const found = envVars.find((v) => v.name === varName);
    return found && !found.secret;
  };

  const isSensitive = (value, isSecret = false) => {
    if (!isSecret || !value || typeof value !== 'string') {
      return { showWarning: false };
    }
    const varNames = extractVarNames(value);
    return {
      showWarning: varNames.some((varName) => isVarNotSecret(varName, envVars))
    };
  };

  return {
    isSensitive
  };
};
