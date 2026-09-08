const createEnvSecretsDecryptor = ({ envHasSecrets, getEnvSecrets, decryptSecretValue }) => (environment, environmentName) => {
  if (!envHasSecrets(environment)) return;
  const secrets = getEnvSecrets(environmentName) || [];
  secrets.forEach((secret) => {
    const variable = environment.variables.find((v) => v.name === secret.name);
    if (variable && secret.value) {
      variable.value = decryptSecretValue(secret.value);
    }
  });
};

module.exports = { createEnvSecretsDecryptor };
