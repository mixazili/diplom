import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiRequest, authHeader } from '../../api/client.js';

export const fetchMyAuctions = createAsyncThunk(
  'auction/fetchMyAuctions',
  async ({ token }, { rejectWithValue }) => {
    try {
      return await apiRequest('/auctions/my', {
        headers: authHeader(token)
      });
    } catch (error) {
      return rejectWithValue({ message: error.message, errors: error.errors });
    }
  }
);

export const submitAuction = createAsyncThunk(
  'auction/submitAuction',
  async ({ payload, photos, token }, { rejectWithValue }) => {
    const formData = new FormData();
    formData.append('payload', JSON.stringify(payload));

    photos.forEach((photo) => {
      formData.append('photos', photo.file);
    });

    try {
      return await apiRequest('/auctions', {
        method: 'POST',
        headers: authHeader(token),
        body: formData
      });
    } catch (error) {
      return rejectWithValue({ message: error.message, errors: error.errors });
    }
  }
);

const auctionSlice = createSlice({
  name: 'auction',
  initialState: {
    items: [],
    status: 'idle',
    createStatus: 'idle',
    message: '',
    errors: {}
  },
  reducers: {
    clearAuctionMessage(state) {
      state.message = '';
      state.errors = {};
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyAuctions.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchMyAuctions.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.auctions;
      })
      .addCase(fetchMyAuctions.rejected, (state, action) => {
        state.status = 'failed';
        state.message = action.payload?.message || 'Не удалось загрузить лоты';
      })
      .addCase(submitAuction.pending, (state) => {
        state.createStatus = 'loading';
        state.message = '';
        state.errors = {};
      })
      .addCase(submitAuction.fulfilled, (state, action) => {
        state.createStatus = 'succeeded';
        state.message = action.payload.message;
        state.items = [action.payload.auction, ...state.items];
      })
      .addCase(submitAuction.rejected, (state, action) => {
        state.createStatus = 'failed';
        state.message = action.payload?.message || 'Заявка на лот не отправлена';
        state.errors = action.payload?.errors || {};
      });
  }
});

export const { clearAuctionMessage } = auctionSlice.actions;
export default auctionSlice.reducer;
