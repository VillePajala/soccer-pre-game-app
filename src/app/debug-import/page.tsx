'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function DebugImportPage() {
  const { user, loading } = useAuth();
  const [testState, setTestState] = useState(false);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Debug Import Page</h1>
      
      {/* CSS Test */}
      <div className="mb-6 p-4 bg-blue-100 border border-blue-300 rounded-lg">
        <h2 className="text-xl font-semibold text-blue-800 mb-2">CSS Test</h2>
        <p className="text-blue-700">If you can see this styled box, Tailwind CSS is working correctly.</p>
      </div>

      {/* Auth Test */}
      <div className="mb-6 p-4 bg-green-100 border border-green-300 rounded-lg">
        <h2 className="text-xl font-semibold text-green-800 mb-2">Authentication Test</h2>
        <p className="text-green-700">Loading: {loading ? 'Yes' : 'No'}</p>
        <p className="text-green-700">User: {user ? user.email : 'Not authenticated'}</p>
      </div>

      {/* Button Test */}
      <div className="mb-6 p-4 bg-yellow-100 border border-yellow-300 rounded-lg">
        <h2 className="text-xl font-semibold text-yellow-800 mb-2">Button Test</h2>
        <button
          onClick={() => setTestState(!testState)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Test Button (State: {testState ? 'True' : 'False'})
        </button>
        <button
          disabled={true}
          className="ml-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Disabled Button
        </button>
      </div>

      {/* Import Form Test */}
      <div className="mb-6 p-4 bg-purple-100 border border-purple-300 rounded-lg">
        <h2 className="text-xl font-semibold text-purple-800 mb-2">Import Form Test</h2>
        <input
          type="file"
          accept=".json"
          className="mb-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <button
          className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          onClick={() => alert('Import button clicked!')}
        >
          Test Import Button
        </button>
      </div>

      {/* Navigation Test */}
      <div className="mb-6 p-4 bg-gray-100 border border-gray-300 rounded-lg">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Navigation Test</h2>
        <div className="space-x-4">
          <button
            onClick={() => window.location.href = '/reset-supabase'}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Go to Reset Supabase
          </button>
          <button
            onClick={() => window.location.href = '/import-backup'}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Go to Import Backup
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Go to Home
          </button>
        </div>
      </div>
      
      <div className="text-center">
        <p className="text-gray-600">
          Check the browser console for any JavaScript errors.
        </p>
      </div>
    </div>
  );
}