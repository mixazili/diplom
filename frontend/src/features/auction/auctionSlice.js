import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiRequest, authHeader } from '../../api/client.js';

const buildAuctionFormData = ({ payload, photos = [] }) => {
  const formData = new FormData();
  formData.append('payload', JSON.stringify(payload));

  photos
    .filter((photo) => photo.file)
    .forEach((photo) => {
      formData.append('photos', photo.file);
    });

  return formData;
};

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
    try {
      return await apiRequest('/auctions', {
        method: 'POST',
        headers: authHeader(token),
        body: buildAuctionFormData({ payload, photos })
      });
    } catch (error) {
      return rejectWithValue({ message: error.message, errors: error.errors });
    }
  }
);

export const updateAuction = createAsyncThunk(
  'auction/updateAuction',
  async ({ id, payload, photos, token }, { rejectWithValue }) => {
    try {
      return await apiRequest(`/auctions/${id}`, {
        method: 'PUT',
        headers: authHeader(token),
        body: buildAuctionFormData({ payload, photos })
      });
    } catch (error) {
      return rejectWithValue({ message: error.message, errors: error.errors });
    }
  }
);

export const deleteAuction = createAsyncThunk(
  'auction/deleteAuction',
  async ({ id, token }, { rejectWithValue }) => {
    try {
      await apiRequest(`/auctions/${id}`, {
        method: 'DELETE',
        headers: authHeader(token)
      });
      return { id };
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
      })
      .addCase(updateAuction.pending, (state) => {
        state.createStatus = 'loading';
        state.message = '';
        state.errors = {};
      })
      .addCase(updateAuction.fulfilled, (state, action) => {
        state.createStatus = 'succeeded';
        state.message = action.payload.message;
        state.items = state.items.map((auction) =>
          auction.id === action.payload.auction.id ? action.payload.auction : auction
        );
      })
      .addCase(updateAuction.rejected, (state, action) => {
        state.createStatus = 'failed';
        state.message = action.payload?.message || 'Лот не отправлен повторно';
        state.errors = action.payload?.errors || {};
      })
      .addCase(deleteAuction.fulfilled, (state, action) => {
        state.items = state.items.filter((auction) => auction.id !== action.payload.id);
        state.message = 'Лот удален';
      })
      .addCase(deleteAuction.rejected, (state, action) => {
        state.message = action.payload?.message || 'Не удалось удалить лот';
      });
  }
});

export const { clearAuctionMessage } = auctionSlice.actions;
export default auctionSlice.reducer;
