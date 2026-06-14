import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { authAPI, userAPI } from '../services/api';

/**
 * User Roles for RBAC (Role-Based Access Control)
 */
export type UserRole = 'admin' | 'rent_collector' | 'spectator';

/**
 * JWT Token Payload Interface
 */
interface JWTPayload {
  sub: string; // email
  role: UserRole;
  exp: number;
  type: string;
}

/**
 * User Interface
 */
export interface User {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
}

/**
 * Auth Context Interface
 */
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  // Helper functions for role-based access
  isAdmin: () => boolean;
  isRentCollector: () => boolean;
  isSpectator: () => boolean;
  canAddPayments: () => boolean;
  canEditTenants: () => boolean;
  canDeleteTenants: () => boolean;
  canManageTeam: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load user from storage on app start
   */
  useEffect(() => {
    loadUserFromStorage();
  }, []);

  const loadUserFromStorage = async () => {
    try {
      console.log('📱 AuthContext: Loading user from storage...');
      const storedUser = await AsyncStorage.getItem('user');
      const accessToken = await AsyncStorage.getItem('access_token');

      if (storedUser && accessToken) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        console.log('✅ AuthContext: User loaded from storage:', userData.email);
      } else {
        console.log('ℹ️ AuthContext: No stored user found');
      }
    } catch (error) {
      console.error('❌ AuthContext: Error loading user from storage:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Login with backend API
   */
  const login = async (email: string, password: string): Promise<void> => {
    try {
      console.log('🔑 AuthContext: Starting login for:', email);

      // Call backend login API
      const response = await authAPI.login(email, password);
      const { access_token, refresh_token } = response;

      console.log('✅ AuthContext: Login API successful, storing tokens...');

      // Store tokens
      await AsyncStorage.setItem('access_token', access_token);
      await AsyncStorage.setItem('refresh_token', refresh_token);

      // Decode JWT token to extract user info
      console.log('🔓 AuthContext: Decoding JWT token...');
      const decodedToken = jwtDecode<JWTPayload>(access_token);
      console.log('✅ AuthContext: Token decoded:', {
        email: decodedToken.sub,
        role: decodedToken.role,
        exp: new Date(decodedToken.exp * 1000).toISOString(),
      });

      // Create user object from decoded token
      const userData: User = {
        id: decodedToken.sub, // Use email as ID for now
        email: decodedToken.sub,
        role: decodedToken.role, // Role from JWT token
        name: decodedToken.sub.split('@')[0],
      };

      // Store user data
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      console.log('✅ AuthContext: Login complete, user data stored with role:', userData.role);
    } catch (error: any) {
      console.error('❌ AuthContext: Login error:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        request: error.request ? 'Request made but no response' : 'Request not made',
        code: error.code,
        isNetworkError: !error.response,
      });

      // Provide user-friendly error message
      let errorMessage = 'Login failed. Please check your credentials.';
      if (!error.response) {
        errorMessage = 'Network error. Cannot reach the server. Please check your internet connection.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Invalid email or password.';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }

      throw new Error(errorMessage);
    }
  };

  /**
   * Logout Function
   */
  const logout = async () => {
    try {
      console.log('🚪 AuthContext: Logging out...');
      // Clear tokens and user data from AsyncStorage
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
      setUser(null);
      console.log('✅ AuthContext: Logout complete');
    } catch (error) {
      console.error('❌ AuthContext: Logout error:', error);
    }
  };

  // Role check helpers
  const isAdmin = () => user?.role === 'admin';
  const isRentCollector = () => user?.role === 'rent_collector';
  const isSpectator = () => user?.role === 'spectator';

  // Permission helpers
  const canAddPayments = () => user?.role === 'admin' || user?.role === 'rent_collector';
  const canEditTenants = () => user?.role === 'admin' || user?.role === 'rent_collector';
  const canDeleteTenants = () => user?.role === 'admin';
  const canManageTeam = () => user?.role === 'admin';

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    isAdmin,
    isRentCollector,
    isSpectator,
    canAddPayments,
    canEditTenants,
    canDeleteTenants,
    canManageTeam,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook to use Auth Context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
