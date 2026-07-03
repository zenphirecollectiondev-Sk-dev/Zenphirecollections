import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ('customer' | 'admin')[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { session, profile, loading } = useAuthStore();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs tracking-widest text-text-secondary uppercase">Loading</p>
      </div>
    );
  }

  if (!session) {
    // Redirect to login, saving the original page they tried to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Intercept if onboarding is incomplete
  if (profile && (!profile.dob || !profile.gender) && location.pathname !== '/onboarding') {
    return <Navigate to={`/onboarding?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    // Role not authorized, redirect to homepage or show access denied
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
