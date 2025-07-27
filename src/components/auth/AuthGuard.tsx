'use client';

import React, { useState } from 'react';
import { useAuthHelpers } from '../../hooks/useAuthHelpers';
import { AuthModal } from './AuthModal';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
  showAuthModal?: boolean;
}

/**
 * AuthGuard component that protects routes/components based on authentication status
 */
export function AuthGuard({ 
  children, 
  fallback, 
  requireAuth = false,
  showAuthModal = true 
}: AuthGuardProps) {
  const { isAnonymous, loading } = useAuthHelpers();
  const [showModal, setShowModal] = useState(showAuthModal && requireAuth);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8" data-testid="auth-loading">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If auth is required but user is not authenticated
  if (requireAuth && isAnonymous()) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <>
        <div data-testid="auth-required" className="text-center p-8 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Authentication Required
          </h3>
          <p className="text-gray-600 mb-4">
            You need to sign in to access this feature.
          </p>
          {showAuthModal && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              data-testid="open-auth-modal"
            >
              Sign In
            </button>
          )}
        </div>

        {showAuthModal && (
          <AuthModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            defaultMode="signin"
          />
        )}
      </>
    );
  }

  // Render children if auth requirements are met
  return <>{children}</>;
}

/**
 * Higher-order component for protecting entire components
 */
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<AuthGuardProps, 'children'> = {}
) {
  return function AuthGuardedComponent(props: P) {
    return (
      <AuthGuard {...options}>
        <Component {...props} />
      </AuthGuard>
    );
  };
}