'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useMigrationStatus } from '../../lib/migration/migrationStatus';
import { downloadLocalDataExport, getLocalDataSummary } from '../../lib/migration/exportLocalData';
import { rollbackMigration } from '../../lib/migration/importToSupabase';
import { MigrationModal } from './MigrationModal';

/**
 * Migration settings component for manual migration control
 */
export function MigrationSettings() {
  const { user } = useAuth();
  const { status, loading } = useMigrationStatus();
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [localDataSummary, setLocalDataSummary] = useState<{
    totalPlayers: number;
    totalSeasons: number;
    totalTournaments: number;
    totalGames: number;
    hasSettings: boolean;
  } | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    // Load local data summary on mount
    getLocalDataSummary().then(setLocalDataSummary);
  }, []);

  const handleDownloadBackup = async () => {
    setIsDownloading(true);
    setError(null);

    try {
      await downloadLocalDataExport();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download backup');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRollbackMigration = async () => {
    if (!user || !confirm('This will delete all your cloud data and reset migration status. Are you sure?')) {
      return;
    }

    setIsRollingBack(true);
    setError(null);

    try {
      await rollbackMigration(user.id);
      // Reload the page to refresh migration status
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rollback migration');
    } finally {
      setIsRollingBack(false);
    }
  };

  if (loading) {
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
          Data Migration
        </h3>
        <p className="text-sm text-gray-600">
          Manage your data synchronization between local storage and cloud.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Migration Status */}
      {status && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Migration Status</h4>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Status:</span>
              <span className={`text-sm font-medium ${
                status.migrationCompleted ? 'text-green-600' : 
                status.migrationStarted ? 'text-blue-600' : 'text-gray-600'
              }`}>
                {status.migrationCompleted ? 'Completed' : 
                 status.migrationStarted ? 'In Progress' : 'Not Started'}
              </span>
            </div>
            
            {status.migrationStarted && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Progress:</span>
                <span className="text-sm font-medium text-blue-600">
                  {status.migrationProgress}%
                </span>
              </div>
            )}
            
            {status.lastMigrationAttempt && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Last Attempt:</span>
                <span className="text-sm text-gray-600">
                  {new Date(status.lastMigrationAttempt).toLocaleDateString()}
                </span>
              </div>
            )}
            
            {status.errorMessage && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                <p className="text-xs text-red-600">{status.errorMessage}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Local Data Summary */}
      {localDataSummary && (
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-3">Local Data</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-blue-700">Players:</span>
              <span className="font-medium text-blue-900">{localDataSummary.totalPlayers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Seasons:</span>
              <span className="font-medium text-blue-900">{localDataSummary.totalSeasons}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Tournaments:</span>
              <span className="font-medium text-blue-900">{localDataSummary.totalTournaments}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Games:</span>
              <span className="font-medium text-blue-900">{localDataSummary.totalGames}</span>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        {/* Start/Resume Migration */}
        {!status?.migrationCompleted && (
          <button
            onClick={() => setShowMigrationModal(true)}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
          >
            {status?.migrationStarted ? 'Resume Migration' : 'Start Migration'}
          </button>
        )}

        {/* Download Backup */}
        <button
          onClick={handleDownloadBackup}
          disabled={isDownloading}
          className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {isDownloading ? 'Downloading...' : 'Download Local Data Backup'}
        </button>

        {/* Rollback Migration */}
        {status?.migrationCompleted && (
          <button
            onClick={handleRollbackMigration}
            disabled={isRollingBack}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {isRollingBack ? 'Rolling Back...' : 'Reset Migration (Delete Cloud Data)'}
          </button>
        )}
      </div>

      <div className="text-xs text-gray-500">
        <p>
          <strong>Note:</strong> Migration will copy your local data to the cloud. 
          Your local data will remain intact as a backup.
        </p>
      </div>

      <MigrationModal
        isOpen={showMigrationModal}
        onClose={() => setShowMigrationModal(false)}
        onComplete={() => {
          setShowMigrationModal(false);
          // Reload to refresh status
          window.location.reload();
        }}
      />
    </div>
  );
}