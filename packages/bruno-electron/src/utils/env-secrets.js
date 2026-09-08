const createEnvSecretsDecryptor = ({ getEnvSecrets, decryptSecretValue }) => (environment, environmentName) => {
  const secrets = getEnvSecrets(environmentName) || [];
  secrets.forEach((secret) => {
    const variable = environment.variables?.find((v) => v.name === secret.name && v.secret);
    if (variable && secret.value) {
      variable.value = decryptSecretValue(secret.value);
    }
  });
};

module.exports = { createEnvSecretsDecryptor };
