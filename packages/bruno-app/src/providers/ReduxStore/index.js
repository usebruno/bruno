import getConfig from 'next/config';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import tasksMiddleware from './middlewares/tasks/middleware';
import debugMiddleware from './middlewares/debug/middleware';
import appReducer from './slices/app';
import collectionsReducer from './slices/collections';
import tabsReducer from './slices/tabs';
import notificationsReducer from './slices/notifications';

const { publicRuntimeConfig } = getConfig();
const isDevEnv = () => {
  return publicRuntimeConfig.ENV === 'dev';
};

let middleware = [tasksMiddleware.middleware];
if (isDevEnv()) {
  middleware = [...middleware, debugMiddleware.middleware];
}

const combinedReducer = combineReducers({
  app: appReducer,
  collections: collectionsReducer,
  tabs: tabsReducer,
  notifications: notificationsReducer
});

const rootReducer = (state, action) => {
  if (action.type === 'RESET_STATE') {
    state = undefined;
  }

  return combinedReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(middleware)
});

export default store;
