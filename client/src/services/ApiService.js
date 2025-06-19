import axios from 'axios';

const API_URL = 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Login user
 * @param {Object} credentials - Login credentials
 * @param {string} credentials.email - User email
 * @param {string} credentials.password - User password
 * @returns {Promise<Object>} User data
 */
export const login = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

/**
 * Register new user
 * @param {Object} userData - User registration data
 * @param {string} userData.email - User email
 * @param {string} userData.password - User password
 * @returns {Promise<Object>} User data
 */
export const register = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

/**
 * Process a query through the agent system
 * @param {Object} body - The request body
 * @param {string} body.message - The query message to process
 * @param {string} [body.userId] - Optional user identifier
 * @param {string} [body.csp] - Optional Cloud Service Provider
 * @param {Object} [body.payload] - Optional additional data
 * @returns {Promise<Object>} Response from the agent system
 */
export const processQuery = async (body) => {
  const response = await api.post('/process-query', body);
  return response.data;
};

/**
 * Get system metrics
 * @returns {Promise<Object>} System metrics data
 */
export const getMetrics = async () => {
  const response = await api.post('/metrics');
  return response.data;
};

export const getUserConversations = async (userId) => {
  const response = await api.get('/conversations');
  return response.data;
};

export const getChatHistory = async (chatId, userId) => {
  try {
    const response = await api.get(`/get-conversation/${userId}/${chatId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching chat history:', error);
    throw error;
  }
};
