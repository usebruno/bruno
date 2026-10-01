import get from 'lodash/get';
import { resolveEnvironmentInheritance } from '@usebruno/common/utils';
import { resolveInheritedAuth } from 'utils/auth';
import {
  findEnvironmentInCollection,
  flattenItems,
  getTreePathFromCollectionToItem,
  isItemARequest,
  resolveEnabledVariable
} from './collections';

export const PLAINTEXT_SENSITIVE_WARNING = 'Store sensitive info as a secret variable or in a .env file';
export const ENVIRONMENT_SENSITIVE_WARNING = 'Mark the environment variable as secret for better security.';
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

const noWarning = () => ({
  showWarning: false,
  warningMessage: null,
  scope: null,
  variableName: null
});

const warning = (scope, variableName, warningMessage) => ({
  showWarning: true,
  warningMessage,
  scope,
  variableName
});

/** Earlier scope wins: request, folder, environment, collection, then global. */
const SCOPE_ORDER = ['request', 'folder', 'environment', 'collection', 'global'];

/** Names inside {{ }} in a field value. */
export const extractSensitiveVarNames = (value) => {
  if (typeof value !== 'string' || value.length === 0) {
    return [];
  }

  return Array.from(value.matchAll(/\{\{([^}]+)\}\}/g), (match) => match[1].trim()).filter(Boolean);
};

/** Uses the passed scope, or infers it from the item. */
const resolveFieldScope = (item, scope) => {
  if (scope) {
    return scope;
  }
  // No item means this field belongs to the collection.
  if (item?.type === 'folder' && item?.uid) {
    return 'folder';
  }
  if (item?.uid) {
    return 'request';
  }
  return 'collection';
};

/** Request or folder variables, using the unsaved draft when there is one. */
const readVars = (item) => get(item?.draft || item?.root || item, 'request.vars.req', []);

/** Closest parent folder variable with this name. */
const findNearestFolderVariable = (collection, item, variableName) => {
  const path = getTreePathFromCollectionToItem(collection, item);
  for (let index = path.length - 1; index >= 0; index -= 1) {
    const pathItem = path[index];
    if (pathItem?.type !== 'folder') {
      continue;
    }
    const variable = resolveEnabledVariable(readVars(pathItem), variableName);
    if (variable) {
      return variable;
    }
  }
  return null;
};

/** Enabled row for this name after parent environment rows are merged in. */
const findInheritedEnvironmentVariable = (environments, environment, variableName) => {
  if (!environment) {
    return null;
  }
  const { variables } = resolveEnvironmentInheritance({
    environments,
    targetEnvironment: environment,
    merge: true
  });
  return resolveEnabledVariable(variables, variableName) || null;
};

/** Active collection environment row for this name. */
const findCollectionEnvironmentVariable = (collection, variableName) => {
  const environmentUid = collection.realActiveEnvironmentUid ?? collection.activeEnvironmentUid;
  if (!environmentUid) {
    return null;
  }
  const environment = findEnvironmentInCollection(collection, environmentUid);
  return findInheritedEnvironmentVariable(collection.environments, environment, variableName);
};

/** Active global environment row for this name. */
const findGlobalEnvironmentVariable = (collection, variableName) => {
  const environment = (collection.globalEnvironments || []).find(
    (candidate) => candidate.uid === collection.activeGlobalEnvironmentUid
  );
  return findInheritedEnvironmentVariable(collection.globalEnvironments, environment, variableName);
};

const toResolvedVariable = (type, variable) => ({
  type,
  name: variable.name,
  variable,
  inheritedFrom: variable.inheritedFrom || null
});

/** Saved variable used for this name. Skips runtime and process.env. */
export const resolveSensitiveVariable = (variableName, { collection, item, scope } = {}) => {
  if (!variableName || !collection) {
    return null;
  }

  const fieldScope = resolveFieldScope(item, scope);
  const candidates = {
    request: fieldScope === 'request' ? resolveEnabledVariable(readVars(item), variableName) : null,
    folder: fieldScope === 'request' || fieldScope === 'folder'
      ? findNearestFolderVariable(collection, item, variableName)
      : null,
    environment: findCollectionEnvironmentVariable(collection, variableName),
    collection: resolveEnabledVariable(readVars(collection?.draft?.root || collection?.root), variableName),
    global: findGlobalEnvironmentVariable(collection, variableName)
  };

  const winningScope = SCOPE_ORDER.find((candidateScope) => candidates[candidateScope]);
  if (!winningScope) {
    return null;
  }

  return toResolvedVariable(winningScope, candidates[winningScope]);
};

