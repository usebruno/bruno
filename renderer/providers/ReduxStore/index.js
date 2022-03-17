import { configureStore } from '@reduxjs/toolkit';
import appReducer from './slices/app';
import collectionsReducer from './slices/collections';

export const store = configureStore({
  reducer: {
    app: appReducer,
    collections: collectionsReducer
  }
});

export default store;
