import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export const authAPI = {
  login: (email, password) => axios.post(`${API_BASE_URL}/auth/login`, { email, password }),
  register: (name, email, password) => axios.post(`${API_BASE_URL}/auth/register`, { name, email, password }),
};

export const taskAPI = {
  getAllTasks: () => axiosInstance.get('/tasks'),
  getTaskById: (id) => axiosInstance.get(`/tasks/${id}`),
  createTask: (taskData) => axiosInstance.post('/tasks', taskData),
  updateTask: (id, taskData) => axiosInstance.put(`/tasks/${id}`, taskData),
  deleteTask: (id) => axiosInstance.delete(`/tasks/${id}`),
  getTaskStats: () => axiosInstance.get('/tasks/stats'),
};

export const activityAPI = {
  getAll: () => axiosInstance.get('/activities'),
};

export const userAPI = {
  getProfile: () => axiosInstance.get('/user/profile'),
  updateProfile: (profileData) => axiosInstance.put('/user/profile', profileData),
  changePassword: (currentPassword, newPassword) =>
    axiosInstance.put('/user/password', { currentPassword, newPassword }),
  getPreferences: () => axiosInstance.get('/user/preferences'),
  updatePreferences: (preferences) => axiosInstance.put('/user/preferences', preferences),
};

export const contactAPI = {
  submit: (payload) => axiosInstance.post('/contact', payload),
};

export const handleAPIError = (error) => {
  if (error.response) {
    return {
      status: error.response.status,
      message: error.response.data?.message || error.response.data?.detail || 'An error occurred',
    };
  }

  if (error.request) {
    return {
      status: 0,
      message: 'No response from server. Please check your connection.',
    };
  }

  return {
    status: 0,
    message: error.message || 'An error occurred',
  };
};

export default axiosInstance;
