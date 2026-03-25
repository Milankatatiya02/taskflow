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

// Auto-refresh token on 401
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('refreshToken', res.data.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${res.data.token}`;
          return axiosInstance(originalRequest);
        } catch {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('taskflow_user');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

export const authAPI = {
  login: (email, password) => axios.post(`${API_BASE_URL}/auth/login`, { email, password }),
  register: (name, email, password) => axios.post(`${API_BASE_URL}/auth/register`, { name, email, password }),
  refresh: (refreshToken) => axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken }),
  forgotPassword: (email) => axios.post(`${API_BASE_URL}/auth/forgot-password`, { email }),
  resetPassword: (token, newPassword) => axios.post(`${API_BASE_URL}/auth/reset-password`, { token, newPassword }),
};

export const taskAPI = {
  getAllTasks: () => axiosInstance.get('/tasks'),
  getTaskById: (id) => axiosInstance.get(`/tasks/${id}`),
  createTask: (taskData) => axiosInstance.post('/tasks', taskData),
  updateTask: (id, taskData) => axiosInstance.put(`/tasks/${id}`, taskData),
  deleteTask: (id) => axiosInstance.delete(`/tasks/${id}`),
  getTaskStats: () => axiosInstance.get('/tasks/stats'),
  bulkAction: (taskIds, action, status) => axiosInstance.post('/tasks/bulk-action', { taskIds, action, status }),
};

export const dashboardAPI = {
  getStats: () => axiosInstance.get('/dashboard/stats'),
};

export const activityAPI = {
  getAll: () => axiosInstance.get('/activities'),
};

export const userAPI = {
  getProfile: () => axiosInstance.get('/user/profile'),
  updateProfile: (profileData) => axiosInstance.put('/user/profile', profileData),
  changePassword: (currentPassword, newPassword) =>
    axiosInstance.put('/user/password', { currentPassword, newPassword }),
  deleteAccount: () => axiosInstance.delete('/user/account'),
  getPreferences: () => axiosInstance.get('/user/preferences'),
  updatePreferences: (preferences) => axiosInstance.put('/user/preferences', preferences),
};

export const notificationAPI = {
  getAll: () => axiosInstance.get('/notifications'),
  getUnreadCount: () => axiosInstance.get('/notifications/unread-count'),
  markAsRead: (id) => axiosInstance.put(`/notifications/${id}/read`),
  markAllRead: () => axiosInstance.put('/notifications/read-all'),
};

export const projectAPI = {
  getAll: () => axiosInstance.get('/projects'),
  create: (data) => axiosInstance.post('/projects', data),
  update: (id, data) => axiosInstance.put(`/projects/${id}`, data),
  delete: (id) => axiosInstance.delete(`/projects/${id}`),
  invite: (id, email) => axiosInstance.post(`/projects/${id}/invite`, { email }),
  getTasks: (id) => axiosInstance.get(`/projects/${id}/tasks`),
};

export const labelAPI = {
  getAll: () => axiosInstance.get('/labels'),
  create: (data) => axiosInstance.post('/labels', data),
  delete: (id) => axiosInstance.delete(`/labels/${id}`),
};

export const templateAPI = {
  getAll: () => axiosInstance.get('/task-templates'),
  create: (data) => axiosInstance.post('/task-templates', data),
  delete: (id) => axiosInstance.delete(`/task-templates/${id}`),
};

export const uploadAPI = {
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosInstance.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
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
