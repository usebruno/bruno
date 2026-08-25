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

const loadEnvironments = (collectionPath) => {
  const environmentsDir = path.join(collectionPath, 'environments');
  if (!fs.existsSync(environmentsDir)) {
    return [];
  }

  return fs
    .readdirSync(environmentsDir)
    .filter((file) => /\.(bru|yml|json)$/i.test(file))
    .map((file) => {
      const filePath = path.join(environmentsDir, file);
      const fileExt = path.extname(file).toLowerCase();
      const content = fs.readFileSync(filePath, 'utf8');

      if (fileExt === '.json') {
        const parsed = parseEnvironmentJson(JSON.parse(content));
        return { ...parsed, name: parsed.name || path.basename(file, '.json'), variables: parsed.variables || [] };
      }

      const format = fileExt === '.yml' ? 'yml' : 'bru';
      const normalized = format === 'bru' ? content.replace(/\r\n/g, '\n') : content;
      const envJson = parseEnvironment(normalized, { format });
      return { ...envJson, name: envJson.name || path.basename(file, fileExt), variables: envJson.variables || [] };
    });
};

module.exports = {
  parseEnvironmentJson,
  loadEnvironments
};
