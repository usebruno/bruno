const fs = require('fs');
const { stringifyEnvironment, stringifyCollection, parseEnvironment } = require('@usebruno/filestore');
const { getDataTypeFromValue } = require('@usebruno/common').utils;
const { parseEnvironmentJson } = require('./environment');

const INTERNAL_KEYS = new Set(['__name__']);

const applyInferredDataType = (variable, value) => {
  const inferred = getDataTypeFromValue(value);
  if (inferred === 'string') {
    delete variable.dataType;
  } else {
    variable.dataType = inferred;
  }
  return variable;
};

const stripInternal = (vars) => {
  const out = {};
  for (const [k, v] of Object.entries(vars || {})) {
    if (!INTERNAL_KEYS.has(k)) out[k] = v;
  }
  return out;
};

const overwriteMap = (target, source) => {
  const preservedName = target.__name__;
  for (const key of Object.keys(target)) {
    if (INTERNAL_KEYS.has(key)) continue;
    if (!(key in source)) delete target[key];
  }
  for (const [key, value] of Object.entries(source)) {
    if (INTERNAL_KEYS.has(key)) continue;
    target[key] = value;
  }
  if (preservedName !== undefined && target.__name__ === undefined) {
    target.__name__ = preservedName;
  }
};

const applyVariableUpdates = (result, { envVariables, runtimeVariables, globalEnvVars, request }) => {
  if (!result) return;
  if (result.envVariables && envVariables) {
    overwriteMap(envVariables, result.envVariables);
  }
  if (result.runtimeVariables && runtimeVariables) {
    overwriteMap(runtimeVariables, result.runtimeVariables);
  }
  if (result.globalEnvironmentVariables && globalEnvVars) {
    overwriteMap(globalEnvVars, result.globalEnvironmentVariables);
  }
  if (result.collectionVariables && request) {
    request.collectionVariables = stripInternal(result.collectionVariables);
  }
};

const mergeScriptVarsIntoEnvList = (variables, scriptVarsRaw) => {
  const scriptVars = stripInternal(scriptVarsRaw);
  const scriptKeys = new Set(Object.keys(scriptVars));
  const next = (variables || [])
    .filter((v) => (v.enabled === false ? true : scriptKeys.has(v.name)))
    .map((v) => {
      if (v.enabled === false || !scriptKeys.has(v.name)) return v;
      return applyInferredDataType({ ...v, value: scriptVars[v.name] }, scriptVars[v.name]);
    });

  const presentEnabled = new Set(next.filter((v) => v.enabled !== false).map((v) => v.name));
  for (const key of scriptKeys) {
    if (presentEnabled.has(key)) continue;
    const entry = { name: key, value: scriptVars[key], type: 'text', enabled: true, secret: false };
    next.push(applyInferredDataType(entry, scriptVars[key]));
  }
  return next;
};

const mergeScriptVarsIntoCollectionVarsList = (variables, scriptVars) => {
  const scriptKeys = new Set(Object.keys(scriptVars || {}));
  const next = (variables || [])
    .filter((v) => (v.enabled === false ? true : scriptKeys.has(v.name)))
    .map((v) => {
      if (v.enabled === false || !scriptKeys.has(v.name)) return v;
      return applyInferredDataType({ ...v, value: scriptVars[v.name] }, scriptVars[v.name]);
    });

  const presentEnabled = new Set(next.filter((v) => v.enabled !== false).map((v) => v.name));
  for (const key of scriptKeys) {
    if (presentEnabled.has(key)) continue;
    const entry = { name: key, value: scriptVars[key], type: 'request', enabled: true };
    next.push(applyInferredDataType(entry, scriptVars[key]));
  }
  return next;
};

const writeIfChanged = (filePath, content, existing) => {
  if (content === existing) return false;
  fs.writeFileSync(filePath, content);
  return true;
};

const persistEnvFile = (envFile, scriptVars) => {
  if (!envFile || !envFile.path) return;
  const { path: filePath, format } = envFile;
  if (!fs.existsSync(filePath)) return;

  if (format === 'json') {
    const existingRaw = fs.readFileSync(filePath, 'utf8');
    let parsed;
    try {
      parsed = JSON.parse(existingRaw);
    } catch {
      return;
    }
    const normalized = parseEnvironmentJson(parsed);
    const mergedVars = mergeScriptVarsIntoEnvList(normalized.variables || [], scriptVars);
    const next = { ...parsed, variables: mergedVars };
    const content = JSON.stringify(next, null, 2) + '\n';
    writeIfChanged(filePath, content, existingRaw);
    return;
  }

  const existingRaw = fs.readFileSync(filePath, 'utf8');
  const sourceForParse = format === 'bru' ? existingRaw.replace(/\r\n/g, '\n') : existingRaw;
  const parsed = parseEnvironment(sourceForParse, { format });
  const mergedVars = mergeScriptVarsIntoEnvList(parsed.variables || [], scriptVars);
  const next = { ...parsed, variables: mergedVars };
  const content = stringifyEnvironment(next, { format });
  writeIfChanged(filePath, content, existingRaw);
};

const persistCollectionVars = (collection, scriptCollVars, collectionRootPath) => {
  if (!collection || !collectionRootPath) return;
  const collectionRoot = collection.root || {};
  collectionRoot.request = collectionRoot.request || {};
  collectionRoot.request.vars = collectionRoot.request.vars || {};
  const existingVars = collectionRoot.request.vars.req || [];
  const merged = mergeScriptVarsIntoCollectionVarsList(existingVars, scriptCollVars);
  collectionRoot.request.vars.req = merged;
  collection.root = collectionRoot;

  const format = collection.format;
  const content = stringifyCollection(collectionRoot, collection.brunoConfig || {}, { format });
  const existing = fs.existsSync(collectionRootPath) ? fs.readFileSync(collectionRootPath, 'utf8') : null;
  if (existing !== null) {
    writeIfChanged(collectionRootPath, content, existing);
  } else {
    fs.writeFileSync(collectionRootPath, content);
  }
};

const persistVariableUpdates = (result, { envFile, globalEnvFile, collection, collectionRootPath }) => {
  if (!result) return;
  if (result.envVariables) persistEnvFile(envFile, result.envVariables);
  if (result.globalEnvironmentVariables) persistEnvFile(globalEnvFile, result.globalEnvironmentVariables);
  if (result.collectionVariables) persistCollectionVars(collection, result.collectionVariables, collectionRootPath);
};

module.exports = {
  applyVariableUpdates,
  persistVariableUpdates,
  mergeScriptVarsIntoEnvList,
  mergeScriptVarsIntoCollectionVarsList
};
