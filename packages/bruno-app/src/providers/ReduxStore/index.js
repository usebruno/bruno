import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import tasksMiddleware from './middlewares/tasks/middleware';
import debugMiddleware from './middlewares/debug/middleware';
import appReducer from './slices/app';
import collectionsReducer from './slices/collections';
import tabsReducer from './slices/tabs';
import workspaceTabsReducer from './slices/workspaceTabs';
import notificationsReducer from './slices/notifications';
import globalEnvironmentsReducer from './slices/global-environments';
import logsReducer from './slices/logs';
import performanceReducer from './slices/performance';
import workspacesReducer from './slices/workspaces';
import apiSpecReducer from './slices/apiSpec';
import { draftDetectMiddleware } from './middlewares/draft/middleware';
import { autosaveMiddleware } from './middlewares/autosave/middleware';

const isDevEnv = () => {
  return import.meta.env.MODE === 'development';
};

let middleware = [tasksMiddleware.middleware, draftDetectMiddleware, autosaveMiddleware];
if (isDevEnv()) {
  middleware = [...middleware, debugMiddleware.middleware];
}

const workspacesPersistConfig = {
  key: 'workspaces',
  storage,
  whitelist: ['activeWorkspaceUid']
};

const persistedWorkspacesReducer = persistReducer(workspacesPersistConfig, workspacesReducer);

const rootReducer = combineReducers({
  app: appReducer,
  collections: collectionsReducer,
  tabs: tabsReducer,
  workspaceTabs: workspaceTabsReducer,
  notifications: notificationsReducer,
  globalEnvironments: globalEnvironmentsReducer,
  logs: logsReducer,
  performance: performanceReducer,
  workspaces: persistedWorkspacesReducer,
  apiSpec: apiSpecReducer
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', 'persist/PURGE']
      }
    }).concat(middleware)
});

export const persistor = persistStore(store);

export default store;
