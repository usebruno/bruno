import get from 'lodash/get';
import { resolveInheritedAuth } from 'utils/auth';
import {
  flattenItems,
  getVariableScope,
  isItemARequest
} from './collections';

export const PLAINTEXT_SENSITIVE_WARNING = 'Store sensitive info as a secret variable or in a .env file';
export const ENVIRONMENT_SENSITIVE_WARNING = 'Mark the environment variable as secret for better security';
export const ENVIRONMENT_USAGE_WARNING = 'This variable is used in sensitive fields. Add it as a secret for security';

export const plainVariableUsageWarning = (variableName) => (
  `"${variableName}" is used in a sensitive field and is stored in plain text. Move it to an environment as a secret.`
);

const SENSITIVE_REQUEST_PATHS = [
  'request.auth.oauth2.clientSecret',
  'request.auth.oauth2.password',
  'request.auth.basic.password',
  'request.auth.digest.password',
  'request.auth.wsse.password',
  'request.auth.ntlm.password',
  'request.auth.awsv4.secretAccessKey',
  'request.auth.awsv4.sessionToken',
  'request.auth.bearer.token',
  'request.auth.apikey.value',
  'request.auth.oauth1.consumerSecret',
  'request.auth.oauth1.accessTokenSecret',
  'request.auth.oauth1.privateKey',
  'request.auth.akamaiEdgegrid.accessToken',
  'request.auth.akamaiEdgegrid.clientToken',
  'request.auth.akamaiEdgegrid.clientSecret'
];

export const scopedSensitiveWarning = (variableName, scope) => (
  `"${variableName}" is a ${scope} variable and is stored in plain text. Move it to an environment as a secret.`
);

const getNoWarning = () => ({
  showWarning: false,
  warningMessage: null,
  scope: null,
  variableName: null
});

const createWarning = (scope, variableName, warningMessage) => ({
  showWarning: true,
  warningMessage,
  scope,
  variableName
});

/** {{name}} in a field value. The group is the name. */
const VARIABLE_INTERPOLATION = /\{\{([^}]+)\}\}/g;

/** Names inside {{ }} in a field value. */
export const extractSensitiveVarNames = (value) => {
  if (typeof value !== 'string' || value.length === 0) {
    return [];
  }

  return Array.from(value.matchAll(VARIABLE_INTERPOLATION), (match) => match[1].trim()).filter(Boolean);
};

/** Uses the passed scope, or infers it from the item. */
const resolveFieldScope = (item, scope) => {
  if (scope) {
    return scope;
  }
  if (item?.uid) {
    return item.type === 'folder' ? 'folder' : 'request';
  }
  // No item means this field belongs to the collection.
  return 'collection';
};

const mapScopeInfoToResolved = (scopeInfo) => {
  if (!scopeInfo || scopeInfo.type === 'runtime') {
    return null;
  }
  const variable = scopeInfo.data?.variable;
  if (!variable) {
    return null;
  }
  return {
    type: scopeInfo.type,
    name: variable.name,
    variable,
    inheritedFrom: scopeInfo.inheritedFrom || variable.inheritedFrom || null
  };
};

/** Saved variable used for this name. Skips runtime and process.env. */
export const resolveSensitiveVariable = (variableName, { collection, item, scope } = {}) => {
  if (!variableName || !collection) {
    return null;
  }

  const fieldScope = resolveFieldScope(item, scope);
  const scopeInfo = getVariableScope(variableName, collection, fieldScope === 'collection' ? null : item, {
    skipRequestScope: fieldScope === 'folder' || fieldScope === 'collection'
  });
  return mapScopeInfoToResolved(scopeInfo);
};

/** True when the winning row is a secret collection-environment or global-environment variable. */
const isSecretEnvironmentVariable = (resolved) => (
  (resolved?.type === 'environment' || resolved?.type === 'global') && !!resolved.variable?.secret
);

/** True when the field has text outside {{name}}. */
const hasPlaintextOutsideVariables = (value) => value.replace(VARIABLE_INTERPOLATION, '').trim().length > 0;

/** Text outside {{name}} warns, even when the variable is a secret. */
export const classifySensitiveValue = (value, context = {}) => {
  if (typeof value !== 'string' || value.length === 0) {
    return getNoWarning();
  }

  const variableNames = extractSensitiveVarNames(value);

  for (const variableName of variableNames) {
    const resolved = resolveSensitiveVariable(variableName, context);
    if (!resolved || isSecretEnvironmentVariable(resolved)) {
      continue;
    }

    if (resolved.type === 'environment' || resolved.type === 'global') {
      return createWarning(resolved.type, variableName, ENVIRONMENT_SENSITIVE_WARNING);
    }

    return createWarning(resolved.type, variableName, scopedSensitiveWarning(variableName, resolved.type));
  }

  if (variableNames.length === 0 || hasPlaintextOutsideVariables(value)) {
    return createWarning('plaintext', null, PLAINTEXT_SENSITIVE_WARNING);
  }

  return getNoWarning();
};

