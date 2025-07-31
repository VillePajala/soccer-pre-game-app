'use client';

import { useState } from 'react';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { useSyncProgress } from '@/hooks/useSyncProgress';

interface ConnectionStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export const ConnectionStatusIndicator = ({ 
  className = '', 
  showDetails = false 
}: ConnectionStatusIndicatorProps) => {
  const { isOnline, isSupabaseReachable, connectionQuality, lastChecked, checkConnection } = useConnectionStatus();
  const { isActive, pendingCount, failedCount, overallProgress } = useSyncProgress();
  const [showTooltip, setShowTooltip] = useState(false);

  const getStatusColor = () => {
    if (!isOnline) return 'text-red-500';
    if (!isSupabaseReachable) return 'text-yellow-500';
    if (connectionQuality === 'poor') return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusIcon = () => {
    if (!isOnline) return '🔴';
    if (!isSupabaseReachable) return '🟡';
    if (connectionQuality === 'poor') return '🟡';
    return '🟢';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (!isSupabaseReachable) return 'Server unreachable';
    if (connectionQuality === 'poor') return 'Poor connection';
    return 'Online';
  };

  const formatLastChecked = () => {
    if (!lastChecked) return 'Never';
    const now = Date.now();
    const diff = now - lastChecked;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  return (
    <div className={`relative inline-flex items-center gap-2 ${className}`}>
      {/* Main status indicator */}
      <button
        onClick={checkConnection}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${getStatusColor()}`}
        title="Click to refresh connection status"
      >
        <span className="text-sm">{getStatusIcon()}</span>
        {showDetails && <span>{getStatusText()}</span>}
      </button>

      {/* Sync indicator */}
      {isActive && (
        <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
          <div className="animate-spin h-3 w-3 border border-blue-600 border-t-transparent rounded-full"></div>
          {showDetails && (
            <span>
              Syncing... {Math.round(overallProgress)}%
            </span>
          )}
        </div>
      )}

      {/* Pending/failed indicators */}
      {(pendingCount > 0 || failedCount > 0) && showDetails && (
        <div className="flex items-center gap-1 text-xs">
          {pendingCount > 0 && (
            <span className="text-yellow-600 dark:text-yellow-400">
              {pendingCount} pending
            </span>
          )}
          {failedCount > 0 && (
            <span className="text-red-600 dark:text-red-400">
              {failedCount} failed
            </span>
          )}
        </div>
      )}

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-0 mb-2 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-50 whitespace-nowrap">
          <div>Status: {getStatusText()}</div>
          <div>Quality: {connectionQuality}</div>
          <div>Last checked: {formatLastChecked()}</div>
          {isActive && (
            <div>Sync progress: {Math.round(overallProgress)}%</div>
          )}
          {pendingCount > 0 && (
            <div>Pending operations: {pendingCount}</div>
          )}
          {failedCount > 0 && (
            <div>Failed operations: {failedCount}</div>
          )}
          <div className="text-gray-400 mt-1">Click to refresh</div>
        </div>
      )}
    </div>
  );
};