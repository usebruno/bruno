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

/** First match wins. An environment variable beats a collection variable. */
const SCOPE_ORDER = ['request', 'folder', 'environment', 'collection', 'global'];

export const extractSensitiveVarNames = (value) => {
  if (typeof value !== 'string' || value.length === 0) {
    return [];
  }

  return Array.from(value.matchAll(/\{\{([^}]+)\}\}/g), (match) => match[1].trim()).filter(Boolean);
};

const resolveFieldScope = (item, scope) => {
  if (scope === 'request' || scope === 'folder' || scope === 'collection') {
    return scope;
  }
  // An item without a uid is collection scope. Collection auth passes item = {}.
  if (item?.type === 'folder' && item?.uid) {
    return 'folder';
  }
  if (item?.uid) {
    return 'request';
  }
  return 'collection';
};

const readRequestVars = (item) => (
  item?.draft
    ? get(item, 'draft.request.vars.req', [])
    : get(item, 'request.vars.req', [])
);

const readFolderVars = (folder) => get(folder?.draft || folder?.root, 'request.vars.req', []);

const readCollectionVars = (collection) => {
  const collectionRoot = (collection?.draft && collection.draft.root) || collection?.root || {};
  return get(collectionRoot, 'request.vars.req', []);
};

const findNearestFolderVariable = (collection, item, variableName) => {
  const path = getTreePathFromCollectionToItem(collection, item);
  for (let index = path.length - 1; index >= 0; index -= 1) {
    const pathItem = path[index];
    if (pathItem?.type !== 'folder') {
      continue;
    }
    const variable = resolveEnabledVariable(readFolderVars(pathItem), variableName);
    if (variable) {
      return variable;
    }
  }
  return null;
};

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

const findCollectionEnvironmentVariable = (collection, variableName) => {
  const environmentUid = collection.realActiveEnvironmentUid ?? collection.activeEnvironmentUid;
  if (!environmentUid) {
    return null;
  }
  const environment = findEnvironmentInCollection(collection, environmentUid);
  return findInheritedEnvironmentVariable(collection.environments, environment, variableName);
};

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

/** Saved variable Bruno sends for this name. Runtime and process.env are ignored. */
export const resolveSensitiveVariable = (variableName, { collection, item, scope } = {}) => {
  if (!variableName || !collection) {
    return null;
  }

  const fieldScope = resolveFieldScope(item, scope);
  const candidates = {
    request: fieldScope === 'request' ? resolveEnabledVariable(readRequestVars(item), variableName) : null,
    folder: fieldScope === 'request' || fieldScope === 'folder'
      ? findNearestFolderVariable(collection, item, variableName)
      : null,
    environment: findCollectionEnvironmentVariable(collection, variableName),
    collection: resolveEnabledVariable(readCollectionVars(collection), variableName),
    global: findGlobalEnvironmentVariable(collection, variableName)
  };

  const winningScope = SCOPE_ORDER.find((candidateScope) => candidates[candidateScope]);
  if (!winningScope) {
    return null;
  }

  return toResolvedVariable(winningScope, candidates[winningScope]);
};

const isSecretEnvironmentVariable = (resolved) => (
  (resolved?.type === 'environment' || resolved?.type === 'global') && !!resolved.variable?.secret
);

const hasPlaintextOutsideVariables = (value) => value.replace(/\{\{[^}]+\}\}/g, '').trim().length > 0;

/** Text outside {{name}} warns, including when the variable is secret. */
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

const readSensitiveValues = (source, item, scope) => (
  SENSITIVE_REQUEST_PATHS.flatMap((fieldPath) => {
    const value = get(source, fieldPath);
    return typeof value === 'string' && value ? [{ value, item, scope }] : [];
  })
);

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

const replaceEnvironment = (environments, environment) => {
  const next = (environments || []).map((candidate) => (
    candidate.uid === environment.uid ? { ...candidate, variables: environment.variables } : candidate
  ));
  if (!next.some((candidate) => candidate.uid === environment.uid)) {
    next.push(environment);
  }
  return next;
};

const collectWinningVariableUids = (collection, scopeType) => {
  const uids = new Set();
  collectSensitiveFieldValues(collection).forEach((field) => {
    extractSensitiveVarNames(field.value).forEach((variableName) => {
      const resolved = resolveSensitiveVariable(variableName, {
        collection,
        item: field.item,
        scope: field.scope
      });
      if (resolved?.type === scopeType && resolved.variable?.uid && !resolved.variable.secret) {
        uids.add(resolved.variable.uid);
      }
    });
  });
  return uids;
};

/** Non-secret rows in the viewed environment that a sensitive field sends. */
export const findUsedEnvironmentVariableUids = (collection, environment) => {
  if (!collection || !environment?.uid) {
    return new Set();
  }
  return collectWinningVariableUids({
    ...collection,
    environments: replaceEnvironment(collection.environments, environment),
    activeEnvironmentUid: environment.uid,
    realActiveEnvironmentUid: undefined
  }, 'environment');
};

/** Non-secret rows in the viewed global environment that win in a loaded collection. */
export const findUsedGlobalEnvironmentVariableUids = (collections, globalEnvironments, environment) => {
  const uids = new Set();
  if (!environment?.uid) {
    return uids;
  }
  const environments = replaceEnvironment(globalEnvironments, environment);
  (collections || []).forEach((collection) => {
    collectWinningVariableUids({
      ...collection,
      globalEnvironments: environments,
      activeGlobalEnvironmentUid: environment.uid
    }, 'global').forEach((uid) => uids.add(uid));
  });
  return uids;
};

/** Request, folder, or collection rows that a sensitive field sends. */
export const findUsedPlainVariableUids = (collection, scopeType) => {
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
