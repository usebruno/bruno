import { configureStore } from '@reduxjs/toolkit';
import listenerMiddleware from './middlewares/listenerMiddleware';
import appReducer from './slices/app';
import collectionsReducer from './slices/collections';
import tabsReducer from './slices/tabs';

export const store = configureStore({
  reducer: {
    app: appReducer,
    collections: collectionsReducer,
    tabs: tabsReducer
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().prepend(listenerMiddleware.middleware)
});

export default store;
