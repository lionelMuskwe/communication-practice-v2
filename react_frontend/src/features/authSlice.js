import { createSlice } from '@reduxjs/toolkit';

// Load initial state from localStorage
const loadAuthFromStorage = () => {
  try {
    const token = localStorage.getItem('token');
    const refresh = localStorage.getItem('refresh');
    const user = localStorage.getItem('user');
    const role = localStorage.getItem('role');

    if (token && refresh) {
      return {
        isAuthenticated: true,
        token,
        refresh,
        user,
        role,
      };
    }
  } catch (error) {
    console.error('Failed to load auth from localStorage:', error);
  }

  return {
    isAuthenticated: false,
    user: null,
    token: null,
    refresh: null,
    role: null,
  };
};

const authSlice = createSlice({
  name: 'auth',
  initialState: loadAuthFromStorage(),
  reducers: {
    login: (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload.name || action.payload.user;
      state.token = action.payload.token;
      state.refresh = action.payload.refresh;
      state.role = action.payload.role;

      // Persist to localStorage
      try {
        localStorage.setItem('token', action.payload.token);
        localStorage.setItem('refresh', action.payload.refresh);
        localStorage.setItem('user', action.payload.name || action.payload.user);
        localStorage.setItem('role', action.payload.role);
      } catch (error) {
        console.error('Failed to save auth to localStorage:', error);
      }
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.refresh = null;
      state.role = null;

      // Clear from localStorage
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh');
        localStorage.removeItem('user');
        localStorage.removeItem('role');
      } catch (error) {
        console.error('Failed to clear auth from localStorage:', error);
      }
    },
    updateToken: (state, action) => {
      state.token = action.payload.token;

      // Update token in localStorage
      try {
        localStorage.setItem('token', action.payload.token);
      } catch (error) {
        console.error('Failed to update token in localStorage:', error);
      }
    },
  },
});

export const { login, logout, updateToken } = authSlice.actions;

export default authSlice.reducer;
