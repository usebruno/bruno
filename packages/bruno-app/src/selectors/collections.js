import { createSelector } from '@reduxjs/toolkit';
import {
  findCollectionByUid,
  findItemInCollection,
  getGlobalEnvironmentVariables,
  getGlobalEnvironmentVariablesMasked
} from 'utils/collections/index';

/**
 * Narrow selectors for the collections slice.
 *
 * `state.collections.collections` is replaced whenever a collection or request
 * changes, so subscribing to the whole array causes re-renders for unrelated
 * edits. Prefer selecting the smallest existing reference a component needs.
 *
 * Rules:
 * - Select a single field or existing reference directly; no equality function
 *   is needed.
 * - Use `createSelector` for derived values. Use a `make…` factory when each
 *   mounted component needs its own memoization cache.
 * - If data is only needed at event time, don't subscribe to it; read it with
 *   `useStore().getState()` inside the event handler.
 */

// The full collections array. Use only when rendering the collection list itself.
// Other components should select a specific collection, item, or field instead.
export const selectCollections = (state) => state.collections.collections;

export const selectCollectionByUid = (state, collectionUid) =>
  collectionUid ? findCollectionByUid(state.collections.collections, collectionUid) : undefined;

export const selectCollectionName = (state, collectionUid) => selectCollectionByUid(state, collectionUid)?.name;

export const selectCollectionPathname = (state, collectionUid) =>
  selectCollectionByUid(state, collectionUid)?.pathname;

export const selectCollectionMountStatus = (state, collectionUid) =>
  selectCollectionByUid(state, collectionUid)?.mountStatus;

export const selectItemByUid = (state, collectionUid, itemUid) => {
  const collection = selectCollectionByUid(state, collectionUid);
  return collection && itemUid ? findItemInCollection(collection, itemUid) : undefined;
};

export const selectCollectionSortOrder = (state) => state.collections.collectionSortOrder;

export const selectSelectedSidebarUids = (state) => state.collections.selectedSidebarUids;

export const selectActiveWorkspace = (state) => {
  const { workspaces, activeWorkspaceUid } = state.workspaces;
  return workspaces?.find((w) => w.uid === activeWorkspaceUid);
};

const selectGlobalEnvironments = (state) => state.globalEnvironments.globalEnvironments;
const selectActiveGlobalEnvironmentUid = (state) => state.globalEnvironments.activeGlobalEnvironmentUid;

export const makeSelectCollectionWithGlobals = () =>
  createSelector(
    [selectCollectionByUid, selectGlobalEnvironments, selectActiveGlobalEnvironmentUid],
    (collection, globalEnvironments, activeGlobalEnvironmentUid) => {
      if (!collection) {
        return collection;
      }

      return {
        ...collection,
        globalEnvironmentVariables: getGlobalEnvironmentVariables({ globalEnvironments, activeGlobalEnvironmentUid }),
        globalEnvSecrets: getGlobalEnvironmentVariablesMasked({ globalEnvironments, activeGlobalEnvironmentUid }),
        globalEnvironments,
        activeGlobalEnvironmentUid
      };
    }
  );
