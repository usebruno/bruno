import { configureStore } from '@reduxjs/toolkit';
import appReducer from './slices/app';
import collectionsReducer from './slices/collections';
import tabsReducer from './slices/tabs';
import docsReducer from './slices/docs';

export const store = configureStore({
  reducer: {
    app: appReducer,
    collections: collectionsReducer,
    tabs: tabsReducer,
    docs: docsReducer
  }
});

export default store;
