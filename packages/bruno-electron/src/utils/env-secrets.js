const createEnvSecretsDecryptor = ({ envHasSecrets, getEnvSecrets, decryptSecretValue }) => (environment, environmentName) => {
  if (!envHasSecrets(environment)) return;
  const secrets = getEnvSecrets(environmentName) || [];
  secrets.forEach((secret) => {
    const variableIndex = environment.variables.findIndex((v) => v.name === secret.name);
    if (environment.variables[variableIndex] && secret.value) {
      environment.variables[variableIndex].value = decryptSecretValue(secret.value);
    }
  });
};

module.exports = { createEnvSecretsDecryptor };
