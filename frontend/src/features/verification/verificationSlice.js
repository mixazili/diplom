import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiRequest, authHeader } from '../../api/client.js';

export const submitVerification = createAsyncThunk(
  'verification/submitVerification',
  async ({ payload, files, token }, { rejectWithValue }) => {
    const formData = new FormData();
    formData.append('payload', JSON.stringify(payload));

    Object.entries(files).forEach(([fieldName, fileList]) => {
      Array.from(fileList || []).forEach((file) => {
        formData.append(fieldName, file);
      });
    });

    try {
      return await apiRequest('/verification', {
        method: 'POST',
        headers: authHeader(token),
        body: formData
      });
    } catch (error) {
      return rejectWithValue({ message: error.message, errors: error.errors });
    }
  }
);

const verificationSlice = createSlice({
  name: 'verification',
  initialState: {
    request: null,
    status: 'idle',
    message: '',
    errors: {}
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(submitVerification.pending, (state) => {
        state.status = 'loading';
        state.message = '';
        state.errors = {};
      })
      .addCase(submitVerification.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.request = action.payload.verification;
        state.message = action.payload.message;
      })
      .addCase(submitVerification.rejected, (state, action) => {
        state.status = 'failed';
        state.message = action.payload?.message || 'Заявка не отправлена';
        state.errors = action.payload?.errors || {};
      });
  }
});

export default verificationSlice.reducer;
