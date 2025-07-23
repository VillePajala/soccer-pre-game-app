'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAuthHelpers } from '../../hooks/useAuthHelpers';

interface UserProfileProps {
  onClose?: () => void;
}

export function UserProfile({ onClose }: UserProfileProps) {
  const { signOut } = useAuth();
  const { user, getUserEmail, isEmailVerified } = useAuthHelpers();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await signOut();
      if (error) {
        setError(error.message);
      } else {
        onClose?.();
      }
    } catch {
      setError('Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow-lg border">
      {onClose && (
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Profile</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            type="button"
          >
            ✕
          </button>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <p className="text-sm text-gray-900">{getUserEmail()}</p>
          {!isEmailVerified() && (
            <p className="text-xs text-orange-600 mt-1">Email not verified</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">User ID</label>
          <p className="text-xs text-gray-600 font-mono">{user.id}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Member Since</label>
          <p className="text-sm text-gray-900">
            {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
          </p>
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        <div className="pt-2 border-t">
          <button
            onClick={handleSignOut}
            disabled={loading}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </div>
    </div>
  );
}