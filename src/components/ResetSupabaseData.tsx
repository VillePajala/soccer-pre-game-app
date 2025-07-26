'use client';

import React, { useState } from 'react';
import { resetAllSupabaseData } from '@/utils/resetSupabaseData';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/config/queryKeys';

interface ResetSupabaseDataProps {
  onSuccess?: () => void;
}

export const ResetSupabaseData: React.FC<ResetSupabaseDataProps> = ({ onSuccess }) => {
  const [isResetting, setIsResetting] = useState(false);
  const [resetResult, setResetResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const queryClient = useQueryClient();

  const handleResetClick = () => {
    setShowConfirm(true);
    setResetResult(null);
  };

  const handleConfirmReset = async () => {
    setIsResetting(true);
    setShowConfirm(false);

    try {
      const result = await resetAllSupabaseData();
      setResetResult(result);
      
      if (result.success) {
        // Invalidate all queries to refresh data
        await queryClient.invalidateQueries({ queryKey: queryKeys.masterRoster });
        await queryClient.invalidateQueries({ queryKey: queryKeys.seasons });
        await queryClient.invalidateQueries({ queryKey: queryKeys.tournaments });
        await queryClient.invalidateQueries({ queryKey: queryKeys.savedGames });
        await queryClient.invalidateQueries({ queryKey: queryKeys.appSettingsCurrentGameId });
        
        // Call success callback after a delay
        setTimeout(() => {
          onSuccess?.();
        }, 2000);
      }
    } catch (error) {
      setResetResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reset data'
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleCancelReset = () => {
    setShowConfirm(false);
  };

  return (
    <div className="space-y-4">
      {!showConfirm ? (
        <>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
              Reset Supabase Data
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mb-4">
              ⚠️ WARNING: This will permanently delete ALL your data from Supabase including:
            </p>
            <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300 mb-4 space-y-1">
              <li>All saved games</li>
              <li>All players</li>
              <li>All seasons</li>
              <li>All tournaments</li>
              <li>All app settings</li>
            </ul>
            <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-4">
              This action cannot be undone!
            </p>
            
            <button
              onClick={handleResetClick}
              disabled={isResetting}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
            >
              {isResetting ? 'Resetting...' : 'Reset All Data'}
            </button>
          </div>

          {resetResult && (
            <div className={`p-3 rounded-md ${
              resetResult.success 
                ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
            }`}>
              <p className="text-sm">{resetResult.message}</p>
            </div>
          )}
        </>
      ) : (
        <div className="p-4 bg-red-100 dark:bg-red-900/40 rounded-lg border-2 border-red-500">
          <h3 className="text-lg font-bold text-red-800 dark:text-red-200 mb-4">
            ⚠️ Final Confirmation
          </h3>
          <p className="text-red-700 dark:text-red-300 mb-4">
            Are you absolutely sure you want to delete ALL your data from Supabase?
          </p>
          <p className="text-sm text-red-600 dark:text-red-400 mb-6">
            Type &quot;DELETE ALL&quot; to confirm:
          </p>
          <input
            type="text"
            className="w-full px-3 py-2 border border-red-300 rounded-md mb-4 dark:bg-gray-800 dark:border-red-600"
            placeholder="Type DELETE ALL to confirm"
            onChange={(e) => {
              const confirmButton = document.getElementById('confirm-delete-btn') as HTMLButtonElement;
              if (confirmButton) {
                confirmButton.disabled = e.target.value !== 'DELETE ALL';
              }
            }}
          />
          <div className="flex gap-2">
            <button
              id="confirm-delete-btn"
              onClick={handleConfirmReset}
              disabled={true}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
            >
              Yes, Delete Everything
            </button>
            <button
              onClick={handleCancelReset}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};