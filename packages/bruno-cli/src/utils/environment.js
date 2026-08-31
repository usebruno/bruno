const fs = require('fs');
const path = require('path');
const { parseEnvironment: _parseEnvironment } = require('@usebruno/filestore');
const { getEnvVars } = require('../utils/bru');
const { isSafeFileName } = require('./filesystem');

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

const environmentNamesIn = (directory, fileExt) =>
  fs
    .readdirSync(directory)
    .filter((fileName) => path.extname(fileName) === fileExt)
    .map((fileName) => path.basename(fileName, fileExt));

/**
 * Resolve the `extends` chain of the environment at `filePath`, reading each ancestor from the
 * sibling file of the same name and format.
 * With `merge`, the inherited variables are folded into `variables`; otherwise they are returned
 * separately as `inheritedVariables`.
 */
const resolveEnvironmentInheritance = ({ filePath, merge }) => {
  const directory = path.dirname(filePath);
  const fileExt = path.extname(filePath);
  const targetEnvironment = parseEnvironment(filePath);
  const environmentNames = environmentNamesIn(directory, fileExt);

  const inheritedEnvironments = [];
  const walked = new Set([environmentNameOf(filePath)]);

  let current = targetEnvironment;
  while (typeof current?.extends === 'string') {
    if (!isSafeFileName(current.extends)) {
      break;
    }

    const parentName = current.extends;
    if (!environmentNames.includes(parentName) || walked.has(parentName)) {
      break;
    }

    walked.add(parentName);
    current = { ...parseEnvironment(path.join(directory, `${parentName}${fileExt}`)), name: parentName };
    inheritedEnvironments.push(current);
  }

  inheritedEnvironments.reverse();

  const nonSecrets = new Map();
  const secrets = new Map();

  inheritedEnvironments.forEach((environment) => {
    const inheritedFrom = { name: environment.name };

    environment.variables?.forEach((v) => {
      if (!v.enabled) {
        return;
      }

      const variable = { ...v, inheritedFrom };
      if (v.secret) {
        secrets.set(v.name, variable);
      } else {
        nonSecrets.set(v.name, variable);
      }
    });
  });

  const ownVariables = targetEnvironment?.variables ?? [];
  ownVariables.forEach((v) => {
    if (!v.enabled) {
      return;
    }

    if (v.secret) {
      secrets.delete(v.name);
    } else {
      nonSecrets.delete(v.name);
    }
  });

  const inheritedVariables = [...nonSecrets.values(), ...secrets.values()];

  if (merge) {
    return { ...targetEnvironment, variables: [...inheritedVariables, ...ownVariables] };
  }

  return { ...targetEnvironment, inheritedVariables };
};

// Helper to load environment variables from a file. Returns the inherited variables too, so
// callers can tell which names it merely inherits — those belong to the parent file.
const loadEnvironmentFromFile = (filePath, nameOverride) => {
  const fileExt = path.extname(filePath).toLowerCase();
  const environment = resolveEnvironmentInheritance({ filePath });
  const variables = getEnvVars(environment);

  if (fileExt === '.json') {
    const rawName = environment?.name;
    const trimmedName = typeof rawName === 'string' ? rawName.trim() : '';
    variables.__name__ = trimmedName || path.basename(filePath, '.json');
  } else {
    variables.__name__ = nameOverride || path.basename(filePath, fileExt === '.yml' ? '.yml' : '.bru');
  }

  return { variables, inheritedVariables: environment?.inheritedVariables || [] };
};

module.exports = {
  parseEnvironmentJson,
  resolveEnvironmentInheritance,
  loadEnvironmentFromFile
};