/** True when the winning row is a secret collection or global environment variable. */
const isSecretEnvironmentVariable = (resolved) => (
  (resolved?.type === 'environment' || resolved?.type === 'global') && !!resolved.variable?.secret
);

/** True when the field has text outside {{name}}. */
const hasPlaintextOutsideVariables = (value) => value.replace(/\{\{[^}]+\}\}/g, '').trim().length > 0;

/** Text outside {{name}} warns, even when the variable is a secret. */
export const classifySensitiveValue = (value, context = {}) => {
  if (typeof value !== 'string' || value.length === 0) {
    return noWarning();
  }

  const variableNames = extractSensitiveVarNames(value);

  for (const variableName of variableNames) {
    const resolved = resolveSensitiveVariable(variableName, context);
    if (!resolved || isSecretEnvironmentVariable(resolved)) {
      continue;
    }

    if (resolved.type === 'environment' || resolved.type === 'global') {
      return warning(resolved.type, variableName, ENVIRONMENT_SENSITIVE_WARNING);
    }

    return warning(resolved.type, variableName, scopedSensitiveWarning(variableName, resolved.type));
  }

  if (variableNames.length === 0 || hasPlaintextOutsideVariables(value)) {
    return warning('plaintext', null, PLAINTEXT_SENSITIVE_WARNING);
  }

  return noWarning();
};

/** Non-empty auth values from one request or collection. */
const readSensitiveValues = (source, item, scope) => (
  SENSITIVE_REQUEST_PATHS.flatMap((fieldPath) => {
    const value = get(source, fieldPath);
    return typeof value === 'string' && value ? [{ value, item, scope }] : [];
  })
);

/** Auth, proxy password, and certificate values that can be sent. */
const collectSensitiveFieldValues = (collection) => {
  const fields = [];
  const brunoConfig = collection?.draft?.brunoConfig || collection?.brunoConfig || {};
  const proxyPassword = get(brunoConfig, 'proxy.config.auth.password');
  if (typeof proxyPassword === 'string' && proxyPassword) {
    fields.push({ value: proxyPassword, item: null, scope: 'collection' });
  }
  const certificates = get(brunoConfig, 'clientCertificates.certs', []);
  certificates.forEach((certificate) => {
    if (typeof certificate?.passphrase === 'string' && certificate.passphrase) {
      fields.push({ value: certificate.passphrase, item: null, scope: 'collection' });
    }
  });

  flattenItems(collection?.items || []).forEach((item) => {
    if (!isItemARequest(item)) {
      return;
    }
    fields.push(...readSensitiveValues({ request: resolveInheritedAuth(item, collection) }, item, 'request'));
  });

  return fields;
};

/** Uses the viewed environment's rows, including unsaved edits, for the warning check. */
const replaceEnvironment = (environments, environment) => {
  const next = (environments || []).map((candidate) => (
    candidate.uid === environment.uid ? { ...candidate, variables: environment.variables } : candidate
  ));
  if (!next.some((candidate) => candidate.uid === environment.uid)) {
    next.push(environment);
  }
  return next;
};

/** Ids of the non-secret rows in this scope that a sensitive field sends. */
const collectSentVariableUids = (collection, scopeType) => {
  const uids = new Set();

  for (const field of collectSensitiveFieldValues(collection)) {
    for (const variableName of extractSensitiveVarNames(field.value)) {
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
  return collectSentVariableUids({
    ...collection,
    environments: replaceEnvironment(collection.environments, environment),
    activeEnvironmentUid: environment.uid,
    realActiveEnvironmentUid: undefined
  }, 'environment');
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
  const uids = new Set();
  if (!collection || !['request', 'folder', 'collection'].includes(scopeType)) {
    return uids;
  }
  collectSensitiveFieldValues(collection).forEach((field) => {
    extractSensitiveVarNames(field.value).forEach((variableName) => {
      const resolved = resolveSensitiveVariable(variableName, {
        collection,
        item: field.item,
        scope: field.scope
      });
      if (resolved?.type === scopeType && resolved.variable?.uid) {
        uids.add(resolved.variable.uid);
      }
    });
  });
  return uids;
};