/** Non-empty auth values from one request or collection. */
const readSensitiveValues = (source, item, scope) => (
  SENSITIVE_REQUEST_PATHS.flatMap((fieldPath) => {
    const value = get(source, fieldPath);
    return typeof value === 'string' && value ? [{ value, item, scope }] : [];
  })
);

/** Collection proxy is sent only when it is enabled and its auth is on. */
const usesCollectionProxyPassword = (proxy) => (
  !!proxy && !proxy.disabled && proxy.inherit === false && proxy.config?.auth?.disabled !== true
);

/** Auth, proxy password, and certificate values that can be sent. */
const collectSensitiveFieldValues = (collection) => {
  const fields = [];
  const brunoConfig = collection?.draft?.brunoConfig || collection?.brunoConfig || {};
  const proxy = get(brunoConfig, 'proxy');
  const proxyPassword = get(proxy, 'config.auth.password');
  if (usesCollectionProxyPassword(proxy) && typeof proxyPassword === 'string' && proxyPassword) {
    fields.push({ value: proxyPassword, item: null, scope: 'collection' });
  }
  const certificates = get(brunoConfig, 'clientCertificates.certs');
  (Array.isArray(certificates) ? certificates : []).forEach((certificate) => {
    if (certificate?.disabled) {
      return;
    }
    if (typeof certificate?.passphrase === 'string' && certificate.passphrase) {
      fields.push({ value: certificate.passphrase, item: null, scope: 'collection' });
    }
  });

  flattenItems(collection?.items || []).forEach((item) => {
    if (!isItemARequest(item) || item.partial) {
      return;
    }
    fields.push(...readSensitiveValues({ request: resolveInheritedAuth(item, collection) }, item, 'request'));
  });

  return fields;
};

const copyEnvironmentVariables = (variables) => (variables || []).map((variable) => ({ ...variable }));

/** Snapshot of one environment for read-only scans (does not alias live/draft rows). */
const snapshotEnvironment = (environment) => ({
  ...environment,
  variables: copyEnvironmentVariables(environment.variables)
});

/** Uses the viewed environment's rows, including unsaved edits, for the warning check. */
const replaceEnvironment = (environments, environment) => {
  const environmentSnapshot = snapshotEnvironment(environment);
  const updatedEnvironments = (environments || []).map((candidate) => (
    candidate.uid === environment.uid
      ? { ...candidate, variables: environmentSnapshot.variables }
      : { ...candidate }
  ));
  if (!updatedEnvironments.some((candidate) => candidate.uid === environment.uid)) {
    updatedEnvironments.push(environmentSnapshot);
  }
  return updatedEnvironments;
};

/** Ids of the non-secret rows in this scope that a sensitive field sends. */
const collectSentVariableUids = (collection, scopeType) => {
  const uids = new Set();
  const sensitiveFields = collectSensitiveFieldValues(collection);

  for (const field of sensitiveFields) {
    const variableNames = extractSensitiveVarNames(field.value);
    for (const variableName of variableNames) {
      const resolved = resolveSensitiveVariable(variableName, {
        collection,
        item: field.item,
        scope: field.scope
      });
      const row = resolved?.variable;
      const isSentInThisScope = resolved?.type === scopeType && row?.uid && !row.secret;
      if (isSentInThisScope) {
        uids.add(row.uid);
      }
    }
  }

  return uids;
};

/** Non-secret environment rows used by a sensitive field. */
export const findUsedEnvironmentVariableUids = (collection, environment) => {
  if (!collection || !environment?.uid) {
    return new Set();
  }
  const preparedCollection = {
    ...collection,
    environments: replaceEnvironment(collection.environments, environment),
    activeEnvironmentUid: environment.uid,
    realActiveEnvironmentUid: undefined
  };
  return collectSentVariableUids(preparedCollection, 'environment');
};

/** Non-secret global rows used by a sensitive field in an collection. */
export const findUsedGlobalEnvironmentVariableUids = (collections, globalEnvironments, environment) => {
  const uids = new Set();
  if (!environment?.uid) {
    return uids;
  }
  const environments = replaceEnvironment(globalEnvironments, environment);
  (collections || []).forEach((collection) => {
    collectSentVariableUids({
      ...collection,
      globalEnvironments: environments,
      activeGlobalEnvironmentUid: environment.uid
    }, 'global').forEach((uid) => uids.add(uid));
  });
  return uids;
};

/** Request, folder, or collection Vars rows that a sensitive field sends. */
export const findUsedVarsRowUids = (collection, scopeType) => {
  if (!collection || !['request', 'folder', 'collection'].includes(scopeType)) {
    return new Set();
  }
  return collectSentVariableUids(collection, scopeType);
};
