import React, { createContext, useContext, useState, ReactNode } from 'react';
import { apiService } from '@/services/api';
import { loadStoredUser, saveStoredUser } from '@/lib/auth-storage';
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

  const persistUser = (nextUser: AuthUser | null) => {
    saveStoredUser(nextUser);
    setUser(nextUser);
  };

  const login = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const response = await apiService.login(email, password);

      if (response.success && response.data?.user) {
        persistUser(response.data.user);
        return { success: true };
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

      if (response.success && response.data?.user) {
        persistUser(response.data.user);
        return { success: true, message: response.message };
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
    persistUser(null);
  };

  const storedUser = loadStoredUser();
  const activeUser = user ?? storedUser;

  return (
    <AuthContext.Provider
      value={{
        user: activeUser,
        ready: true,
        login,
        signup,
        logout,
        isAuthenticated: !!activeUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
