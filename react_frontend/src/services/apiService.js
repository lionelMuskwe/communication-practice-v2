// src/services/apiService.js
import axios from 'axios';
import store from '../store';
import { createBrowserHistory } from 'history';
import { logout, updateToken } from '../features/authSlice';
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
// Token refresh helper
// ─────────────────────────────────────────────────────────────
let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

const refreshAccessToken = async () => {
  const state = store.getState();
  const refreshToken = state?.auth?.refresh;

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    const response = await axios.post(`${API_BASE_URL}/token/refresh`, {
      refresh: refreshToken,
    });

    const { token } = response.data;
    store.dispatch(updateToken({ token }));
    return token;
  } catch (error) {
    store.dispatch(logout());
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────
// Response interceptor: handle 401s, rate limits, timeouts, etc.
// ─────────────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const code = error?.code;
    const reqUrl = error?.config?.url || '';
    const originalRequest = error?.config;

    if (status === 401 && !originalRequest._retry) {
      // Avoid retry loop for refresh endpoint itself
      if (reqUrl.includes('/token/refresh')) {
        store.dispatch(logout());
        // Silent logout - no snackbar notification
        try {
          history.push('/login');
        } catch {
          window.location.assign('/login');
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue this request until token is refreshed
        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        isRefreshing = false;
        onRefreshed(newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        store.dispatch(logout());
        // Silent logout - no snackbar notification
        try {
          history.push('/login');
        } catch {
          window.location.assign('/login');
        }
        return Promise.reject(refreshError);
      }
    } else if (status === 401) {
      // Already retried, logout
      store.dispatch(logout());
      // Silent logout - no snackbar notification
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
export const patch = (url, data, opts = {}) => apiClient.patch(url, data, { ...opts });
export const del  = (url, opts = {}) => apiClient.delete(url, { ...opts });

// Convenience helper for long posts
export const postLong = (url, data, timeoutMs = 120000) =>
  apiClient.post(url, data, { timeout: timeoutMs });

// ─────────────────────────────────────────────────────────────
// Domain helpers (use these to ensure correct payloads)
// ─────────────────────────────────────────────────────────────

// Assistants API — threads
export const createThread = () => post('/threads/', {});

export const addMessage = ({ thread_id, role = 'user', content = '' }) =>
  post(`/threads/${encodeURIComponent(thread_id)}/messages/`, { role, content });

// Critical: always send BOTH activity_id and scenario_id so the backend
// can build the full context and pass it as additional_instructions.
export const runThread = ({ thread_id, activity_id, scenario_id, model }) =>
  post('/threads/run/', {
    thread_id,
    activity_id, // selected Activity (pre-brief + categories)
    scenario_id, // selected Character/Scenario that owns tags/rubrics/voice
    model,       // optional model override
  });

export const getRunStatus = ({ run_id, thread_id }) =>
  get(`/runs/${encodeURIComponent(run_id)}/status/`, { thread_id });

// Debug: preview exactly what the server will send to OpenAI
export const previewContext = ({ activity_id, scenario_id }) =>
  get('/context/preview/', { activity_id, scenario_id });

// Rubric assessment (activity → categories/subcategories) — long running
export const rubricAssessment = ({
  activity_id,
  scenario_id,
  messages,
  timeoutMs = 120000,
}) =>
  postLong(
    `/activities/${encodeURIComponent(activity_id)}/rubric_assessment/`,
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
    `/scenarios/${encodeURIComponent(activity_id)}/rubric_responses/`,
    { messages, scenario_id },
    { timeout: timeoutMs }
  );

// ─────────────────────────────────────────────────────────────
// New Conversation API (Chat Completions with SSE Streaming)
// ─────────────────────────────────────────────────────────────

/**
 * Create a new conversation.
 * @param {number} activityId - Activity ID (optional)
 * @param {number} scenarioId - Scenario ID (required)
 * @returns {Promise} Response with conversation object
 */
export const createConversation = (activityId, scenarioId) =>
  post('/conversations/', {
    activity_id: activityId,
    scenario_id: scenarioId,
  });

/**
 * Get list of user's conversations.
 * @param {Object} filters - Optional filters (activity_id, is_archived)
 * @returns {Promise} Response with conversation list
 */
export const getConversations = (filters = {}) =>
  get('/conversations/', filters);

/**
 * Get a single conversation with all messages.
 * @param {string} conversationId - Conversation UUID
 * @returns {Promise} Response with conversation detail
 */
export const getConversation = (conversationId) =>
  get(`/conversations/${conversationId}/`);

/**
 * Delete (archive) a conversation.
 * @param {string} conversationId - Conversation UUID
 * @returns {Promise} Response
 */
export const deleteConversation = (conversationId) =>
  del(`/conversations/${conversationId}/`);

/**
 * Update conversation (title, archive status).
 * @param {string} conversationId - Conversation UUID
 * @param {Object} data - Update data (title, is_archived)
 * @returns {Promise} Response with updated conversation
 */
export const updateConversation = (conversationId, data) =>
  apiClient.patch(`/conversations/${conversationId}/`, data);

/**
 * Stream a message using Server-Sent Events (SSE).
 *
 * @param {string} conversationId - Conversation UUID
 * @param {string} content - User message content
 * @param {Function} onChunk - Callback for each token: (token) => void
 * @param {Function} onComplete - Callback when done: () => void
 * @param {Function} onError - Callback on error: (error) => void
 * @param {Function} onAudioReady - Callback when audio is ready: (messageId) => void
 * @returns {EventSource} The EventSource object (can be closed manually)
 */
export const streamMessage = (
  conversationId,
  content,
  onChunk,
  onComplete,
  onError,
  onAudioReady
) => {
  const state = store.getState();
  const token = state?.auth?.token;

  const url = `${API_BASE_URL}/conversations/${conversationId}/stream/`;

  // Use fetch with ReadableStream for SSE
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: JSON.stringify({ content }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      const readStream = () => {
        reader
          .read()
          .then(({ done, value }) => {
            if (done) {
              onComplete();
              return;
            }

            // Decode chunk
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonStr = line.substring(6);
                try {
                  const data = JSON.parse(jsonStr);

                  if (data.error) {
                    onError(new Error(data.error));
                    return;
                  }

                  if (data.message_id) {
                    // Message saved, trigger audio playback
                    if (onAudioReady) {
                      onAudioReady(data.message_id);
                    }
                    continue;
                  }

                  if (data.done) {
                    onComplete();
                    return;
                  }

                  if (data.token) {
                    onChunk(data.token);
                  }
                } catch (e) {
                  // Ignore JSON parse errors for incomplete chunks
                }
              }
            }

            // Continue reading
            readStream();
          })
          .catch((error) => {
            onError(error);
          });
      };

      readStream();
    })
    .catch((error) => {
      onError(error);
    });
};

/**
 * Updated rubric assessment to accept conversation_id.
 * @param {string} conversationId - Conversation UUID
 * @param {number} activityId - Activity ID
 * @param {number} scenarioId - Scenario ID (optional)
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise} Response with assessment result
 */
export const rubricAssessmentByConversation = ({
  conversationId,
  activityId,
  scenarioId,
  timeoutMs = 120000,
}) =>
  postLong(
    `/activities/${encodeURIComponent(activityId)}/rubric_assessment/`,
    { conversation_id: conversationId, scenario_id: scenarioId },
    timeoutMs
  );

/**
 * Get assessments for a conversation.
 * @param {string} conversationId - Conversation UUID
 * @param {boolean} all - Return all assessments (default: false, returns latest only)
 * @returns {Promise} Response with assessment(s)
 */
export const getConversationAssessments = (conversationId, all = false) =>
  get(`/conversations/${encodeURIComponent(conversationId)}/assessments/`, { all });

// ─────────────────────────────────────────────────────────────
// Feedback API endpoints
// ─────────────────────────────────────────────────────────────

/**
 * Get all feedback entries (filtered by user role).
 * @param {Object} params - Query parameters (status, conversation_id)
 * @returns {Promise} Response with feedback list
 */
export const getFeedback = (params = {}) => get('/feedback/', params);

/**
 * Get detailed feedback entry.
 * @param {string} feedbackId - Feedback UUID
 * @returns {Promise} Response with feedback details
 */
export const getFeedbackDetail = (feedbackId) =>
  get(`/feedback/${encodeURIComponent(feedbackId)}/`);

/**
 * Create new feedback entry.
 * @param {Object} data - Feedback data (conversation_id, title, content)
 * @returns {Promise} Response with created feedback
 */
export const createFeedback = ({ conversation_id, title, content }) =>
  post('/feedback/', { conversation_id, title, content });

/**
 * Update feedback entry (user can update title/content).
 * @param {string} feedbackId - Feedback UUID
 * @param {Object} data - Updated data (title, content)
 * @returns {Promise} Response with updated feedback
 */
export const updateFeedback = (feedbackId, data) =>
  patch(`/feedback/${encodeURIComponent(feedbackId)}/`, data);

/**
 * Delete feedback entry.
 * @param {string} feedbackId - Feedback UUID
 * @returns {Promise} Response (204 No Content on success)
 */
export const deleteFeedback = (feedbackId) =>
  del(`/feedback/${encodeURIComponent(feedbackId)}/`);

/**
 * Admin-only: Update feedback status and notes.
 * @param {string} feedbackId - Feedback UUID
 * @param {Object} data - Admin data (status, admin_notes)
 * @returns {Promise} Response with updated feedback
 */
export const adminUpdateFeedback = (feedbackId, { status, admin_notes }) =>
  patch(`/feedback/${encodeURIComponent(feedbackId)}/admin_update/`, {
    status,
    admin_notes,
  });

/**
 * Get conversation detail.
 * @param {string} conversationId - Conversation UUID
 * @returns {Promise} Response with conversation details
 */
export const getConversationDetail = (conversationId) =>
  get(`/conversations/${encodeURIComponent(conversationId)}/`);

// ─────────────────────────────────────────────────────────────
// Dashboard Statistics
// ─────────────────────────────────────────────────────────────

/**
 * Get dashboard statistics for the authenticated user.
 * @returns {Promise} Response with stats (sessions_completed, total_messages, average_score)
 */
export const getDashboardStats = () => get('/stats/dashboard/');

// ─────────────────────────────────────────────────────────────
// Rubrics v2.0 API - Frameworks, Templates, Packs
// ─────────────────────────────────────────────────────────────

// Frameworks
export const getFrameworks = () => get('/rubrics/frameworks/');
export const getFramework = (id) => get(`/rubrics/frameworks/${id}/`);
export const createFramework = (data) => post('/rubrics/frameworks/', data);
export const updateFramework = (id, data) => put(`/rubrics/frameworks/${id}/`, data);
export const deleteFramework = (id) => del(`/rubrics/frameworks/${id}/`);
export const getFrameworkSections = (frameworkId) => get(`/rubrics/frameworks/${frameworkId}/sections/`);

// Sections
export const createSection = (frameworkId, data) => post(`/rubrics/frameworks/${frameworkId}/sections/`, data);
export const updateSection = (id, data) => put(`/rubrics/sections/${id}/`, data);
export const deleteSection = (id) => del(`/rubrics/sections/${id}/`);
export const getSectionCriteria = (sectionId) => get(`/rubrics/sections/${sectionId}/criteria/`);

// Criteria
export const createCriterion = (sectionId, data) => post(`/rubrics/sections/${sectionId}/criteria/`, data);
export const updateCriterion = (id, data) => put(`/rubrics/criteria/${id}/`, data);
export const deleteCriterion = (id) => del(`/rubrics/criteria/${id}/`);

// Templates
export const getTemplates = () => get('/rubrics/templates/');
export const getTemplate = (id) => get(`/rubrics/templates/${id}/`);
export const createTemplate = (data) => post('/rubrics/templates/', data);
export const updateTemplate = (id, data) => put(`/rubrics/templates/${id}/`, data);
export const deleteTemplate = (id) => del(`/rubrics/templates/${id}/`);
export const publishTemplate = (id) => post(`/rubrics/templates/${id}/publish/`);
export const getTemplateCriteria = (templateId) => get(`/rubrics/templates/${templateId}/criteria/`);
export const addTemplateCriterion = (templateId, data) => post(`/rubrics/templates/${templateId}/criteria/`, data);
export const removeTemplateCriterion = (templateId, criterionId) => del(`/rubrics/templates/${templateId}/criteria/`, { data: { criterion: criterionId } });

// Packs
export const getPacks = () => get('/rubrics/packs/');
export const getPack = (id) => get(`/rubrics/packs/${id}/`);
export const createPack = (data) => post('/rubrics/packs/', data);
export const updatePack = (id, data) => put(`/rubrics/packs/${id}/`, data);
export const deletePack = (id) => del(`/rubrics/packs/${id}/`);
export const getPackTemplates = (packId) => get(`/rubrics/packs/${packId}/templates/`);
export const addPackTemplate = (packId, data) => post(`/rubrics/packs/${packId}/templates/`, data);
export const removePackTemplate = (packId, templateId) => del(`/rubrics/packs/${packId}/templates/`, { data: { template: templateId } });
export const getPackFullCriteria = (packId) => get(`/rubrics/packs/${packId}/full-criteria/`);

// Reference Data
export const getGMCOutcomes = () => get('/rubrics/gmc-outcomes/');
export const getMLACapabilities = () => get('/rubrics/mla-capabilities/');

// Expose the client and base URL (rare cases)
export { apiClient, API_BASE_URL };
