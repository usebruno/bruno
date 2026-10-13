import store from 'providers/ReduxStore';
import { addEnvironment, selectEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import { addGlobalEnvironment } from 'providers/ReduxStore/slices/global-environments';
import { findCollectionByUid } from 'utils/collections';
import { validateName, validateNameError } from 'utils/common/regex';
import { VARIABLE_ADD_SCOPES } from 'utils/common/constants';

const NEW_ENVIRONMENT_WAIT_TIMEOUT_MS = 3000;

// `addEnvironment` only writes the file through IPC. The store is updated later, once the
// filesystem watcher picks up the new file and dispatches it in.
// subscribe to the store and resolve on the exact dispatch that adds it
const waitForEnvironmentByName = (collectionUid, name) => {
  const findEnvironment = () => {
    const freshCollection = findCollectionByUid(store.getState().collections.collections, collectionUid);
    return (freshCollection?.environments || []).find((env) => env.name === name);
  };

  return new Promise((resolve, reject) => {
  // check if the environment already exists in the store (in case it was created before this function was called)
    const existing = findEnvironment();
    if (existing) {
      return resolve(existing);
    }

    const timeoutId = setTimeout(() => {
      unsubscribe();
      reject(new Error(`Failed to create environment "${name}"`));
    }, NEW_ENVIRONMENT_WAIT_TIMEOUT_MS);

    const unsubscribe = store.subscribe(() => {
      const found = findEnvironment();
      if (found) {
        clearTimeout(timeoutId);
        unsubscribe();
        resolve(found);
      }
    });
  });
};

/** Case-insensitive name check. */
const isEnvironmentNameTaken = (environments, name) => (
  (environments || []).some((env) => env?.name?.toLowerCase().trim() === name.toLowerCase())
);

/** Creates a global or collection environment and makes it active. */
export const createScopeEnvironment = (scopeType, name, collectionUid) => {
  const { dispatch } = store;
  const trimmedName = (name || '').trim();

  if (!validateName(trimmedName)) {
    return Promise.reject(new Error(validateNameError(trimmedName)));
  }

  const state = store.getState();

  if (scopeType === VARIABLE_ADD_SCOPES.GLOBAL) {
    if (isEnvironmentNameTaken(state.globalEnvironments?.globalEnvironments, trimmedName)) {
      return Promise.reject(new Error('Environment already exists'));
    }
    return dispatch(addGlobalEnvironment({ name: trimmedName, variables: [] }));
  }

  const collection = findCollectionByUid(state.collections.collections, collectionUid);
  if (isEnvironmentNameTaken(collection?.environments, trimmedName)) {
    return Promise.reject(new Error('Environment already exists'));
  }

  return dispatch(addEnvironment(trimmedName, collectionUid))
    .then(() => waitForEnvironmentByName(collectionUid, trimmedName))
    .then((newEnvironment) => dispatch(selectEnvironment(newEnvironment.uid, collectionUid)));
};
