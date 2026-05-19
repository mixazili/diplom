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

const postJson = (path, payload) =>
  apiRequest(path, {
    method: 'POST',
    body: JSON.stringify(payload)
  });

const rejectApiError = (error, rejectWithValue) =>
  rejectWithValue({ message: error.message, errors: error.errors });

export const registerUser = createAsyncThunk('auth/registerUser', async (payload, { rejectWithValue }) => {
  try {
    return await postJson('/auth/register', payload);
  } catch (error) {
    return rejectApiError(error, rejectWithValue);
  }
});

export const verifyEmail = createAsyncThunk('auth/verifyEmail', async (payload, { rejectWithValue }) => {
  try {
    return await postJson('/auth/verify-email', payload);
  } catch (error) {
    return rejectApiError(error, rejectWithValue);
  }
});

export const loginUser = createAsyncThunk('auth/loginUser', async (payload, { rejectWithValue }) => {
  try {
    return await postJson('/auth/login', payload);
  } catch (error) {
    return rejectApiError(error, rejectWithValue);
  }
});

export const requestStaffLogin = createAsyncThunk('auth/requestStaffLogin', async (payload, { rejectWithValue }) => {
  try {
    return await postJson('/auth/staff-login', payload);
  } catch (error) {
    return rejectApiError(error, rejectWithValue);
  }
});

export const verifyStaffLogin = createAsyncThunk('auth/verifyStaffLogin', async (payload, { rejectWithValue }) => {
  try {
    return await postJson('/auth/staff-login/verify', payload);
  } catch (error) {
    return rejectApiError(error, rejectWithValue);
  }
});

export const refreshSession = createAsyncThunk('auth/refreshSession', async (refreshToken, { rejectWithValue }) => {
  try {
    return await postJson('/auth/refresh', { refreshToken });
  } catch (error) {
    return rejectApiError(error, rejectWithValue);
  }
});

const storedSession = getStoredSession();

const setPendingState = (state) => {
  state.status = 'loading';
  state.message = '';
  state.errors = {};
};

const setRejectedState = (state, action, fallbackMessage) => {
  state.status = 'failed';
  state.message = action.payload?.message || fallbackMessage;
  state.errors = action.payload?.errors || {};
};

const setSessionState = (state, action) => {
  state.status = 'succeeded';
  state.user = action.payload.user;
  state.accessToken = action.payload.accessToken;
  state.refreshToken = action.payload.refreshToken;
  state.message = action.payload.message;
  saveSession(action.payload);
};

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: storedSession.user || null,
    accessToken: storedSession.accessToken || null,
    refreshToken: storedSession.refreshToken || null,
    registrationEmail: '',
    staffLoginEmail: '',
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
      .addCase(registerUser.pending, setPendingState)
      .addCase(registerUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.registrationEmail = action.payload.email;
        state.emailPreviewUrl = action.payload.developmentEmailPreviewUrl;
        state.emailCode = action.payload.developmentEmailCode;
        state.emailDeliveryError = action.payload.emailDeliveryError;
        state.message = action.payload.message;
      })
      .addCase(registerUser.rejected, (state, action) => {
        setRejectedState(state, action, 'Регистрация не выполнена');
      })
      .addCase(verifyEmail.pending, setPendingState)
      .addCase(verifyEmail.fulfilled, setSessionState)
      .addCase(verifyEmail.rejected, (state, action) => {
        setRejectedState(state, action, 'Email не подтверждён');
      })
      .addCase(loginUser.pending, setPendingState)
      .addCase(loginUser.fulfilled, setSessionState)
      .addCase(loginUser.rejected, (state, action) => {
        setRejectedState(state, action, 'Вход не выполнен');
      })
      .addCase(requestStaffLogin.pending, setPendingState)
      .addCase(requestStaffLogin.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.staffLoginEmail = action.payload.email;
        state.emailPreviewUrl = action.payload.developmentEmailPreviewUrl;
        state.emailCode = action.payload.developmentEmailCode;
        state.emailDeliveryError = action.payload.emailDeliveryError;
        state.message = action.payload.message;
      })
      .addCase(requestStaffLogin.rejected, (state, action) => {
        setRejectedState(state, action, 'Код входа не отправлен');
      })
      .addCase(verifyStaffLogin.pending, setPendingState)
      .addCase(verifyStaffLogin.fulfilled, setSessionState)
      .addCase(verifyStaffLogin.rejected, (state, action) => {
        setRejectedState(state, action, 'Код входа не подтверждён');
      })
      .addCase(refreshSession.fulfilled, (state, action) => {
        setSessionState(state, action);
      })
      .addCase(refreshSession.rejected, (state) => {
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        clearSession();
      });
  }
});

export const { logout, updateCurrentUser } = authSlice.actions;
export default authSlice.reducer;
