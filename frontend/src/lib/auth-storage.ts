import type { AuthUser } from '@/types/auth';

export const USER_STORAGE_KEY = 'car_wash_user';

export const loadStoredUser = (): AuthUser | null => {
  try {
    const saved = localStorage.getItem(USER_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
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
