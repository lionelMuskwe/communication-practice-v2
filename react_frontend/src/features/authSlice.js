import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    isAuthenticated: false,
    user: null,
    token: null,
    refresh: null,
    role: null,
  },
  reducers: {
    login: (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload.name || action.payload.user;
      state.token = action.payload.token;
      state.refresh = action.payload.refresh;
      state.role = action.payload.role;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.refresh = null;
      state.role = null;
    },
    updateToken: (state, action) => {
      state.token = action.payload.token;
    },
  },
});

export const { login, logout, updateToken } = authSlice.actions;

export default authSlice.reducer;
