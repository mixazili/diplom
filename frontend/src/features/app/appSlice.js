import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  projectStage: 'Регистрация, вход и верификация'
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setProjectStage(state, action) {
      state.projectStage = action.payload;
    }
  }
});

export const { setProjectStage } = appSlice.actions;
export default appSlice.reducer;
