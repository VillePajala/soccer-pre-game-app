'use client';

import React, { useState } from 'react';
import { useAuthHelpers } from '../../hooks/useAuthHelpers';
// Lazy load AuthModal since it's only used conditionally
const AuthModal = React.lazy(() => import('./AuthModal').then(module => ({
  default: module.AuthModal
})));

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
  const [showModal, setShowModal] = useState(false);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
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
        <div className="text-center p-8 bg-gray-50 rounded-lg">
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
            >
              Sign In
            </button>
          )}
        </div>

        {showAuthModal && (
          <React.Suspense 
            fallback={
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-slate-800 rounded-lg p-6 w-96 max-w-90vw">
                  <div className="animate-pulse">
                    <div className="h-6 bg-slate-700 rounded mb-4"></div>
                    <div className="h-4 bg-slate-700 rounded mb-2"></div>
                    <div className="h-4 bg-slate-700 rounded mb-4"></div>
                    <div className="h-10 bg-slate-700 rounded"></div>
                  </div>
                </div>
              </div>
            }
          >
            <AuthModal
              isOpen={showModal}
              onClose={() => setShowModal(false)}
              defaultMode="signin"
            />
          </React.Suspense>
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