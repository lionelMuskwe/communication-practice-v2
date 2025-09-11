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
  if (process.env.NODE_ENV === 'production') return '/api';
  return 'http://localhost:5000/api';
})();

const history = createBrowserHistory();

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  // Default for normal API calls (threads, messages, etc.)
  timeout: 60000,
});

// ─────────────────────────────────────────────────────────────
// Request interceptor: attach Bearer token + bump timeout for
// long-running endpoints (rubric assessment).
// ─────────────────────────────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const token = state?.auth?.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Auto-extend timeout for long rubric assessments if not already overridden.
    // This lets ChatWindow keep using `post(...)` without passing options.
    const url = (config.url || '').toString();
    if (/\/rubric_assessment\b/.test(url)) {
      const current = typeof config.timeout === 'number' ? config.timeout : 30000;
      // Use at least 120s for rubric assessment
      config.timeout = Math.max(current, 120000);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ─────────────────────────────────────────────────────────────
// Response interceptor: handle 401s, rate limits, timeouts, etc.
// ─────────────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const code = error?.code;
    const reqUrl = error?.config?.url || '';

    if (status === 401) {
      store.dispatch(logout());
      store.dispatch(
        showSnackbar({
          message: 'Unauthorised access. Please log in again.',
          severity: 'error',
        })
      );
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
    } else if (code === 'ECONNABORTED') {
      // Timeout
      const isRubric = /\/rubric_assessment\b/.test(reqUrl);
      store.dispatch(
        showSnackbar({
          message: isRubric
            ? 'Assessment took longer than expected. Please try again.'
            : 'Request timed out. Please try again.',
          severity: 'warning',
        })
      );
    } else if (!status) {
      // Network error / CORS / server unreachable
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
// Generic helpers (allow optional axios options, e.g. timeout)
// ─────────────────────────────────────────────────────────────
export const get  = (url, params, opts = {}) => apiClient.get(url, { params, ...opts });
export const post = (url, data, opts = {}) => apiClient.post(url, data, { ...opts });
export const put  = (url, data, opts = {}) => apiClient.put(url, data, { ...opts });
export const del  = (url, opts = {}) => apiClient.delete(url, { ...opts });

// Convenience helper for long posts
export const postLong = (url, data, timeoutMs = 120000) =>
  apiClient.post(url, data, { timeout: timeoutMs });

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

// Rubric assessment (activity → categories/subcategories) — long running
export const rubricAssessment = ({
  activity_id,
  scenario_id,
  messages,
  timeoutMs = 120000,
}) =>
  postLong(
    `/activities/${encodeURIComponent(activity_id)}/rubric_assessment`,
    { messages, scenario_id },
    timeoutMs
  );

// Legacy per-scenario rubric questions (shorter, but allow override)
export const rubricResponses = ({
  activity_id,
  scenario_id,
  messages,
  timeoutMs = 60000,
}) =>
  post(
    `/scenarios/${encodeURIComponent(activity_id)}/rubric_responses`,
    { messages, scenario_id },
    { timeout: timeoutMs }
  );

// Expose the client and base URL (rare cases)
export { apiClient, API_BASE_URL };
