'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import logger from '@/utils/logger';

export interface UpdateInfo {
  updateAvailable: boolean;
  isUpdating: boolean;
  currentVersion?: string;
  newVersion?: string;
  releaseNotes?: string;
  lastCheckTime?: number;
  error?: string;
}

interface UpdateContextType {
  updateInfo: UpdateInfo;
  setUpdateAvailable: (available: boolean, details?: Partial<UpdateInfo>) => void;
  setIsUpdating: (updating: boolean) => void;
  setReleaseNotes: (notes: string) => void;
  setVersionInfo: (current?: string, newVer?: string) => void;
  clearUpdate: () => void;
  triggerUpdate: () => void;
}

const UpdateContext = createContext<UpdateContextType | undefined>(undefined);

export const UpdateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({
    updateAvailable: false,
    isUpdating: false,
  });

  const setUpdateAvailable = useCallback((available: boolean, details?: Partial<UpdateInfo>) => {
    setUpdateInfo(prev => ({
      ...prev,
      updateAvailable: available,
      lastCheckTime: Date.now(),
      ...details,
    }));
    logger.log('[UpdateContext] Update available:', available, details);
  }, []);

  const setIsUpdating = useCallback((updating: boolean) => {
    setUpdateInfo(prev => ({
      ...prev,
      isUpdating: updating,
    }));
  }, []);

  const setReleaseNotes = useCallback((notes: string) => {
    setUpdateInfo(prev => ({
      ...prev,
      releaseNotes: notes,
    }));
  }, []);

  const setVersionInfo = useCallback((current?: string, newVer?: string) => {
    setUpdateInfo(prev => ({
      ...prev,
      currentVersion: current,
      newVersion: newVer,
    }));
  }, []);

  const clearUpdate = useCallback(() => {
    setUpdateInfo({
      updateAvailable: false,
      isUpdating: false,
    });
  }, []);

  const triggerUpdate = useCallback(() => {
    // This will be called by UI components to trigger the update
    // The actual logic will be handled by the service worker registration
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration?.waiting) {
          logger.log('[UpdateContext] Triggering update via SKIP_WAITING');
          setIsUpdating(true);
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    }
  }, [setIsUpdating]);

  const value: UpdateContextType = {
    updateInfo,
    setUpdateAvailable,
    setIsUpdating,
    setReleaseNotes,
    setVersionInfo,
    clearUpdate,
    triggerUpdate,
  };

  return <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>;
};

export const useUpdate = () => {
  const context = useContext(UpdateContext);
  if (context === undefined) {
    throw new Error('useUpdate must be used within an UpdateProvider');
  }
  return context;
};