import { createSelector } from '@reduxjs/toolkit';
import { getWorkspaceCollections } from 'utils/collections';
import { selectActiveWorkspace, selectCollections } from 'src/selectors/collections';
import { toPathKey } from './collection-paths';
import { mergeFoundCollections } from './found-collections';

const selectWorkspaces = (state) => state.workspaces.workspaces;
const selectPreviousFoundCollections = (state) => state.openCollectionModal.myComputer.previousCollections;
const selectFoundCollections = (state) => state.openCollectionModal.myComputer.collections;

export const selectOpenCollections = createSelector(
  [selectCollections, selectWorkspaces, selectActiveWorkspace],
  (collections, workspaces, activeWorkspace) => getWorkspaceCollections({ collections, workspaces, activeWorkspace })
);

export const selectOpenCollectionPathKeys = createSelector(
  [selectOpenCollections],
  (openCollections) => openCollections.map((collection) => toPathKey(collection.pathname))
);

export const selectMyComputerCollections = createSelector(
  [selectPreviousFoundCollections, selectFoundCollections],
  (previousCollections, collections) =>
    mergeFoundCollections(previousCollections, collections).sort((a, b) => a.path.localeCompare(b.path))
);

export const selectSearchWholeComputer = (state) => state.app.preferences.openCollection?.searchWholeComputer === true;
