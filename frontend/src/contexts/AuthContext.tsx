import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '@/services/api';
import {
  loadStoredUser,
  loadStoredToken,
  saveStoredUser,
  saveStoredToken,
  clearAuthStorage,
} from '@/lib/auth-storage';
import type { AuthUser, AuthResult } from '@/types/auth';

interface AuthContextType {
  user: AuthUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (email: string, password: string, role?: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser);
  const [ready, setReady] = useState(false);

  const persistSession = (nextUser: AuthUser | null, token: string | null) => {
    if (nextUser && token) {
      saveStoredUser(nextUser);
      saveStoredToken(token);
      setUser(nextUser);
      return;
    }
    clearAuthStorage();
    setUser(null);
  };

  useEffect(() => {
    const validateSession = async () => {
      const token = loadStoredToken();
      if (!token) {
        clearAuthStorage();
        setUser(null);
        setReady(true);
        return;
      }

      try {
        const response = await apiService.getSession();
        if (response.success && response.data?.user) {
          saveStoredUser(response.data.user);
          setUser(response.data.user);
        } else {
          clearAuthStorage();
          setUser(null);
        }
      } catch {
        clearAuthStorage();
        setUser(null);
      } finally {
        setReady(true);
      }
    };

    validateSession();
  }, []);

  const login = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const response = await apiService.login(email, password);

      if (response.success && response.data?.user && response.data?.token) {
        persistSession(response.data.user, response.data.token);
        return { success: true, token: response.data.token };
      }

      return { success: false, message: response.message || 'Login failed' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Login failed',
      };
    }
  };

  const signup = async (email: string, password: string, role?: string): Promise<AuthResult> => {
    try {
      const response = await apiService.signup(email, password, role);

      if (response.success && response.data?.user && response.data?.token) {
        persistSession(response.data.user, response.data.token);
        return { success: true, message: response.message, token: response.data.token };
      }

      return { success: false, message: response.message || 'Signup failed' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Signup failed',
      };
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch {
      // Clear local session even if the API call fails
    }
    persistSession(null, null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        ready,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
