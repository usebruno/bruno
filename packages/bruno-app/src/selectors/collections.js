import { createSelector } from '@reduxjs/toolkit';
import {
  findCollectionByUid,
  getGlobalEnvironmentVariables,
  getGlobalEnvironmentVariablesMasked
} from 'utils/collections/index';

/**
 * Selectors for accessing collection state without unnecessary re-renders.
 *
 * The collections array gets a new reference whenever a collection or request
 * changes. Components subscribing to the entire array will re-render even
 * when the change is unrelated to them.
 *
 * Prefer:
 * - Selecting only the field or object a component needs.
 * - Using createSelector for derived data and selector factories when each
 *   component needs its own memoization cache.
 * - Reading from useStore().getState() for data needed only in event handlers,
 *   rather than subscribing to changes.
 */

// Use only when the component needs the entire collections array.
export const selectCollections = (state) => state.collections.collections;

export const selectCollectionByUid = (state, collectionUid) =>
  collectionUid ? findCollectionByUid(state.collections.collections, collectionUid) : undefined;

export const selectCollectionSortOrder = (state) => state.collections.collectionSortOrder;

export const selectSelectedSidebarUids = (state) => state.collections.selectedSidebarUids;

export const selectActiveWorkspace = (state) => {
  const { workspaces, activeWorkspaceUid } = state.workspaces;
  return workspaces?.find((w) => w.uid === activeWorkspaceUid);
};

const selectGlobalEnvironments = (state) => state.globalEnvironments.globalEnvironments;
const selectActiveGlobalEnvironmentUid = (state) => state.globalEnvironments.activeGlobalEnvironmentUid;

// Each component gets its own memoized selector to avoid recreating the
// combined collection object when its inputs haven't changed.
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
