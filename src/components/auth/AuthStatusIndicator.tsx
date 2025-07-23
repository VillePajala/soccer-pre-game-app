'use client';

import React, { useState } from 'react';
import { useAuthHelpers } from '../../hooks/useAuthHelpers';
import { AuthModal } from './AuthModal';
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
        
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          defaultMode="signin"
        />
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