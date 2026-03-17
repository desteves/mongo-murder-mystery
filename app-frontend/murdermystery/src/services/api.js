import axios from 'axios';

/**
 * API Service for MongoDB Murder Mystery
 * Centralizes all API calls and configuration
 */

// Get API configuration from environment variables
const API_BASE_URL = import.meta.env.VITE_MMM_API_BASE_URL || 'https://mmm-be-vud27cynqa-uc.a.run.app';
const API_KEY = import.meta.env.VITE_MMM_API_KEY || 'mmm-frontend-M4rCHm4ddn3$$-2026';

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY
  }
});

// Request interceptor for logging (development only)
apiClient.interceptors.request.use(
  (config) => {
    if (import.meta.env.DEV) {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, config.params || config.data);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle different error scenarios
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      // Check for HTML response (misconfigured endpoint)
      if (typeof data === 'string' && data.toLowerCase().includes('<!doctype html')) {
        error.userMessage = 'The API endpoint is misconfigured. Please contact support.';
      } else if (data?.err || data?.error) {
        error.userMessage = data.err || data.error;
      } else {
        error.userMessage = getErrorMessageForStatus(status);
      }
    } else if (error.request) {
      // Request made but no response received
      error.userMessage = 'Unable to reach the server. Please check your internet connection.';
    } else {
      // Something else happened
      error.userMessage = 'An unexpected error occurred. Please try again.';
    }

    if (import.meta.env.DEV) {
      console.error('[API Error]', error);
    }

    return Promise.reject(error);
  }
);

/**
 * Get user-friendly error message for HTTP status codes
 */
function getErrorMessageForStatus(status) {
  const messages = {
    400: 'Invalid request. Please check your input.',
    401: 'Authentication failed. Please refresh the page.',
    403: 'Access denied.',
    404: 'Resource not found.',
    408: 'Request timeout. Please try again.',
    429: 'Too many requests. Please slow down and try again in a minute.',
    500: 'Server error. Please try again later.',
    503: 'Service temporarily unavailable. Please try again later.'
  };

  return messages[status] || `An error occurred (${status}). Please try again.`;
}

/**
 * API Service Methods
 */
export const apiService = {
  /**
   * Execute a MongoDB query
   * @param {string} query - The MongoDB query string
   * @param {string} language - Query language (default: 'mongosh')
   * @returns {Promise<any>} Query results
   */
  async executeQuery(query, language = 'mongosh') {
    try {
      const response = await apiClient.get('/eval', {
        params: { query, language }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Send a prompt to the AI agent
   * @param {string} prompt - The user's prompt
   * @returns {Promise<{reply: string}>} Agent's reply
   */
  async sendAgentPrompt(prompt) {
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      throw new Error('Prompt cannot be empty');
    }

    const MAX_PROMPT_LENGTH = 512;
    if (prompt.length > MAX_PROMPT_LENGTH) {
      throw new Error(`Prompt is too long (max ${MAX_PROMPT_LENGTH} characters)`);
    }

    try {
      const response = await apiClient.post('/agent', { prompt: prompt.trim() });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Check API health
   * @returns {Promise<{status: string, timestamp: string}>}
   */
  async checkHealth() {
    try {
      // Health endpoint doesn't require API key
      const response = await axios.get(`${API_BASE_URL}/health`, {
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default apiService;
