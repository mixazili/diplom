import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiRequest } from '../../api/client.js';

const storageKey = 'auctionBySession';

const getStoredSession = () => {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || {};
  } catch (error) {
    return {};
  }
};

const saveSession = ({ user, accessToken, refreshToken, rememberMe = true }) => {
  if (!rememberMe) {
    localStorage.removeItem(storageKey);
    return;
  }

  localStorage.setItem(storageKey, JSON.stringify({ user, accessToken, refreshToken, rememberMe: true }));
};

const clearSession = () => {
  localStorage.removeItem(storageKey);
};

const postJson = (path, payload) =>
  apiRequest(path, {
    method: 'POST',
    body: JSON.stringify(payload)
  });

const rejectApiError = (error, rejectWithValue) =>
  rejectWithValue({ message: error.message, errors: error.errors });

const withRemember = async (path, payload) => {
  const response = await postJson(path, payload);
  return { ...response, rememberMe: Boolean(payload?.rememberMe) };
};

export const registerUser = createAsyncThunk('auth/registerUser', async (payload, { rejectWithValue }) => {
  try {
    return await postJson('/auth/register', payload);
  } catch (error) {
    return rejectApiError(error, rejectWithValue);
  }
});

export const verifyEmail = createAsyncThunk('auth/verifyEmail', async (payload, { rejectWithValue }) => {
  try {
    return await withRemember('/auth/verify-email', payload);
  } catch (error) {
    return rejectApiError(error, rejectWithValue);
  }
});

export const loginUser = createAsyncThunk('auth/loginUser', async (payload, { rejectWithValue }) => {
  try {
    return await withRemember('/auth/login', payload);
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
    return await withRemember('/auth/staff-login/verify', { ...payload, rememberMe: true });
  } catch (error) {
    return rejectApiError(error, rejectWithValue);
  }
});

export const requestPasswordReset = createAsyncThunk('auth/requestPasswordReset', async (payload, { rejectWithValue }) => {
  try {
    return await postJson('/auth/password-reset/request', payload);
  } catch (error) {
    return rejectApiError(error, rejectWithValue);
  }
});

export const confirmPasswordReset = createAsyncThunk('auth/confirmPasswordReset', async (payload, { rejectWithValue }) => {
  try {
    return await withRemember('/auth/password-reset/confirm', payload);
  } catch (error) {
    return rejectApiError(error, rejectWithValue);
  }
});

export const changePassword = createAsyncThunk('auth/changePassword', async (payload, { getState, rejectWithValue }) => {
  try {
    const { accessToken, rememberMe } = getState().auth;
    const response = await apiRequest('/auth/change-password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(payload)
    });

    return { ...response, rememberMe };
  } catch (error) {
    return rejectApiError(error, rejectWithValue);
  }
});

export const refreshSession = createAsyncThunk('auth/refreshSession', async (refreshToken, { rejectWithValue }) => {
  try {
    return await withRemember('/auth/refresh', { refreshToken, rememberMe: true });
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

const setEmailCodeState = (state, action, emailField) => {
  state.status = 'succeeded';
  state[emailField] = action.payload.email;
  state.emailPreviewUrl = action.payload.developmentEmailPreviewUrl;
  state.emailCode = action.payload.developmentEmailCode;
  state.emailDeliveryError = action.payload.emailDeliveryError;
  state.message = action.payload.message;
};

const setSessionState = (state, action) => {
  state.status = 'succeeded';
  state.user = action.payload.user;
  state.accessToken = action.payload.accessToken;
  state.refreshToken = action.payload.refreshToken;
  state.rememberMe = Boolean(action.payload.rememberMe);
  state.message = action.payload.message;
  state.errors = {};
  state.emailPreviewUrl = null;
  state.emailCode = null;
  state.emailDeliveryError = null;
  saveSession(action.payload);
};

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: storedSession.user || null,
    accessToken: storedSession.accessToken || null,
    refreshToken: storedSession.refreshToken || null,
    rememberMe: Boolean(storedSession.rememberMe),
    registrationEmail: '',
    resetEmail: '',
    staffLoginEmail: '',
    emailPreviewUrl: null,
    emailCode: null,
    emailDeliveryError: null,
    status: 'idle',
    message: '',
    errors: {}
  },
  reducers: {
    clearAuthFlow(state) {
      state.status = 'idle';
      state.message = '';
      state.errors = {};
      state.emailPreviewUrl = null;
      state.emailCode = null;
      state.emailDeliveryError = null;
      state.registrationEmail = '';
      state.resetEmail = '';
      state.staffLoginEmail = '';
    },
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.rememberMe = false;
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
          refreshToken: state.refreshToken,
          rememberMe: state.rememberMe
        });
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, setPendingState)
      .addCase(registerUser.fulfilled, (state, action) => setEmailCodeState(state, action, 'registrationEmail'))
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
      .addCase(requestStaffLogin.fulfilled, (state, action) => setEmailCodeState(state, action, 'staffLoginEmail'))
      .addCase(requestStaffLogin.rejected, (state, action) => {
        setRejectedState(state, action, 'Код входа не отправлен');
      })
      .addCase(verifyStaffLogin.pending, setPendingState)
      .addCase(verifyStaffLogin.fulfilled, setSessionState)
      .addCase(verifyStaffLogin.rejected, (state, action) => {
        setRejectedState(state, action, 'Код входа не подтверждён');
      })
      .addCase(requestPasswordReset.pending, setPendingState)
      .addCase(requestPasswordReset.fulfilled, (state, action) => setEmailCodeState(state, action, 'resetEmail'))
      .addCase(requestPasswordReset.rejected, (state, action) => {
        setRejectedState(state, action, 'Код восстановления не отправлен');
      })
      .addCase(confirmPasswordReset.pending, setPendingState)
      .addCase(confirmPasswordReset.fulfilled, setSessionState)
      .addCase(confirmPasswordReset.rejected, (state, action) => {
        setRejectedState(state, action, 'Пароль не изменён');
      })
      .addCase(changePassword.pending, setPendingState)
      .addCase(changePassword.fulfilled, setSessionState)
      .addCase(changePassword.rejected, (state, action) => {
        setRejectedState(state, action, 'Пароль не изменён');
      })
      .addCase(refreshSession.fulfilled, setSessionState)
      .addCase(refreshSession.rejected, (state) => {
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.rememberMe = false;
        clearSession();
      });
  }
});

export const { clearAuthFlow, logout, updateCurrentUser } = authSlice.actions;
export default authSlice.reducer;
