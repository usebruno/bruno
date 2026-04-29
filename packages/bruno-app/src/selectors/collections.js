import { createSelector } from '@reduxjs/toolkit';

const selectCollectionsState = (state) => state.collections;

export const selectCollections = createSelector([selectCollectionsState], (collectionsState) => collectionsState?.collections || []);

export const makeSelectCollectionByUid = () =>
  createSelector([selectCollections, (_, collectionUid) => collectionUid], (collections, collectionUid) =>
    collections.find((collection) => collection.uid === collectionUid) || null
  );

export const makeSelectCollectionByPathname = () =>
  createSelector([selectCollections, (_, pathname) => pathname], (collections, pathname) =>
    collections.find((collection) => collection.pathname === pathname) || null
  );
