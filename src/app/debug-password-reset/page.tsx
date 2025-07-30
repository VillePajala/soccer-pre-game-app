'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface DebugResult {
  success?: boolean;
  error?: string;
  data?: unknown;
  sentTo?: string;
  redirectTo?: string;
  currentOrigin?: string;
  code?: string;
  note?: string;
}

export default function DebugPasswordReset() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<DebugResult | null>(null);
  const [loading, setLoading] = useState(false);

  const sendResetEmail = async () => {
    setLoading(true);
    try {
      // Send reset email without explicit redirectTo to use Supabase defaults
      const { data, error } = await supabase.auth.resetPasswordForEmail(email);
      
      setResult({ 
        success: !error, 
        error: error?.message,
        data,
        sentTo: email,
        note: 'Email will redirect to the Site URL configured in Supabase',
        currentOrigin: window.location.origin
      });
    } catch (err) {
      setResult({ 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error',
        currentOrigin: window.location.origin
      });
    }
    setLoading(false);
  };

  const testCodeExchange = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (!code) {
      setResult({ error: 'No code in URL' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      setResult({ 
        success: !error, 
        error: error?.message,
        data,
        code: code.substring(0, 10) + '...'
      });
    } catch (err) {
      setResult({ 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Debug Password Reset</h1>
      
      <div className="bg-gray-800 p-6 rounded-lg mb-6">
        <h2 className="text-xl mb-4">Current Environment</h2>
        <pre className="bg-gray-700 p-4 rounded text-sm overflow-auto">
{JSON.stringify({
  origin: typeof window !== 'undefined' ? window.location.origin : 'N/A',
  href: typeof window !== 'undefined' ? window.location.href : 'N/A',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
}, null, 2)}
        </pre>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg mb-6">
        <h2 className="text-xl mb-4">Test Password Reset Email</h2>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter email"
          className="w-full p-2 bg-gray-700 rounded mb-4"
        />
        <button
          onClick={sendResetEmail}
          disabled={loading || !email}
          className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send Reset Email'}
        </button>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg mb-6">
        <h2 className="text-xl mb-4">Test Code Exchange</h2>
        <p className="mb-4 text-gray-400">If you have a code in the URL, click below to test exchanging it</p>
        <button
          onClick={testCodeExchange}
          disabled={loading}
          className="bg-green-600 px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Code Exchange'}
        </button>
      </div>

      {result && (
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl mb-4">Result</h2>
          <pre className="bg-gray-700 p-4 rounded text-sm overflow-auto">
{JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-8 bg-yellow-900 p-6 rounded-lg">
        <h2 className="text-xl mb-4 text-yellow-300">⚠️ Important Notes</h2>
        <ul className="list-disc list-inside space-y-2 text-yellow-200">
          <li>The password reset email will be sent with the redirect URL based on the current domain</li>
          <li>If testing on a preview URL, the email link might still go to the production domain</li>
          <li>Make sure your Supabase Redirect URLs include the current domain</li>
          <li>The Site URL in Supabase should be your main production URL</li>
        </ul>
      </div>
    </div>
  );
}