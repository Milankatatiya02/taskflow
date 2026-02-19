import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance with default headers
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add Authorization token to requests
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ==================== AUTH ENDPOINTS ====================
export const authAPI = {
  login: (email, password) =>
    axios.post(`${API_BASE_URL}/auth/login`, { email, password }),
  
  register: (name, email, password) =>
    axios.post(`${API_BASE_URL}/auth/register`, { name, email, password }),
};

// ==================== TASK ENDPOINTS ====================
export const taskAPI = {
  getAllTasks: () =>
    axiosInstance.get('/tasks'),
  
  getTaskById: (id) =>
    axiosInstance.get(`/tasks/${id}`),
  
  createTask: (taskData) =>
    axiosInstance.post('/tasks', taskData),
  
  updateTask: (id, taskData) =>
    axiosInstance.put(`/tasks/${id}`, taskData),
  
  deleteTask: (id) =>
    axiosInstance.delete(`/tasks/${id}`),
  
  getTaskStats: () =>
    axiosInstance.get('/tasks/stats'),
};

// ==================== USER ENDPOINTS ====================
export const userAPI = {
  getProfile: () =>
    axiosInstance.get('/user/profile'),
  
  updateProfile: (profileData) =>
    axiosInstance.put('/user/profile', profileData),
  
  changePassword: (currentPassword, newPassword) =>
    axiosInstance.put('/user/password', { currentPassword, newPassword }),
  
  getPreferences: () =>
    axiosInstance.get('/user/preferences'),
  
  updatePreferences: (preferences) =>
    axiosInstance.put('/user/preferences', preferences),
};

// ==================== ERROR HANDLER ====================
export const handleAPIError = (error) => {
  if (error.response) {
    // Server responded with error status
    return {
      status: error.response.status,
      message: error.response.data?.message || error.response.data?.detail || 'An error occurred',
    };
  } else if (error.request) {
    // Request made but no response
    return {
      status: 0,
      message: 'No response from server. Please check your connection.',
    };
  } else {
    // Error in request setup
    return {
      status: 0,
      message: error.message || 'An error occurred',
    };
  }
};

export default axiosInstance;
