'use client';

import React, { useState } from 'react';
import { useOfflineManager } from '../../hooks/useOfflineManager';
import logger from '@/utils/logger';

/**
 * Offline settings component for managing offline capabilities
 */
export function OfflineSettings() {
  const {
    isOnline,
    offlineStatus,
    isLoading,
    error,
    triggerSync,
    clearOfflineData,
    hasOfflineData,
    syncQueueSize,
    needsSync,
  } = useOfflineManager();

  const [isClearing, setIsClearing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleClearOfflineData = async () => {
    if (!confirm('This will delete all offline data. Are you sure?')) {
      return;
    }

    setIsClearing(true);
    try {
      await clearOfflineData();
    } catch (err) {
      logger.error('Failed to clear offline data:', err);
    } finally {
      setIsClearing(false);
    }
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      await triggerSync();
    } catch (err) {
      logger.error('Failed to trigger sync:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Offline & Sync
        </h3>
        <p className="text-sm text-gray-600">
          Manage offline data storage and synchronization settings.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Connection Status */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Connection Status</h4>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Status:</span>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-sm font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
          
          {offlineStatus?.lastSuccessfulSync && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Last Sync:</span>
              <span className="text-sm text-gray-600">
                {new Date(offlineStatus.lastSuccessfulSync).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Offline Data Status */}
      {hasOfflineData && (
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-3">Offline Data</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-blue-700">Cached Data:</span>
              <span className="text-sm font-medium text-blue-900">Available</span>
            </div>
            
            {syncQueueSize > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-blue-700">Pending Sync:</span>
                <span className="text-sm font-medium text-blue-900">
                  {syncQueueSize} operation{syncQueueSize !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sync Queue Status */}
      {needsSync && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-900 mb-2">Sync Required</h4>
          <p className="text-sm text-yellow-800 mb-3">
            You have {syncQueueSize} operation{syncQueueSize !== 1 ? 's' : ''} waiting to sync.
          </p>
          {isOnline && (
            <button
              onClick={handleTriggerSync}
              disabled={isSyncing}
              className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700 disabled:opacity-50"
            >
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        {/* Manual Sync */}
        {isOnline && (
          <button
            onClick={handleTriggerSync}
            disabled={isSyncing}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSyncing ? 'Syncing...' : 'Force Sync'}
          </button>
        )}

        {/* Clear Offline Data */}
        {hasOfflineData && (
          <button
            onClick={handleClearOfflineData}
            disabled={isClearing}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {isClearing ? 'Clearing...' : 'Clear Offline Data'}
          </button>
        )}
      </div>

      {/* Information */}
      <div className="text-xs text-gray-500 space-y-2">
        <p>
          <strong>Offline Mode:</strong> The app automatically caches data for offline use. 
          Changes made offline will sync when you&apos;re back online.
        </p>
        <p>
          <strong>Background Sync:</strong> Data syncs automatically in the background when 
          your connection is restored.
        </p>
      </div>
    </div>
  );
}