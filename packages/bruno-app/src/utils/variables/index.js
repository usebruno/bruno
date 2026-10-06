import { findCollectionByUid, findParentItemInCollection, getAvailableAddToScopes } from 'utils/collections';
import { addEnvironment, selectEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import { addGlobalEnvironment } from 'providers/ReduxStore/slices/global-environments';
import { validateName, validateNameError } from 'utils/common/regex';
import { VARIABLE_ADD_SCOPES } from 'utils/common/constants';

const NEW_ENVIRONMENT_WAIT_TIMEOUT_MS = 3000;

export const resolveFolderScopeTarget = (collection, item) => {
  const isSelfFolder = !!(item && item.type === 'folder');
  const parentFolder = item && !isSelfFolder && collection ? findParentItemInCollection(collection, item.uid) : null;

  return { folderScopeTarget: isSelfFolder ? item : parentFolder, isSelfFolder };
};

export const buildAddToScopes = ({ state, collection, item }) => {
  const globalEnvironmentsState = state?.globalEnvironments || {};
  const { folderScopeTarget, isSelfFolder } = resolveFolderScopeTarget(collection, item);

  const freshCollection = collection?.uid
    ? findCollectionByUid(state?.collections?.collections, collection.uid)
    : null;
  const activeEnvironmentName = (freshCollection?.environments || []).find(
    (env) => env.uid === freshCollection?.activeEnvironmentUid
  )?.name;
  const activeGlobalEnvironmentName = (globalEnvironmentsState.globalEnvironments || []).find(
    (env) => env.uid === globalEnvironmentsState.activeGlobalEnvironmentUid
  )?.name;

  return getAvailableAddToScopes({
    activeEnvironmentUid: activeEnvironmentName ? freshCollection?.activeEnvironmentUid : undefined,
    activeEnvironmentName,
    activeGlobalEnvironmentUid: globalEnvironmentsState.activeGlobalEnvironmentUid,
    activeGlobalEnvironmentName,
    item,
    parentFolder: folderScopeTarget,
    isSelfFolder,
    hasCollection: !!collection?.uid
  });
};

export const buildScopeInfo = ({ scopeType, state, collection, item, secret = false }) => {
  const { folderScopeTarget } = resolveFolderScopeTarget(collection, item);

  switch (scopeType) {
    case VARIABLE_ADD_SCOPES.COLLECTION:
      return { type: 'collection', value: '', data: { collection, variable: null } };

    case VARIABLE_ADD_SCOPES.REQUEST:
      return { type: 'request', value: '', data: { item, variable: null } };

    case VARIABLE_ADD_SCOPES.FOLDER:
      return { type: 'folder', value: '', data: { folder: folderScopeTarget, variable: null } };

    case VARIABLE_ADD_SCOPES.ENVIRONMENT: {
      const freshCollection = findCollectionByUid(state?.collections?.collections, collection?.uid);
      const environment = (freshCollection?.environments || []).find(
        (env) => env.uid === freshCollection?.activeEnvironmentUid
      );
      return { type: 'environment', value: '', data: { environment, variable: null, secret } };
    }

    case VARIABLE_ADD_SCOPES.GLOBAL: {
      const globalEnvironmentsState = state?.globalEnvironments || {};
      const environment = (globalEnvironmentsState.globalEnvironments || []).find(
        (env) => env.uid === globalEnvironmentsState.activeGlobalEnvironmentUid
      );
      return { type: 'global', value: '', data: { environment, variable: null, secret } };
    }

    default:
      return null;
  }
};

// `addEnvironment` only writes the file through IPC. The store is updated later, once the
// filesystem watcher picks up the new file and dispatches it in.
export const waitForEnvironmentByName = ({ store, collectionUid, name }) => {
  const findEnvironment = () => {
    const freshCollection = findCollectionByUid(store.getState().collections.collections, collectionUid);
    return (freshCollection?.environments || []).find((env) => env.name === name);
  };

  return new Promise((resolve, reject) => {
    const existing = findEnvironment();
    if (existing) {
      return resolve(existing);
    }

    let unsubscribe;

    const timeoutId = setTimeout(() => {
      unsubscribe();
      reject(new Error(`Failed to create environment "${name}"`));
    }, NEW_ENVIRONMENT_WAIT_TIMEOUT_MS);

    unsubscribe = store.subscribe(() => {
      const found = findEnvironment();
      if (found) {
        clearTimeout(timeoutId);
        unsubscribe();
        resolve(found);
      }
    });
  });
};

const isDuplicateEnvironmentName = (environments, name) =>
  (environments || []).some((env) => env?.name?.toLowerCase().trim() === name.toLowerCase());

export const createEnvironmentForScope = ({ scope, name, collectionUid, store }) => {
  const trimmedName = (name || '').trim();

  // The main process sanitizes the name into a filename; a name it would rewrite makes the
  // name-based wait below time out, so reject it up front rather than reporting a false failure.
  if (!validateName(trimmedName)) {
    return Promise.reject(new Error(validateNameError(trimmedName)));
  }

  const state = store.getState();

  if (scope.type === VARIABLE_ADD_SCOPES.GLOBAL) {
    if (isDuplicateEnvironmentName(state.globalEnvironments?.globalEnvironments, trimmedName)) {
      return Promise.reject(new Error('Environment already exists'));
    }

    return store.dispatch(addGlobalEnvironment({ name: trimmedName, variables: [] }));
  }

  if (scope.type === VARIABLE_ADD_SCOPES.ENVIRONMENT) {
    const freshCollection = findCollectionByUid(state.collections.collections, collectionUid);

    if (isDuplicateEnvironmentName(freshCollection?.environments, trimmedName)) {
      return Promise.reject(new Error('Environment already exists'));
    }

    return store
      .dispatch(addEnvironment(trimmedName, collectionUid))
      .then(() => waitForEnvironmentByName({ store, collectionUid, name: trimmedName }))
      .then((newEnvironment) => store.dispatch(selectEnvironment(newEnvironment.uid, collectionUid)));
  }

  return Promise.reject(new Error(`"${scope.label}" does not support creating a new one`));
};

const enabledNames = (variables) =>
  new Set((variables || []).filter((variable) => variable.enabled && variable.name).map((variable) => variable.name));

// Names already defined in a scope, so the UI can tell the user a save would overwrite one.
export const getScopeVariableNames = ({ scopeType, state, collection, item }) => {
  const scopeInfo = buildScopeInfo({ scopeType, state, collection, item });
  if (!scopeInfo) {
    return new Set();
  }

  const { type, data } = scopeInfo;

  if (type === VARIABLE_ADD_SCOPES.ENVIRONMENT || type === VARIABLE_ADD_SCOPES.GLOBAL) {
    return enabledNames(data.environment?.variables);
  }

  if (type === VARIABLE_ADD_SCOPES.REQUEST) {
    const request = data.item?.draft?.request || data.item?.request;
    return enabledNames(request?.vars?.req);
  }

  if (type === VARIABLE_ADD_SCOPES.FOLDER) {
    const root = data.folder?.draft || data.folder?.root;
    return enabledNames(root?.request?.vars?.req);
  }

  const collectionRoot = data.collection?.draft?.root || data.collection?.root;
  return enabledNames(collectionRoot?.request?.vars?.req);
};
