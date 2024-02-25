import getConfig from 'next/config';
import { combineReducers } from 'redux';
import { configureStore } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  createTransform,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import tasksMiddleware from './middlewares/tasks/middleware';
import debugMiddleware from './middlewares/debug/middleware';
import appReducer from './slices/app';
import collectionsReducer from './slices/collections';
import tabsReducer from './slices/tabs';

const { publicRuntimeConfig } = getConfig();
const isDevEnv = () => {
  return publicRuntimeConfig.ENV === 'dev';
};

const rootReducerPersistConfig = {
  // this could be same as latest version number of bruno app ?
  // root-<bruno-app-version>
  key: 'root-19',
  // <bruno-app-version>
  version: 19,
  storage
};

let middleware = [tasksMiddleware.middleware];
if (isDevEnv()) {
  middleware = [...middleware, debugMiddleware.middleware];
}

const rootReducer = combineReducers({
  app: appReducer,
  collections: collectionsReducer,
  tabs: tabsReducer
});

const persistedReducer = persistReducer(rootReducerPersistConfig, rootReducer);

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER]
      }
    }).concat(middleware)
});

const persistor = persistStore(store);

export { store, persistor };
