import { flattenItems, hasRequestChanges, isItemAFolder, isItemARequest } from 'utils/collections';
import { normalizePath } from 'utils/common/path';

const STORAGE_KEY = 'bruno.appCloseDraftSession.v1';

const isStorageAvailable = () => {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch (error) {
    return false;
  }
};

const safeParse = (value) => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

const getCollectionEnvironmentDraft = (collection) => {
  if (!collection?.environmentsDraft?.environmentUid || !collection?.environmentsDraft?.variables) {
    return null;
  }

  const environmentsByUid = new Map();
  (collection.environments || []).forEach((environment) => {
    if (!environmentsByUid.has(environment.uid)) {
      environmentsByUid.set(environment.uid, environment);
    }
  });
  const environment = environmentsByUid.get(collection.environmentsDraft.environmentUid);

  return {
    environmentUid: collection.environmentsDraft.environmentUid,
    environmentName: environment?.name || null,
    variables: collection.environmentsDraft.variables
  };
};

const getGlobalEnvironmentDraft = (state) => {
  const draft = state?.globalEnvironments?.globalEnvironmentDraft;
  if (!draft?.environmentUid || !draft?.variables) {
    return null;
  }

  const environmentsByUid = new Map();
  (state?.globalEnvironments?.globalEnvironments || []).forEach((environment) => {
    if (!environmentsByUid.has(environment.uid)) {
      environmentsByUid.set(environment.uid, environment);
    }
  });
  const environment = environmentsByUid.get(draft.environmentUid);

  return {
    environmentUid: draft.environmentUid,
    environmentName: environment?.name || null,
    variables: draft.variables
  };
};

const getCollectionDraftSession = (collection) => {
  if (!collection?.pathname) {
    return null;
  }

  const requestDraftsByPath = new Map();
  const folderDraftsByPath = new Map();
  const items = flattenItems(collection.items || []);

  items.forEach((item) => {
    if (!item?.draft || !item?.pathname) {
      return;
    }

    const normalizedPath = normalizePath(item.pathname);

    if (isItemARequest(item) && hasRequestChanges(item)) {
      requestDraftsByPath.set(normalizedPath, item.draft);
      return;
    }

    if (isItemAFolder(item)) {
      folderDraftsByPath.set(normalizedPath, item.draft);
    }
  });

  const environmentsDraft = getCollectionEnvironmentDraft(collection);
  const hasRequestDrafts = requestDraftsByPath.size > 0;
  const hasFolderDrafts = folderDraftsByPath.size > 0;
  const hasCollectionDraft = !!collection.draft;
  const hasEnvironmentDraft = !!environmentsDraft;

  if (!hasRequestDrafts && !hasFolderDrafts && !hasCollectionDraft && !hasEnvironmentDraft) {
    return null;
  }

  return {
    pathname: normalizePath(collection.pathname),
    collectionDraft: collection.draft || null,
    requestDrafts: Object.fromEntries(requestDraftsByPath),
    folderDrafts: Object.fromEntries(folderDraftsByPath),
    environmentsDraft
  };
};

export const getPersistedDraftSession = () => {
  if (!isStorageAvailable()) {
    return null;
  }

  try {
    return safeParse(window.localStorage.getItem(STORAGE_KEY));
  } catch (error) {
    return null;
  }
};

export const getPersistedCollectionDraftSession = (pathname) => {
  if (!pathname) {
    return null;
  }

  const session = getPersistedDraftSession();
  const collectionDraftSessionsByPath = new Map(Object.entries(session?.collections || {}));
  return collectionDraftSessionsByPath.get(normalizePath(pathname)) || null;
};

export const persistDraftSession = (state) => {
  if (!isStorageAvailable()) {
    return;
  }

  const collections = state?.collections?.collections || [];
  const collectionDraftSessionsByPath = collections.reduce((sessionsByPath, collection) => {
    const collectionDraftSession = getCollectionDraftSession(collection);

    if (collectionDraftSession) {
      sessionsByPath.set(collectionDraftSession.pathname, collectionDraftSession);
    }

    return sessionsByPath;
  }, new Map());
  const snapshot = {
    version: 1,
    collections: Object.fromEntries(collectionDraftSessionsByPath),
    globalEnvironmentDraft: getGlobalEnvironmentDraft(state)
  };

  const hasCollectionDrafts = collectionDraftSessionsByPath.size > 0;
  const hasGlobalDraft = !!snapshot.globalEnvironmentDraft;

  if (!hasCollectionDrafts && !hasGlobalDraft) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
};

export const clearPersistedDraftSession = () => {
  if (!isStorageAvailable()) {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
};
