import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice.js';
import appReducer from '../features/app/appSlice.js';
import verificationReducer from '../features/verification/verificationSlice.js';

export const store = configureStore({
  reducer: {
    app: appReducer,
    auth: authReducer,
    verification: verificationReducer
  }
});
