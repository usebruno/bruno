import { findCollectionByUid, findParentItemInCollection, getAvailableAddToScopes } from 'utils/collections';
import { VARIABLE_ADD_SCOPES } from 'utils/common/constants';

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
