const fs = require('fs');
const path = require('path');
const { parseEnvironment: _parseEnvironment } = require('@usebruno/filestore');
const { getEnvVars } = require('../utils/bru');
const { resolveEnvironmentInheritance: resolveEnvironmentInheritanceCommon } = require('@usebruno/common').utils;

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

const parseEnvironment = (filePath) => {
  const fileExt = path.extname(filePath).toLowerCase();

  if (fileExt === '.json') {
    return parseEnvironmentJson(JSON.parse(fs.readFileSync(filePath, 'utf8')));
  }
  if (fileExt === '.yml') {
    return _parseEnvironment(fs.readFileSync(filePath, 'utf8'), { format: 'yml' });
  }
  return _parseEnvironment(fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n'), { format: 'bru' });
};

const environmentNameOf = (filePath) => path.basename(filePath, path.extname(filePath));

const environmentsIn = (directory, fileExt) =>
  fs
    .readdirSync(directory)
    .filter((fileName) => path.extname(fileName).toLowerCase() === fileExt)
    .map((fileName) => {
      try {
        return {
          ...parseEnvironment(path.join(directory, fileName)),
          name: environmentNameOf(fileName)
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

/**
 * Resolve the `extends` chain of the environment at `filePath` against its sibling environment files.
 * With `merge`, the inherited variables are folded into `variables`; otherwise they are returned
 * separately as `inheritedVariables`.
 */
const resolveEnvironmentInheritance = ({ filePath, merge }) => {
  const targetEnvironment = parseEnvironment(filePath);
  const environment = { ...targetEnvironment, name: environmentNameOf(filePath) };

  const environments = environment.extends
    ? environmentsIn(path.dirname(filePath), path.extname(filePath).toLowerCase())
    : [];

  const resolved = resolveEnvironmentInheritanceCommon({
    environments,
    targetEnvironment: environment,
    merge
  });

  return { ...resolved, name: targetEnvironment.name };
};

// Helper to load environment variables from a file. Returns the inherited variables too, so
// callers can tell which names it merely inherits — those belong to the parent file — and its own
// entries, so a caller that loads this file alongside another environment can tell that one which
// names it must leave to this file. With `resolveInheritance` off the file is loaded exactly as it
// reads, `extends` chain and all left unresolved.
const loadEnvironmentFromFile = ({ filePath, name, resolveInheritance = true }) => {
  const fileExt = path.extname(filePath).toLowerCase();

  const environment = resolveInheritance ? resolveEnvironmentInheritance({ filePath }) : parseEnvironment(filePath);
  const variables = getEnvVars(environment);

  if (fileExt === '.json') {
    const rawName = environment?.name;
    const trimmedName = typeof rawName === 'string' ? rawName.trim() : '';
    variables.__name__ = trimmedName || environmentNameOf(filePath);
  } else {
    variables.__name__ = name || environmentNameOf(filePath);
  }

  return {
    variables,
    inheritedVariables: environment?.inheritedVariables || [],
    ownVariables: (environment?.variables || []).filter((v) => v.enabled)
  };
};

module.exports = {
  parseEnvironmentJson,
  resolveEnvironmentInheritance,
  loadEnvironmentFromFile
};
