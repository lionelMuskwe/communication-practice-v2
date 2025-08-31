import axios from 'axios';
import store from '../store'; // Adjust the path to your Redux store
import { createBrowserHistory } from 'history';
import { logout } from '../features/authSlice';
import { showSnackbar } from '../features/snackbarSlice';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';
const history = createBrowserHistory();

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the Bearer token
apiClient.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const token = state.auth.token; // Adjust based on how your state is structured

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle unauthorized responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Redirect to login page
      store.dispatch(logout());
      store.dispatch(showSnackbar({ message: 'Unauthorized access. Please login again.', severity: 'error' }));
      history.push('/login'); // Adjust the path to your login page
    }
    return Promise.reject(error);
  }
);

export const get = (url, params) => {
  return apiClient.get(url, { params });
};

export const post = (url, data) => {
  return apiClient.post(url, data);
};

export const put = (url, data) => {
  return apiClient.put(url, data);
};

export const del = (url) => {
  return apiClient.delete(url);
};
