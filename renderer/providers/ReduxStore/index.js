import { configureStore } from '@reduxjs/toolkit';
import appReducer from './slices/app';

export const store = configureStore({
  reducer: {
    app:appReducer
  }
});

export default store;
