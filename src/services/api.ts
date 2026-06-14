import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * API Base URL - DigitalOcean Server
 * IMPORTANT: This is the live server URL
 */
export const API_BASE_URL = 'http://167.172.168.130:8000';

/**
 * Axios instance configured for the backend API
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor - Attach access token to all requests
 */
api.interceptors.request.use(
  async (config) => {
    try {
      const accessToken = await AsyncStorage.getItem('access_token');
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    } catch (error) {
      console.error('Error reading access token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - Handle token refresh on 401
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't retried yet, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (!refreshToken) {
          // No refresh token available, logout
          await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
          return Promise.reject(error);
        }

        // Call refresh endpoint
        const response = await axios.post(
          `${API_BASE_URL}/api/auth/refresh`,
          { refresh_token: refreshToken }
        );

        const { access_token, refresh_token } = response.data;

        // Store new tokens
        await AsyncStorage.setItem('access_token', access_token);
        await AsyncStorage.setItem('refresh_token', refresh_token);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

/**
 * Auth API Endpoints
 */
export const authAPI = {
  /**
   * Login with email and password
   */
  login: async (email: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append('username', email); // OAuth2 expects 'username'
    formData.append('password', password);

    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return response.data; // { access_token, refresh_token, token_type }
  },

  /**
   * Refresh access token
   */
  refresh: async (refreshToken: string) => {
    const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
      refresh_token: refreshToken,
    });
    return response.data; // { access_token, refresh_token, token_type }
  },
};

/**
 * User API Endpoints
 */
export const userAPI = {
  /**
   * Get current user info (decoded from token, or fetch from backend)
   */
  getCurrentUser: async () => {
    const response = await api.get('/api/users/me');
    return response.data;
  },

  /**
   * List all users (Admin only)
   */
  listUsers: async () => {
    const response = await api.get('/api/users/');
    return response.data;
  },

  /**
   * Create a new user (Admin only)
   */
  createUser: async (email: string, password: string, role: string) => {
    const response = await api.post('/api/users/', {
      email,
      password,
      role,
    });
    return response.data;
  },

  /**
   * Delete a user (Admin only)
   */
  deleteUser: async (userId: string) => {
    await api.delete(`/api/users/${userId}`);
  },
};

/**
 * Tenant API Endpoints
 */
export const tenantAPI = {
  /**
   * List all tenants
   */
  listTenants: async () => {
    const response = await api.get('/api/tenants/');
    return response.data;
  },

  /**
   * Get a specific tenant
   */
  getTenant: async (tenantId: string) => {
    const response = await api.get(`/api/tenants/${tenantId}`);
    return response.data;
  },

  /**
   * Create a new tenant
   */
  createTenant: async (tenantData: {
    name: string;
    move_in_date: string;
    annual_rent: number;
    termination_date?: string;
    notes?: string;
  }) => {
    const response = await api.post('/api/tenants/', tenantData);
    return response.data;
  },

  /**
   * Update a tenant
   */
  updateTenant: async (
    tenantId: string,
    tenantData: {
      name?: string;
      move_in_date?: string;
      annual_rent?: number;
      termination_date?: string;
      notes?: string;
    }
  ) => {
    const response = await api.put(`/api/tenants/${tenantId}`, tenantData);
    return response.data;
  },

  /**
   * Delete a tenant
   */
  deleteTenant: async (tenantId: string) => {
    await api.delete(`/api/tenants/${tenantId}`);
  },
};

/**
 * Payment API Endpoints
 */
export const paymentAPI = {
  /**
   * List all payments (optionally filter by tenant)
   */
  listPayments: async (tenantId?: string) => {
    const params = tenantId ? { tenant_id: tenantId } : {};
    const response = await api.get('/api/payments/', { params });
    return response.data;
  },

  /**
   * Get a specific payment
   */
  getPayment: async (paymentId: string) => {
    const response = await api.get(`/api/payments/${paymentId}`);
    return response.data;
  },

  /**
   * Create a new payment
   */
  createPayment: async (paymentData: {
    tenant_id: string;
    payment_date: string;
    amount: number;
  }) => {
    const response = await api.post('/api/payments/', paymentData);
    return response.data;
  },

  /**
   * Delete a payment
   */
  deletePayment: async (paymentId: string) => {
    await api.delete(`/api/payments/${paymentId}`);
  },
};
