// src/services/apiService.js
import axios from 'axios';
import store from '../store';
import { createBrowserHistory } from 'history';
import { logout } from '../features/authSlice';
import { showSnackbar } from '../features/snackbarSlice';

// Decide the API base once, with sensible production defaults.
// - In production, default to relative '/api' to use Nginx proxy.
// - In development, default to 'http://localhost:5000/api'.
// - Allow override via REACT_APP_API_URL or REACT_APP_API_BASE.
const API_BASE_URL = (() => {
  const envBase =
    process.env.REACT_APP_API_URL ||
    process.env.REACT_APP_API_BASE ||
    null;

  if (envBase) return envBase.replace(/\/+$/, ''); // trim trailing slash

  if (process.env.NODE_ENV === 'production') {
    return '/api';
  }
  return 'http://localhost:5000/api';
})();

const history = createBrowserHistory();

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 30000,
});

// ─────────────────────────────────────────────────────────────
// Request interceptor: attach Bearer token
// ─────────────────────────────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const token = state?.auth?.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─────────────────────────────────────────────────────────────
// Response interceptor: handle 401s and common errors
// ─────────────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      store.dispatch(logout());
      store.dispatch(
        showSnackbar({
          message: 'Unauthorised access. Please log in again.',
          severity: 'error',
        })
      );
      // history.push() may not always be wired to the app Router instance.
      try {
        history.push('/login');
      } catch {
        window.location.assign('/login');
      }
    } else if (status === 429) {
      store.dispatch(
        showSnackbar({
          message: 'You are being rate limited. Please try again shortly.',
          severity: 'warning',
        })
      );
    } else if (!status) {
      // Network error / CORS / timeout
      store.dispatch(
        showSnackbar({
          message: 'Network error. Please check your connection.',
          severity: 'error',
        })
      );
    }

    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────────────────────
// Generic helpers (kept for existing calls)
// ─────────────────────────────────────────────────────────────
export const get = (url, params) => apiClient.get(url, { params });
export const post = (url, data) => apiClient.post(url, data);
export const put = (url, data) => apiClient.put(url, data);
export const del = (url) => apiClient.delete(url);

// ─────────────────────────────────────────────────────────────
// Domain helpers (use these to ensure correct payloads)
// ─────────────────────────────────────────────────────────────

// Assistants API — threads
export const createThread = () => post('/threads', {});

export const addMessage = ({ thread_id, role = 'user', content = '' }) =>
  post(`/threads/${encodeURIComponent(thread_id)}/messages`, { role, content });

// Critical: always send BOTH activity_id and scenario_id so the backend
// can build the full context and pass it as additional_instructions.
export const runThread = ({ thread_id, activity_id, scenario_id, model }) =>
  post('/threads/run', {
    thread_id,
    activity_id, // selected Activity (pre-brief + categories)
    scenario_id, // selected Character/Scenario that owns tags/rubrics/voice
    model,       // optional model override
  });

export const getRunStatus = ({ run_id, thread_id }) =>
  get(`/runs/${encodeURIComponent(run_id)}/status`, { thread_id });

// Debug: preview exactly what the server will send to OpenAI
export const previewContext = ({ activity_id, scenario_id }) =>
  get('/context/preview', { activity_id, scenario_id });

// Expose the client and base URL for rare cases
export { apiClient, API_BASE_URL };
