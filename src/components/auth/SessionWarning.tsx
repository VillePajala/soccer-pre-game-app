'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { sessionManager, type SessionWarningEvent } from '../../lib/security/sessionManager';
import { useAuth } from '../../context/AuthContext';
import logger from '../../utils/logger';

interface SessionWarningProps {
  onSessionExtended?: () => void;
  onSessionExpired?: () => void;
}

/**
 * SessionWarning component handles session timeout warnings and notifications
 */
export function SessionWarning({ onSessionExtended, onSessionExpired }: SessionWarningProps) {
  const [warning, setWarning] = useState<SessionWarningEvent | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { user, signOut } = useAuth();

  const handleSessionExpired = useCallback(async () => {
    setIsVisible(false);
    setWarning(null);
    onSessionExpired?.();
    
    try {
      await signOut();
    } catch (error) {
      logger.error('Error signing out after session expiry:', error);
    }
  }, [signOut, onSessionExpired]);

  useEffect(() => {
    if (!user) return;

    // Initialize session manager
    sessionManager.initialize();

    // Listen for session events
    const unsubscribe = sessionManager.onSessionEvent((event) => {
      logger.info('Session event received:', event);
      setWarning(event);
      setIsVisible(true);

      if (event.timeRemaining) {
        setTimeRemaining(event.timeRemaining);
        startCountdown(event.timeRemaining);
      }

      // Handle automatic actions
      if (event.action === 'logout') {
        handleSessionExpired();
      }
    });

    return unsubscribe;
  }, [user, handleSessionExpired]);

  const startCountdown = (remainingTime: number) => {
    let remaining = remainingTime;
    
    const countdownInterval = setInterval(() => {
      remaining -= 1000;
      
      if (remaining <= 0) {
        clearInterval(countdownInterval);
        setTimeRemaining(0);
        return;
      }
      
      setTimeRemaining(remaining);
    }, 1000);

    // Cleanup interval after countdown
    setTimeout(() => {
      clearInterval(countdownInterval);
    }, remainingTime);
  };

  const handleExtendSession = () => {
    sessionManager.extendSession();
    setIsVisible(false);
    setWarning(null);
    setTimeRemaining(null);
    onSessionExtended?.();
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Don't clear warning state in case we need to show it again
  };

  const formatTimeRemaining = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getWarningIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return '⚠️';
      case 'timeout':
        return '⏰';
      case 'suspicious_activity':
        return '🚨';
      case 'new_device':
        return '📱';
      default:
        return 'ℹ️';
    }
  };

  const getWarningColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'timeout':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'suspicious_activity':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'new_device':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  if (!isVisible || !warning) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className={`rounded-lg border p-4 mb-4 ${getWarningColor(warning.type)}`}>
          <div className="flex items-start">
            <div className="text-2xl mr-3">
              {getWarningIcon(warning.type)}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">
                {warning.type === 'warning' && 'Session Warning'}
                {warning.type === 'timeout' && 'Session Expired'}
                {warning.type === 'suspicious_activity' && 'Security Alert'}
                {warning.type === 'new_device' && 'New Device Detected'}
              </h3>
              <p className="text-sm mb-2">
                {warning.message}
              </p>
              {timeRemaining !== null && timeRemaining > 0 && (
                <div className="text-lg font-mono font-bold">
                  Time remaining: {formatTimeRemaining(timeRemaining)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          {warning.type === 'warning' && (
            <>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={handleExtendSession}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Extend Session
              </button>
            </>
          )}

          {warning.type === 'timeout' && (
            <button
              onClick={handleSessionExpired}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Sign In Again
            </button>
          )}

          {warning.type === 'suspicious_activity' && (
            <>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  // In a full implementation, this would open a security settings modal
                  handleDismiss();
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
              >
                Review Security
              </button>
            </>
          )}

          {warning.type === 'new_device' && (
            <>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                This was me
              </button>
              <button
                onClick={() => {
                  // In a full implementation, this would trigger a password change flow
                  handleDismiss();
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Secure Account
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for using session warning functionality
 */
export function useSessionWarning() {
  const [sessionInfo, setSessionInfo] = useState(() => sessionManager.getSessionInfo());

  useEffect(() => {
    const updateSessionInfo = () => {
      setSessionInfo(sessionManager.getSessionInfo());
    };

    // Update session info periodically
    const interval = setInterval(updateSessionInfo, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const extendSession = () => {
    sessionManager.extendSession();
    setSessionInfo(sessionManager.getSessionInfo());
  };

  return {
    sessionInfo,
    extendSession,
    isSessionActive: sessionInfo.isActive
  };
}