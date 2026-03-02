import { configureStore } from '@reduxjs/toolkit';
import tasksMiddleware from './middlewares/tasks/middleware';
import debugMiddleware from './middlewares/debug/middleware';
import appReducer from './slices/app';
import collectionsReducer from './slices/collections';
import tabsReducer from './slices/tabs';
import notificationsReducer from './slices/notifications';
import globalEnvironmentsReducer from './slices/global-environments';
import logsReducer from './slices/logs';
import performanceReducer from './slices/performance';
import workspacesReducer from './slices/workspaces';
import apiSpecReducer from './slices/apiSpec';
import openapiSyncReducer from './slices/openapi-sync';
import { draftDetectMiddleware } from './middlewares/draft/middleware';
import { autosaveMiddleware } from './middlewares/autosave/middleware';

const isDevEnv = () => {
  return import.meta.env.MODE === 'development';
};

let middleware = [tasksMiddleware.middleware, draftDetectMiddleware, autosaveMiddleware];
if (isDevEnv()) {
  middleware = [...middleware, debugMiddleware.middleware];
}

export const store = configureStore({
  reducer: {
    app: appReducer,
    collections: collectionsReducer,
    tabs: tabsReducer,
    notifications: notificationsReducer,
    globalEnvironments: globalEnvironmentsReducer,
    logs: logsReducer,
    performance: performanceReducer,
    workspaces: workspacesReducer,
    apiSpec: apiSpecReducer,
    openapiSync: openapiSyncReducer
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(middleware)
});

export default store;
