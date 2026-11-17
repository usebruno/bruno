import { createSelector } from '@reduxjs/toolkit';
import { getWorkspaceCollections } from 'utils/collections';
import { selectActiveWorkspace, selectCollections } from 'src/selectors/collections';
import { toPathKey } from './collection-paths';

const selectWorkspaces = (state) => state.workspaces.workspaces;

export const selectOpenCollections = createSelector(
  [selectCollections, selectWorkspaces, selectActiveWorkspace],
  (collections, workspaces, activeWorkspace) => getWorkspaceCollections({ collections, workspaces, activeWorkspace })
);

export const selectOpenCollectionPathKeys = createSelector(
  [selectOpenCollections],
  (openCollections) => openCollections.map((collection) => toPathKey(collection.pathname))
);
