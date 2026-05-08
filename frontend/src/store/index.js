import { configureStore } from '@reduxjs/toolkit';
import appReducer from '../features/app/appSlice.js';

export const store = configureStore({
  reducer: {
    app: appReducer
  }
});
