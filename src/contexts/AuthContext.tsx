import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, userAPI } from '../services/api';

/**
 * User Roles for RBAC (Role-Based Access Control)
 */
export type UserRole = 'admin' | 'rent_collector' | 'spectator';

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
      const storedUser = await AsyncStorage.getItem('user');
      const accessToken = await AsyncStorage.getItem('access_token');

      if (storedUser && accessToken) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading user from storage:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Login with backend API
   */
  const login = async (email: string, password: string): Promise<void> => {
    try {
      // Call backend login API
      const response = await authAPI.login(email, password);
      const { access_token, refresh_token } = response;

      // Store tokens
      await AsyncStorage.setItem('access_token', access_token);
      await AsyncStorage.setItem('refresh_token', refresh_token);

      // Decode token to get user info (or fetch from backend)
      // For now, we'll create a simple user object from the email
      // You may want to add a /me endpoint to fetch full user details
      const userData: User = {
        id: email, // Temporary - replace with actual user ID from backend
        email: email,
        role: 'admin', // Temporary - should come from backend
        name: email.split('@')[0],
      };

      // Store user data
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.response?.data?.detail || 'Login failed. Please check your credentials.');
    }
  };

  /**
   * Logout Function
   */
  const logout = async () => {
    try {
      // Clear tokens and user data from AsyncStorage
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
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
