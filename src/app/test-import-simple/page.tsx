'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function TestImportSimplePage() {
  const { user, loading } = useAuth();
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setResult(null);

    try {
      const fileContent = await file.text();
      const data = JSON.parse(fileContent);
      
      // Simple validation
      if (data && typeof data === 'object') {
        setResult(`✅ File loaded successfully! Found ${Object.keys(data).length} top-level keys.`);
      } else {
        setResult('❌ Invalid file format');
      }
    } catch (error) {
      setResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImporting(false);
      // Reset file input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Test Import - Simple</h1>
        <p>Loading authentication...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Test Import - Simple</h1>
        <div className="p-4 bg-red-100 border border-red-300 rounded-lg">
          <p className="text-red-700">You must be signed in to test import functionality.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Test Import - Simple</h1>
      
      <div className="mb-6 p-4 bg-blue-100 border border-blue-300 rounded-lg">
        <h2 className="text-xl font-semibold text-blue-800 mb-2">Authentication Status</h2>
        <p className="text-blue-700">✅ Signed in as: {user.email}</p>
      </div>

      <div className="p-6 bg-white border border-gray-300 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Simple File Import Test</h2>
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isImporting}
        />
        
        {/* Import button */}
        <button
          onClick={handleImportClick}
          disabled={isImporting}
          className={`w-full px-6 py-3 text-white font-semibold rounded-lg transition-colors ${
            isImporting 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
          }`}
        >
          {isImporting ? 'Processing...' : 'Select JSON File to Test'}
        </button>
        
        {/* Result display */}
        {result && (
          <div className={`mt-4 p-4 rounded-lg ${
            result.startsWith('✅') 
              ? 'bg-green-100 border border-green-300 text-green-800' 
              : 'bg-red-100 border border-red-300 text-red-800'
          }`}>
            <p className="font-medium">{result}</p>
          </div>
        )}
        
        {/* Instructions */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-2">Instructions:</h3>
          <ol className="text-sm text-gray-700 space-y-1">
            <li>1. Click the button above to select a JSON backup file</li>
            <li>2. The app will validate the file structure</li>
            <li>3. Check if you get a success or error message</li>
            <li>4. If this works, the issue is with the actual import logic</li>
            <li>5. If this doesn't work, there's a basic file handling issue</li>
          </ol>
        </div>
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={() => window.location.href = '/reset-supabase'}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 mr-4"
        >
          Go to Reset Supabase
        </button>
        <button
          onClick={() => window.location.href = '/debug-import'}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Go to Debug Page
        </button>
      </div>
    </div>
  );
}