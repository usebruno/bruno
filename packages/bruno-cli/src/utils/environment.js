const fs = require('fs');
const path = require('path');
const { parseEnvironment } = require('@usebruno/filestore');

/**
 * Parse a Bruno JSON environment object and normalize variables
 * Accepts only single environment object: { name?, uid?, variables: [...] }
 */
const parseEnvironmentJson = (parsed = {}) => {
  if (!parsed || !Array.isArray(parsed.variables)) {
    throw new Error('Invalid environment JSON: expected a single environment object with a "variables" array');
  }

  const normalized = {
    name: parsed.name,
    variables: (parsed.variables || []).filter(Boolean).map((variable) => ({
      name: variable.name,
      value: variable.value,
      type: variable.type || 'text',
      enabled: variable.enabled !== false,
      secret: variable.secret || false
    }))
  };

  return normalized;
};

const parseEnvFile = (filePath) => {
  const fileExt = path.extname(filePath).toLowerCase();
  const content = fs.readFileSync(filePath, 'utf8');

  if (fileExt === '.json') {
    return parseEnvironmentJson(JSON.parse(content));
  }

  const format = fileExt === '.yml' ? 'yml' : 'bru';
  const normalized = format === 'bru' ? content.replace(/\r\n/g, '\n') : content;
  return parseEnvironment(normalized, { format });
};

const loadEnvironments = async (collectionPath, format) => {
  const environmentsDir = path.join(collectionPath, 'environments');
  if (!fs.existsSync(environmentsDir)) {
    return [];
  }

  const envExt = format === 'yml' ? '.yml' : '.bru';
  const files = fs.readdirSync(environmentsDir).filter((file) => path.extname(file).toLowerCase() === envExt);
  const environments = [];
  for (const file of files) {
    const filePath = path.join(environmentsDir, file);
    try {
      const envJson = await parseEnvFile(filePath);
      const name = path.basename(file, path.extname(file));
      environments.push({ ...envJson, name, variables: envJson.variables || [] });
    } catch (err) {
      throw new Error(`environments/${file}: ${err.message}`);
    }
  }

  return environments.sort((a, b) => a.name.localeCompare(b.name));
};

module.exports = {
  parseEnvironmentJson,
  loadEnvironments
};
