const envVarReferenceRegex = /^\s*\{\{.*\}\}\s*$/;

export function isEnvVarReference(value) {
  return typeof value === 'string' && envVarReferenceRegex.test(value);
}

export function isPlainSensitiveValue(value) {
  return value && !isEnvVarReference(value);
}

export function getSensitiveFieldWarning(value, envVarWarning) {
  const isPlain = isPlainSensitiveValue(value);
  return {
    showWarning: envVarWarning || isPlain,
    message: isPlain
      ? 'Store sensitive info as a secret variable or in a .env file'
      : undefined
  };
}