'use client';

import { useState, useEffect, useCallback } from 'react';
import { deviceIntegration } from '@/lib/native/deviceIntegration';

interface DeviceIntegrationState {
  capabilities: {
    webShare: boolean;
    clipboard: boolean;
    contacts: boolean;
    camera: boolean;
    geolocation: boolean;
    vibration: boolean;
    fullscreen: boolean;
    wakeLock: boolean;
    fileSystem: boolean;
  };
  isFullscreen: boolean;
  wakeLock: WakeLockSentinel | null;
  isLoading: boolean;
  error: string | null;
}

interface UseDeviceIntegrationReturn extends DeviceIntegrationState {
  shareContent: (data: { title?: string; text?: string; url?: string; files?: File[] }) => Promise<boolean>;
  copyToClipboard: (text: string) => Promise<boolean>;
  vibrate: (pattern?: number | number[]) => boolean;
  enterFullscreen: (element?: Element) => Promise<boolean>;
  exitFullscreen: () => Promise<boolean>;
  toggleFullscreen: (element?: Element) => Promise<boolean>;
  requestWakeLock: () => Promise<boolean>;
  releaseWakeLock: () => void;
  getCurrentPosition: () => Promise<GeolocationPosition | null>;
  capturePhoto: () => Promise<File | null>;
  getShareTemplates: () => ReturnType<typeof deviceIntegration.getShareTemplates>;
  clearError: () => void;
}

export function useDeviceIntegration(): UseDeviceIntegrationReturn {
  const [state, setState] = useState<DeviceIntegrationState>({
    capabilities: {
      webShare: false,
      clipboard: false,
      contacts: false,
      camera: false,
      geolocation: false,
      vibration: false,
      fullscreen: false,
      wakeLock: false,
      fileSystem: false
    },
    isFullscreen: false,
    wakeLock: null,
    isLoading: true,
    error: null
  });

  // Initialize and detect capabilities
  useEffect(() => {
    const initialize = () => {
      try {
        const capabilities = deviceIntegration.getCapabilities();
        setState(prev => ({
          ...prev,
          capabilities,
          isLoading: false
        }));

        console.log('[Device Hook] Initialized with capabilities:', capabilities);
      } catch (error) {
        console.error('[Device Hook] Failed to initialize:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to initialize device integration'
        }));
      }
    };

    initialize();

    // Listen for fullscreen changes
    const handleFullscreenChange = () => {
      const isFullscreen = !!(
        document.fullscreenElement ||
        (document as Record<string, unknown>).webkitFullscreenElement ||
        (document as Record<string, unknown>).msFullscreenElement
      );
      
      setState(prev => ({ ...prev, isFullscreen }));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Share content
  const shareContent = useCallback(async (data: {
    title?: string;
    text?: string;
    url?: string;
    files?: File[];
  }): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, error: null }));
      const success = await deviceIntegration.shareContent(data);
      
      if (!success) {
        setState(prev => ({ ...prev, error: 'Failed to share content' }));
      }
      
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to share content';
      setState(prev => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, []);

  // Copy to clipboard
  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, error: null }));
      const success = await deviceIntegration.copyToClipboard(text);
      
      if (!success) {
        setState(prev => ({ ...prev, error: 'Failed to copy to clipboard' }));
      }
      
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to copy to clipboard';
      setState(prev => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, []);

  // Vibrate device
  const vibrate = useCallback((pattern: number | number[] = 200): boolean => {
    try {
      return deviceIntegration.vibrate(pattern);
    } catch (error) {
      console.error('[Device Hook] Vibration failed:', error);
      return false;
    }
  }, []);

  // Enter fullscreen
  const enterFullscreen = useCallback(async (element?: Element): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, error: null }));
      const success = await deviceIntegration.enterFullscreen(element);
      
      if (!success) {
        setState(prev => ({ ...prev, error: 'Failed to enter fullscreen' }));
      }
      
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to enter fullscreen';
      setState(prev => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, []);

  // Exit fullscreen
  const exitFullscreen = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, error: null }));
      const success = await deviceIntegration.exitFullscreen();
      
      if (!success) {
        setState(prev => ({ ...prev, error: 'Failed to exit fullscreen' }));
      }
      
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to exit fullscreen';
      setState(prev => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(async (element?: Element): Promise<boolean> => {
    return state.isFullscreen ? exitFullscreen() : enterFullscreen(element);
  }, [state.isFullscreen, enterFullscreen, exitFullscreen]);

  // Request wake lock
  const requestWakeLock = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, error: null }));
      const wakeLock = await deviceIntegration.requestWakeLock();
      
      if (wakeLock) {
        setState(prev => ({ ...prev, wakeLock }));
        return true;
      } else {
        setState(prev => ({ ...prev, error: 'Wake lock not supported or failed' }));
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to request wake lock';
      setState(prev => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, []);

  // Release wake lock
  const releaseWakeLock = useCallback(() => {
    if (state.wakeLock) {
      state.wakeLock.release();
      setState(prev => ({ ...prev, wakeLock: null }));
    }
  }, [state.wakeLock]);

  // Get current position
  const getCurrentPosition = useCallback(async (): Promise<GeolocationPosition | null> => {
    try {
      setState(prev => ({ ...prev, error: null }));
      const position = await deviceIntegration.getCurrentPosition();
      
      if (!position) {
        setState(prev => ({ ...prev, error: 'Failed to get location' }));
      }
      
      return position;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get location';
      setState(prev => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, []);

  // Capture photo
  const capturePhoto = useCallback(async (): Promise<File | null> => {
    try {
      setState(prev => ({ ...prev, error: null }));
      const photo = await deviceIntegration.capturePhoto();
      
      if (!photo) {
        setState(prev => ({ ...prev, error: 'Failed to capture photo' }));
      }
      
      return photo;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to capture photo';
      setState(prev => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, []);

  // Get share templates
  const getShareTemplates = useCallback(() => {
    return deviceIntegration.getShareTemplates();
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    shareContent,
    copyToClipboard,
    vibrate,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
    requestWakeLock,
    releaseWakeLock,
    getCurrentPosition,
    capturePhoto,
    getShareTemplates,
    clearError
  };
}