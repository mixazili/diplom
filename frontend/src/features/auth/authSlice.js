import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiRequest } from '../../api/client.js';

const getStoredSession = () => {
  try {
    return JSON.parse(localStorage.getItem('auctionBySession')) || {};
  } catch (error) {
    return {};
  }
};

const saveSession = ({ user, accessToken, refreshToken }) => {
  localStorage.setItem('auctionBySession', JSON.stringify({ user, accessToken, refreshToken }));
};

const clearSession = () => {
  localStorage.removeItem('auctionBySession');
};

export const registerUser = createAsyncThunk('auth/registerUser', async (payload, { rejectWithValue }) => {
  try {
    return await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  } catch (error) {
    return rejectWithValue({ message: error.message, errors: error.errors });
  }
});

export const verifyEmail = createAsyncThunk('auth/verifyEmail', async (payload, { rejectWithValue }) => {
  try {
    return await apiRequest('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  } catch (error) {
    return rejectWithValue({ message: error.message, errors: error.errors });
  }
});

export const loginUser = createAsyncThunk('auth/loginUser', async (payload, { rejectWithValue }) => {
  try {
    return await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  } catch (error) {
    return rejectWithValue({ message: error.message, errors: error.errors });
  }
});

const storedSession = getStoredSession();

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: storedSession.user || null,
    accessToken: storedSession.accessToken || null,
    refreshToken: storedSession.refreshToken || null,
    registrationEmail: '',
    emailPreviewUrl: null,
    emailCode: null,
    emailDeliveryError: null,
    status: 'idle',
    message: '',
    errors: {}
  },
  reducers: {
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.message = '';
      state.errors = {};
      clearSession();
    },
    updateCurrentUser(state, action) {
      state.user = action.payload;
      if (state.accessToken && state.refreshToken) {
        saveSession({
          user: state.user,
          accessToken: state.accessToken,
          refreshToken: state.refreshToken
        });
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => {
        state.status = 'loading';
        state.message = '';
        state.errors = {};
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.registrationEmail = action.payload.email;
        state.emailPreviewUrl = action.payload.developmentEmailPreviewUrl;
        state.emailCode = action.payload.developmentEmailCode;
        state.emailDeliveryError = action.payload.emailDeliveryError;
        state.message = action.payload.message;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = 'failed';
        state.message = action.payload?.message || 'Регистрация не выполнена';
        state.errors = action.payload?.errors || {};
      })
      .addCase(verifyEmail.pending, (state) => {
        state.status = 'loading';
        state.message = '';
        state.errors = {};
      })
      .addCase(verifyEmail.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.message = action.payload.message;
        saveSession(action.payload);
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.status = 'failed';
        state.message = action.payload?.message || 'Email не подтверждён';
        state.errors = action.payload?.errors || {};
      })
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.message = '';
        state.errors = {};
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.message = action.payload.message;
        saveSession(action.payload);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.message = action.payload?.message || 'Вход не выполнен';
        state.errors = action.payload?.errors || {};
      });
  }
});

export const { logout, updateCurrentUser } = authSlice.actions;
export default authSlice.reducer;
