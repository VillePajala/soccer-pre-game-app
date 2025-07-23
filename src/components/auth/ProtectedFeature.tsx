'use client';

import React from 'react';
import { AuthGuard } from './AuthGuard';

interface ProtectedFeatureProps {
  children: React.ReactNode;
  featureName: string;
  description?: string;
}

/**
 * Wrapper for features that require authentication
 * Provides a user-friendly message about why auth is needed
 */
export function ProtectedFeature({ 
  children, 
  featureName, 
  description 
}: ProtectedFeatureProps) {
  const fallback = (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
      <div className="mb-4">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {featureName} Requires Account
      </h3>
      <p className="text-gray-500 mb-4">
        {description || `Sign in to access ${featureName.toLowerCase()} and sync your data across devices.`}
      </p>
      <p className="text-sm text-gray-400">
        Your data will be securely stored and available on all your devices.
      </p>
    </div>
  );

  return (
    <AuthGuard 
      requireAuth={true} 
      fallback={fallback}
      showAuthModal={true}
    >
      {children}
    </AuthGuard>
  );
}