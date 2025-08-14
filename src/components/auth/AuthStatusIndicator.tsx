'use client';

import React, { useState } from 'react';
import { useAuthHelpers } from '../../hooks/useAuthHelpers';
// Lazy load AuthModal since it's only used conditionally
const AuthModal = React.lazy(() => import('./AuthModal').then(module => ({
  default: module.AuthModal
})));
import { UserProfile } from './UserProfile';

export function AuthStatusIndicator() {
  const { isAuthenticated, isAnonymous, getUserEmail, loading } = useAuthHelpers();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 bg-gray-300 rounded-full animate-pulse"></div>
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  if (isAnonymous()) {
    return (
      <>
        <button
          onClick={() => setShowAuthModal(true)}
          className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700 transition-colors"
        >
          Sign In
        </button>
        
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
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            defaultMode="signin"
          />
        </React.Suspense>
      </>
    );
  }

  if (isAuthenticated()) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowProfile(!showProfile)}
          className="flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1 rounded-md text-sm hover:bg-green-200 transition-colors"
        >
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="truncate max-w-32">{getUserEmail()}</span>
        </button>

        {showProfile && (
          <div className="absolute right-0 top-full mt-2 z-50">
            <UserProfile onClose={() => setShowProfile(false)} />
          </div>
        )}
      </div>
    );
  }

  return null;
}