import { configureStore } from '@reduxjs/toolkit';
import appReducer from './slices/app';
import collectionsReducer from './slices/collections';
import tabsReducer from './slices/tabs';
import workspacesReducer from './slices/workspaces';

export const store = configureStore({
  reducer: {
    app: appReducer,
    collections: collectionsReducer,
    tabs: tabsReducer,
    workspaces: workspacesReducer
  }
});

export default store;
