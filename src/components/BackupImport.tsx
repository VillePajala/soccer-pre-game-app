'use client';

import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { importBackupToSupabase } from '@/utils/supabaseBackupImport';
import { cleanImportToSupabase } from '@/utils/supabaseCleanImport';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/config/queryKeys';

interface BackupImportProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

export const BackupImport: React.FC<BackupImportProps> = ({ onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [importType, setImportType] = useState<'merge' | 'replace'>('merge');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const fileContent = await file.text();
      const result = importType === 'replace' 
        ? await cleanImportToSupabase(fileContent)
        : await importBackupToSupabase(fileContent);
      
      setImportResult(result);
      
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
      setImportResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to read file'
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-4">{t('settings.importBackup')}</h3>
      
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('settings.importBackupDescription', 'Import your backup file to restore your data. This supports both old localStorage backups and new Supabase exports.')}
        </p>
        
        {/* Import type selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Import Type:
          </label>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                value="merge"
                checked={importType === 'merge'}
                onChange={(e) => setImportType(e.target.value as 'merge' | 'replace')}
                className="text-blue-600"
              />
              <span className="text-sm">Merge with existing data (adds new records)</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                value="replace"
                checked={importType === 'replace'}
                onChange={(e) => setImportType(e.target.value as 'merge' | 'replace')}
                className="text-blue-600"
              />
              <span className="text-sm text-red-600">Replace all data (⚠️ deletes existing data first)</span>
            </label>
          </div>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isImporting}
        />
        
        <button
          onClick={handleImportClick}
          disabled={isImporting}
          className={`w-full px-4 py-2 text-white rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed ${
            importType === 'replace' 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isImporting ? t('common.importing') : t('settings.selectBackupFile')}
        </button>
        
        {importResult && (
          <div className={`p-3 rounded-md ${
            importResult.success 
              ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
              : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
          }`}>
            <p className="text-sm">{importResult.message}</p>
          </div>
        )}
        
        {onClose && (
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {t('common.close')}
          </button>
        )}
      </div>
    </div>
  );
};