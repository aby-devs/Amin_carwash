import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { loadStoredUser } from '@/lib/auth-storage';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();
  const authed = isAuthenticated || !!loadStoredUser();

  if (!authed) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
