export interface AuthUser {
  userId: string;
  email: string;
  name: string;
  role: 'manager' | 'supervisor' | string;
}

export interface AuthResult {
  success: boolean;
  message?: string;
}
