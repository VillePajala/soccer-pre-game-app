'use client';

import { useState, useEffect } from 'react';
import { getConfigInfo, getProviderType } from '../../lib/storage/config';
import { storageManager } from '../../lib/storage';

interface StorageSettingsProps {
  className?: string;
}

export default function StorageSettings({ className = '' }: StorageSettingsProps) {
  const [configInfo, setConfigInfo] = useState<ReturnType<typeof getConfigInfo> | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{
    provider: string;
    online: boolean;
    error?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setConfigInfo(getConfigInfo());
  }, []);

  const testConnection = async () => {
    setIsLoading(true);
    try {
      const status = await storageManager.testConnection();
      setConnectionStatus(status);
    } catch (error) {
      setConnectionStatus({
        provider: getProviderType(),
        online: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const switchProvider = async (provider: 'localStorage' | 'supabase') => {
    try {
      await storageManager.switchProvider(provider);
      setConfigInfo(getConfigInfo());
      setConnectionStatus(null); // Reset connection status
    } catch (error) {
      console.error('Failed to switch provider:', error);
    }
  };

  if (!configInfo) {
    return <div className={`${className} animate-pulse`}>Loading storage settings...</div>;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Storage Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Current Provider
            </label>
            <div className="flex items-center space-x-2">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                configInfo.provider === 'supabase' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
              }`}>
                {configInfo.provider}
              </span>
              {configInfo.provider === 'supabase' && (
                <span className={`text-xs ${
                  configInfo.supabaseConfigured 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {configInfo.supabaseConfigured ? '✓ Configured' : '⚠ Not Configured'}
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fallback Enabled
            </label>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              configInfo.fallbackEnabled
                ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
            }`}>
              {configInfo.fallbackEnabled ? 'Yes' : 'No'}
            </span>
          </div>
        </div>

        <div className="mt-4 flex space-x-2">
          <button
            onClick={testConnection}
            disabled={isLoading}
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Testing...' : 'Test Connection'}
          </button>

          {process.env.NODE_ENV === 'development' && (
            <>
              <button
                onClick={() => switchProvider('localStorage')}
                disabled={configInfo.provider === 'localStorage'}
                className="px-3 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Use localStorage
              </button>
              <button
                onClick={() => switchProvider('supabase')}
                disabled={configInfo.provider === 'supabase' || !configInfo.supabaseConfigured}
                className="px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Use Supabase
              </button>
            </>
          )}
        </div>

        {connectionStatus && (
          <div className={`mt-4 p-3 rounded-md ${
            connectionStatus.online
              ? 'bg-green-50 border border-green-200 dark:bg-green-900 dark:border-green-700'
              : 'bg-red-50 border border-red-200 dark:bg-red-900 dark:border-red-700'
          }`}>
            <div className="flex items-center">
              <span className={`mr-2 ${
                connectionStatus.online 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {connectionStatus.online ? '✓' : '✗'}
              </span>
              <span className={`text-sm font-medium ${
                connectionStatus.online 
                  ? 'text-green-800 dark:text-green-200' 
                  : 'text-red-800 dark:text-red-200'
              }`}>
                {connectionStatus.provider} - {connectionStatus.online ? 'Connected' : 'Connection Failed'}
              </span>
            </div>
            {connectionStatus.error && (
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {connectionStatus.error}
              </p>
            )}
          </div>
        )}
      </div>

      {configInfo.environment === 'development' && (
        <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
          <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            Development Mode
          </h4>
          <p className="text-xs text-yellow-700 dark:text-yellow-300">
            Storage provider can be switched at runtime. In production, configure via environment variables.
          </p>
        </div>
      )}

      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p>
          <strong>Environment:</strong> {configInfo.environment}
        </p>
        <p>
          <strong>Feature Flags:</strong> NEXT_PUBLIC_ENABLE_SUPABASE={process.env.NEXT_PUBLIC_ENABLE_SUPABASE || 'false'}
        </p>
        {configInfo.provider === 'supabase' && !configInfo.supabaseConfigured && (
          <p className="text-red-600 dark:text-red-400">
            ⚠ Configure Supabase environment variables in .env.local file
          </p>
        )}
      </div>
    </div>
  );
}