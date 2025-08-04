'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useMigrationStatus } from '../../lib/migration/migrationStatus';
import { exportLocalStorageData } from '../../lib/migration/exportLocalData';
import { importDataToSupabase, type ImportProgress } from '../../lib/migration/importToSupabase';
import type { LocalDataExport } from '../../lib/migration/exportLocalData';
import logger from '@/utils/logger';

interface MigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

type MigrationStep = 'welcome' | 'export' | 'import' | 'complete' | 'error';

export function MigrationModal({ isOpen, onClose, onComplete }: MigrationModalProps) {
  const { user } = useAuth();
  const { status, updateStatus, needsMigration } = useMigrationStatus();
  const [step, setStep] = useState<MigrationStep>('welcome');
  const [exportData, setExportData] = useState<LocalDataExport | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Don't show modal if user doesn't need migration
  if (!isOpen || !needsMigration) {
    return null;
  }

  const handleStartMigration = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Step 1: Export localStorage data
      setStep('export');
      const data = await exportLocalStorageData();
      setExportData(data);

      // Step 2: Import to Supabase
      setStep('import');
      const result = await importDataToSupabase(data, user.id, setImportProgress);

      if (result.success) {
        setStep('complete');
        onComplete?.();
      } else {
        setError(result.errors.join('\n'));
        setStep('error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipMigration = async () => {
    if (!user) return;

    try {
      // Mark migration as completed (but skipped)
      await updateStatus({
        migrationCompleted: true,
        migrationProgress: 100,
      });
      onClose();
    } catch (err) {
      logger.error('Failed to skip migration:', err);
    }
  };

  const renderWelcomeStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Welcome to Cloud Sync! 🚀
        </h3>
        <p className="text-gray-600">
          We found existing data on this device. Would you like to sync it to your cloud account?
        </p>
      </div>

      {status && (
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Your local data:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>📋 {status.dataTypes.players} players</li>
            <li>🏆 {status.dataTypes.seasons} seasons</li>
            <li>🎯 {status.dataTypes.tournaments} tournaments</li>
            <li>⚽ {status.dataTypes.games} saved games</li>
            {status.dataTypes.settings && <li>⚙️ App settings</li>}
          </ul>
        </div>
      )}

      <div className="bg-green-50 rounded-lg p-4">
        <h4 className="font-medium text-green-900 mb-2">Benefits of syncing:</h4>
        <ul className="text-sm text-green-800 space-y-1">
          <li>✓ Access your data on any device</li>
          <li>✓ Automatic backups</li>
          <li>✓ Real-time sync</li>
          <li>✓ Never lose your data</li>
        </ul>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={handleStartMigration}
          disabled={loading}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Starting...' : 'Sync My Data'}
        </button>
        <button
          onClick={handleSkipMigration}
          className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
        >
          Skip for Now
        </button>
      </div>

      <p className="text-xs text-gray-500 text-center">
        You can always sync later from the settings menu
      </p>
    </div>
  );

  const renderExportStep = () => (
    <div className="space-y-4 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <h3 className="text-xl font-semibold text-gray-900">
        Preparing Your Data
      </h3>
      <p className="text-gray-600">
        Gathering your local data for cloud sync...
      </p>
    </div>
  );

  const renderImportStep = () => (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-900 text-center">
        Syncing to Cloud ☁️
      </h3>
      
      {importProgress && (
        <div className="space-y-3">
          <div className="bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(importProgress.completed / importProgress.total) * 100}%` }}
            />
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-600">
              {importProgress.stage === 'players' && 'Syncing players...'}
              {importProgress.stage === 'seasons' && 'Syncing seasons...'}
              {importProgress.stage === 'tournaments' && 'Syncing tournaments...'}
              {importProgress.stage === 'games' && 'Syncing games...'}
              {importProgress.stage === 'settings' && 'Syncing settings...'}
              {importProgress.stage === 'complete' && 'Finalizing sync...'}
            </p>
            <p className="text-xs text-gray-500">
              {importProgress.completed} of {importProgress.total} items
              {importProgress.currentItem && ` • ${importProgress.currentItem}`}
            </p>
          </div>

          {importProgress.errors.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <p className="text-sm text-yellow-800">
                {importProgress.errors.length} item(s) couldn&apos;t be synced
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderCompleteStep = () => (
    <div className="space-y-4 text-center">
      <div className="text-6xl">🎉</div>
      <h3 className="text-xl font-semibold text-gray-900">
        Sync Complete!
      </h3>
      <p className="text-gray-600">
        Your data is now safely stored in the cloud and will sync across all your devices.
      </p>
      
      {exportData && (
        <div className="bg-green-50 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">Successfully synced:</h4>
          <ul className="text-sm text-green-800 space-y-1">
            <li>📋 {exportData.stats.totalPlayers} players</li>
            <li>🏆 {exportData.stats.totalSeasons} seasons</li>
            <li>🎯 {exportData.stats.totalTournaments} tournaments</li>
            <li>⚽ {exportData.stats.totalGames} games</li>
            {exportData.stats.hasSettings && <li>⚙️ App settings</li>}
          </ul>
        </div>
      )}

      <button
        onClick={onClose}
        className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
      >
        Get Started!
      </button>
    </div>
  );

  const renderErrorStep = () => (
    <div className="space-y-4 text-center">
      <div className="text-6xl">⚠️</div>
      <h3 className="text-xl font-semibold text-gray-900">
        Sync Failed
      </h3>
      <p className="text-gray-600">
        We encountered an issue while syncing your data.
      </p>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-left">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="flex space-x-3">
        <button
          onClick={handleStartMigration}
          disabled={loading}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          Try Again
        </button>
        <button
          onClick={onClose}
          className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
        >
          Close
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {!['export', 'import'].includes(step) && (
          <div className="flex justify-between items-center mb-4">
            <div /> {/* Spacer */}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              type="button"
            >
              ✕
            </button>
          </div>
        )}

        {step === 'welcome' && renderWelcomeStep()}
        {step === 'export' && renderExportStep()}
        {step === 'import' && renderImportStep()}
        {step === 'complete' && renderCompleteStep()}
        {step === 'error' && renderErrorStep()}
      </div>
    </div>
  );
}