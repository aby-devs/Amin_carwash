import type { AuthUser } from '@/types/auth';

export const USER_STORAGE_KEY = 'car_wash_user';
export const TOKEN_STORAGE_KEY = 'car_wash_token';

export const loadStoredUser = (): AuthUser | null => {
  try {
    const saved = localStorage.getItem(USER_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

export const loadStoredToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const saveStoredUser = (user: AuthUser | null) => {
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
};

export const saveStoredToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
};

export const clearAuthStorage = () => {
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem(TOKEN_STORAGE_KEY);
};
