'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function TestSignup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<{ success?: boolean; error?: string; details?: unknown } | null>(null);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const handleSignUp = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const { error, rateLimited, retryAfter } = await signUp(email, password);
      
      if (error) {
        setResult({
          success: false,
          error: rateLimited 
            ? `Rate limited. Try again in ${retryAfter} seconds.`
            : error.message,
          details: { rateLimited, retryAfter }
        });
      } else {
        setResult({
          success: true,
          error: undefined,
          details: {
            message: 'Sign-up successful! Check your email for confirmation.',
            redirectUrl: `${window.location.origin}/auth/confirm`
          }
        });
      }
    } catch (err) {
      setResult({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Test Sign-Up Flow</h1>
      
      <div className="bg-gray-800 p-6 rounded-lg mb-6">
        <h2 className="text-xl mb-4">Current Configuration</h2>
        <pre className="bg-gray-700 p-4 rounded text-sm overflow-auto">
{JSON.stringify({
  currentOrigin: typeof window !== 'undefined' ? window.location.origin : 'N/A',
  signupRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/confirm` : 'N/A',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
}, null, 2)}
        </pre>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg mb-6">
        <h2 className="text-xl mb-4">Test Sign-Up</h2>
        <div className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full p-2 bg-gray-700 rounded"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full p-2 bg-gray-700 rounded"
          />
          <button
            onClick={handleSignUp}
            disabled={loading || !email || !password}
            className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
        </div>
      </div>

      {result && (
        <div className={`bg-gray-800 p-6 rounded-lg mb-6 ${result.success ? 'border-green-500' : 'border-red-500'} border`}>
          <h2 className={`text-xl mb-4 ${result.success ? 'text-green-400' : 'text-red-400'}`}>
            {result.success ? '✓ Success' : '✕ Error'}
          </h2>
          {result.error && (
            <p className="text-red-300 mb-4">{result.error}</p>
          )}
          {result.details && (
            <pre className="bg-gray-700 p-4 rounded text-sm overflow-auto">
{JSON.stringify(result.details, null, 2)}
            </pre>
          )}
        </div>
      )}

      <div className="bg-yellow-900 p-6 rounded-lg">
        <h2 className="text-xl mb-4 text-yellow-300">📝 Sign-Up Flow Notes</h2>
        <ul className="list-disc list-inside space-y-2 text-yellow-200">
          <li>Sign-up emails will redirect to: <code className="bg-gray-700 px-2 py-1 rounded">{typeof window !== 'undefined' ? window.location.origin : '[current-origin]'}/auth/confirm</code></li>
          <li>The confirmation page handles both <code className="bg-gray-700 px-2 py-1 rounded">?code=</code> and <code className="bg-gray-700 px-2 py-1 rounded">?token_hash=</code> parameters</li>
          <li>After confirmation, users are redirected to the home page with <code className="bg-gray-700 px-2 py-1 rounded">?verified=true</code></li>
          <li>This works on production, preview URLs, and localhost</li>
        </ul>
      </div>
    </div>
  );
}