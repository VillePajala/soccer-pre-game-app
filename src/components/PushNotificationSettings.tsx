'use client';

import React, { useState } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface PushNotificationSettingsProps {
  className?: string;
}

export default function PushNotificationSettings({ className = '' }: PushNotificationSettingsProps) {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification,
    clearError
  } = usePushNotifications();

  const [testNotificationType, setTestNotificationType] = useState<'gameReminder' | 'syncComplete' | 'syncFailed' | 'playerUpdate' | 'gameComplete'>('gameReminder');

  const getStatusColor = () => {
    if (!isSupported) return 'text-gray-500';
    if (permission === 'denied') return 'text-red-500';
    if (isSubscribed) return 'text-green-500';
    return 'text-yellow-500';
  };

  const getStatusIcon = () => {
    if (!isSupported) return '🚫';
    if (permission === 'denied') return '❌';
    if (isSubscribed) return '✅';
    return '⏳';
  };

  const getStatusText = () => {
    if (!isSupported) return 'Not Supported';
    if (permission === 'denied') return 'Permission Denied';
    if (isSubscribed) return 'Active';
    if (permission === 'granted') return 'Permission Granted';
    return 'Not Configured';
  };

  const handleToggleSubscription = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      if (permission !== 'granted') {
        const permissionGranted = await requestPermission();
        if (!permissionGranted) return;
      }
      await subscribe();
    }
  };

  const handleSendTest = async () => {
    await sendTestNotification(testNotificationType);
  };

  if (!isSupported) {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">🚫</span>
          <div>
            <h3 className="font-semibold text-gray-800">Push Notifications</h3>
            <p className="text-sm text-gray-600">Not supported in this browser</p>
          </div>
        </div>
        <p className="text-sm text-gray-500">
          Push notifications require a modern browser with service worker support.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getStatusIcon()}</span>
          <div>
            <h3 className="font-semibold text-gray-800">Push Notifications</h3>
            <p className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </p>
          </div>
        </div>
        
        {/* Toggle Switch */}
        <button
          onClick={handleToggleSubscription}
          disabled={isLoading || permission === 'denied'}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
            isSubscribed
              ? 'bg-blue-600'
              : 'bg-gray-200'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isSubscribed ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-2">
              <span className="text-red-500 text-sm">❌</span>
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-600 text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Description */}
      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-2">
          Get notified about game reminders, sync status, and important updates even when the app is closed.
        </p>
        
        {/* Features List */}
        <div className="grid grid-cols-1 gap-2">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="text-green-500">⚽</span>
            <span>Game reminders and schedules</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="text-blue-500">🔄</span>
            <span>Data sync status updates</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="text-yellow-500">👤</span>
            <span>Player and team updates</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="text-purple-500">🏆</span>
            <span>Game completion alerts</span>
          </div>
        </div>
      </div>

      {/* Test Notifications Section */}
      {isSubscribed && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="font-medium text-gray-800 mb-3">Test Notifications</h4>
          
          <div className="flex gap-2 mb-3">
            <select
              value={testNotificationType}
              onChange={(e) => setTestNotificationType(e.target.value as 'gameReminder' | 'syncComplete' | 'syncFailed' | 'playerUpdate' | 'gameComplete')}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="gameReminder">Game Reminder</option>
              <option value="syncComplete">Sync Complete</option>
              <option value="syncFailed">Sync Failed</option>
              <option value="playerUpdate">Player Update</option>
              <option value="gameComplete">Game Complete</option>
            </select>
            
            <button
              onClick={handleSendTest}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              Send Test
            </button>
          </div>
          
          <p className="text-xs text-gray-500">
            Use test notifications to verify they&apos;re working correctly on your device.
          </p>
        </div>
      )}

      {/* Permission Denied Help */}
      {permission === 'denied' && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="font-medium text-gray-800 mb-2">Permission Denied</h4>
          <p className="text-sm text-gray-600 mb-3">
            To enable notifications, you&apos;ll need to update your browser settings:
          </p>
          <ol className="text-sm text-gray-600 space-y-1 ml-4">
            <li>1. Click the lock icon in your address bar</li>
            <li>2. Set notifications to &quot;Allow&quot;</li>
            <li>3. Refresh this page</li>
          </ol>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-sm text-gray-600">Processing...</span>
        </div>
      )}
    </div>
  );
}