import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export const OnboardingGuard = ({ children }: { children: React.ReactNode }) => {
  const { userData, user, loading } = useAuthStore();
  const location = useLocation();

  // Don't redirect while loading or if not logged in
  if (loading) return null;
  if (!user) return <>{children}</>;

  // If onboarding is explicitly false and we are not on the onboarding page, redirect
  if (userData && userData.onboardingCompleted === false && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // If on onboarding page but already completed, go to home
  if (userData && userData.onboardingCompleted !== false && location.pathname === '/onboarding') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
