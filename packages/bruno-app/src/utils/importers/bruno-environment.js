import { BrunoError } from 'utils/common/error';
import { buildEnvVariable, dedupeImportedSecrets } from 'utils/environments';

const validateBrunoEnvironment = (env, filePath, fileName) => {
  if (!env || typeof env !== 'object') {
    throw new BrunoError('Invalid environment: expected an object');
  }

  if (!Array.isArray(env.variables)) {
    throw new BrunoError('Invalid environment: missing or invalid variables array');
  }

  // Validate each variable
  env.variables.forEach((variable, index) => {
    if (!variable || typeof variable !== 'object') {
      throw new BrunoError(`Invalid variable at index ${index}: expected an object`);
    }
    if (!variable.name || typeof variable.name !== 'string') {
      throw new BrunoError(`Invalid variable at index ${index}: missing or invalid name`);
    }
  });

  const variables = env.variables.map((envVariable) => buildEnvVariable({ envVariable, withUuid: true }));

  return {
    name: env.name,
    variables: dedupeImportedSecrets(variables),
    color: env.color,
    filePath,
    fileName
  };
};

const processEnvironmentData = (data, fileName, filePath) => {
  const valid = [];
  const invalid = [];

  try {
    // Handle new single-file format with environments array
    if (data.info && data.info.type === 'bruno-environment' && Array.isArray(data.environments)) {
      data.environments.forEach((env, index) => {
        try {
          valid.push(validateBrunoEnvironment(env, filePath, fileName));
        } catch (err) {
          invalid.push({ fileName, error: err.message });
        }
      });
      return { valid, invalid };
    }

    // Handle array of environments (old format)
    if (Array.isArray(data)) {
      data.forEach((env, index) => {
        try {
          valid.push(validateBrunoEnvironment(env, filePath, fileName));
        } catch (err) {
          invalid.push({ fileName, error: err.message });
        }
      });
      return { valid, invalid };
    }

    // Handle single environment object
    try {
      valid.push(validateBrunoEnvironment(data, filePath, fileName));
    } catch (err) {
      invalid.push({ fileName, error: err.message });
    }
    return { valid, invalid };
  } catch (err) {
    invalid.push({ fileName, error: `Error processing ${fileName}: ${err.message}` });
    return { valid, invalid };
  }
};

const processFiles = (parsedFiles) => {
  const allValid = [];
  const allInvalid = [];

  for (const parsedFile of parsedFiles) {
    try {
      const { valid, invalid } = processEnvironmentData(parsedFile.content, parsedFile.fileName, parsedFile.filePath);
      allValid.push(...valid);
      allInvalid.push(...invalid);
    } catch (err) {
      allInvalid.push({ fileName: parsedFile.fileName, error: `Failed to process ${parsedFile.fileName}: ${err.message}` });
    }
  }

  return { valid: allValid, invalid: allInvalid };
};

const importBrunoEnvironment = (parsedFiles) => {
  try {
    if (!parsedFiles || parsedFiles.length === 0) {
      throw new BrunoError('No files provided');
    }

    const result = processFiles(parsedFiles);
    return result;
  } catch (err) {
    console.error(err);
    throw err instanceof BrunoError ? err : new BrunoError('Import Bruno environment failed');
  }
};

export { importBrunoEnvironment, processEnvironmentData };
export default importBrunoEnvironment;
