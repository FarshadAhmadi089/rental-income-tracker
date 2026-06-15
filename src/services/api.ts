import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * API Base URL - Production Server with HTTPS
 * IMPORTANT: This is the live server URL
 */
const DEFAULT_API_URL = 'https://api.takamul-cars.com';

/**
 * Sanitize URL by removing trailing slashes
 * Prevents malformed double-slash endpoints
 */
export const sanitizeUrl = (url: string): string => {
  return url.replace(/\/+$/, '');
};

export const API_BASE_URL = sanitizeUrl(DEFAULT_API_URL);

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

      // Enhanced logging
      console.log('📤 API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL,
        fullURL: `${config.baseURL}${config.url}`,
        headers: config.headers,
      });
    } catch (error) {
      console.error('❌ Error reading access token:', error);
    }
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', {
      message: error.message,
      stack: error.stack,
    });
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - Handle token refresh on 401
 */
api.interceptors.response.use(
  (response) => {
    // Enhanced logging for successful responses
    console.log('✅ API Response:', {
      status: response.status,
      statusText: response.statusText,
      url: response.config.url,
      data: response.data,
    });
    return response;
  },
  async (error) => {
    // Enhanced error logging
    console.error('❌ API Response Error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      fullURL: error.config ? `${error.config.baseURL}${error.config.url}` : 'N/A',
      responseData: error.response?.data,
      request: error.request ? 'Request sent but no response received' : 'Request not sent',
      code: error.code,
      isNetworkError: error.message.includes('Network') || !error.response,
    });

    const originalRequest = error.config;

    // If 401 and we haven't retried yet, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (!refreshToken) {
          // No refresh token available, logout
          console.warn('⚠️ No refresh token available, logging out');
          await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
          return Promise.reject(error);
        }

        console.log('🔄 Attempting to refresh token...');

        // Call refresh endpoint
        const response = await axios.post(
          `${API_BASE_URL}/api/auth/refresh`,
          { refresh_token: refreshToken }
        );

        const { access_token, refresh_token } = response.data;

        // Store new tokens
        await AsyncStorage.setItem('access_token', access_token);
        await AsyncStorage.setItem('refresh_token', refresh_token);

        console.log('✅ Token refreshed successfully');

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError: any) {
        // Refresh failed, logout
        console.error('❌ Token refresh failed:', {
          message: refreshError.message,
          status: refreshError.response?.status,
          data: refreshError.response?.data,
        });
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
   * Uses OAuth2 form-data format (application/x-www-form-urlencoded)
   */
  login: async (email: string, password: string) => {
    try {
      console.log('🔐 Attempting login...', {
        email,
        endpoint: `${API_BASE_URL}/api/auth/login`,
      });

      const formData = new URLSearchParams();
      formData.append('username', email); // OAuth2 expects 'username'
      formData.append('password', password);

      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      console.log('✅ Login successful');
      return response.data; // { access_token, refresh_token, token_type }
    } catch (error: any) {
      console.error('❌ Login failed:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        request: error.request ? 'Request made but no response' : 'Request not made',
        code: error.code,
        url: `${API_BASE_URL}/api/auth/login`,
      });
      throw error;
    }
  },

  /**
   * Refresh access token
   */
  refresh: async (refreshToken: string) => {
    try {
      console.log('🔄 Refreshing token...');
      const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
        refresh_token: refreshToken,
      });
      console.log('✅ Token refresh successful');
      return response.data; // { access_token, refresh_token, token_type }
    } catch (error: any) {
      console.error('❌ Token refresh failed:', {
        message: error.message,
        status: error.response?.status,
        responseData: error.response?.data,
      });
      throw error;
    }
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

  /**
   * Change own password (All users)
   */
  changeOwnPassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.patch('/api/users/me/password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  },

  /**
   * Change any user's password (Admin only)
   */
  changeUserPassword: async (userId: string, newPassword: string) => {
    const response = await api.patch(`/api/users/${userId}/password`, {
      new_password: newPassword,
    });
    return response.data;
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
