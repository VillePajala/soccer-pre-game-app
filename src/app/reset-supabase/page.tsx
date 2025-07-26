'use client';

import { ResetSupabaseData } from '@/components/ResetSupabaseData';
import { BackupImport } from '@/components/BackupImport';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';

export default function ResetSupabasePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'reset' | 'import'>('reset');

  if (!user) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Supabase Data Management</h1>
        <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-lg">
          <p className="text-red-700 dark:text-red-300">
            You must be signed in to manage Supabase data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Supabase Data Management</h1>
      
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('reset')}
            className={`flex-1 py-2 px-4 rounded-md transition-colors ${
              activeTab === 'reset'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Reset Data
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-2 px-4 rounded-md transition-colors ${
              activeTab === 'import'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Import Backup
          </button>
        </div>
      </div>

      {activeTab === 'reset' ? (
        <div>
          <ResetSupabaseData 
            onSuccess={() => {
              // Optionally redirect or show success message
              setTimeout(() => {
                window.location.href = '/';
              }, 3000);
            }}
          />
        </div>
      ) : (
        <div>
          <BackupImport 
            onSuccess={() => {
              // Optionally redirect or show success message
              setTimeout(() => {
                window.location.href = '/';
              }, 3000);
            }}
          />
        </div>
      )}

      <div className="mt-8">
        <button
          onClick={() => window.location.href = '/'}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Back to App
        </button>
      </div>
    </div>
  );
}