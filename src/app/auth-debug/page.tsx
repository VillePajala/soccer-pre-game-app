'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAuthStorage } from '@/hooks/useAuthStorage';
import { authAwareStorageManager } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

export default function AuthDebugPage() {
  const { user, session, loading: authLoading } = useAuth();
  const { isAuthenticated, userId } = useAuthStorage();
  const [storageStatus, setStorageStatus] = useState<any>(null);
  const [supabaseSession, setSupabaseSession] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [games, setGames] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkStatus();
  }, [user, isAuthenticated]);

  const checkStatus = async () => {
    try {
      // Get storage manager status
      const status = await authAwareStorageManager.getStatus();
      setStorageStatus(status);

      // Get Supabase session directly
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error);
      }
      setSupabaseSession(session);
    } catch (err) {
      console.error('Error checking status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const testSupabaseConnection = async () => {
    setLoading(true);
    try {
      // Test 1: Check if we can connect to Supabase
      const { error: pingError } = await supabase.from('players').select('count').limit(1);
      console.log('Supabase ping result:', pingError ? 'Failed' : 'Success');

      // Test 2: Get current user
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      console.log('Current user:', currentUser);

      // Test 3: Try to fetch games
      const gamesResult = await authAwareStorageManager.getSavedGames();
      console.log('Games from storage manager:', gamesResult);
      setGames(gamesResult);

      // Test 4: Check what provider is actually being used
      console.log('Current provider:', authAwareStorageManager.getCurrentProviderName());
      
      await checkStatus();
    } catch (err) {
      console.error('Test error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const forceSupabase = async () => {
    try {
      console.log('Forcing Supabase provider...');
      await (authAwareStorageManager as any).forceProvider('supabase');
      await checkStatus();
    } catch (err) {
      console.error('Error forcing Supabase:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const signInTest = async () => {
    setLoading(true);
    try {
      // Use test credentials or prompt for them
      const email = prompt('Enter email:');
      const password = prompt('Enter password:');
      
      if (email && password) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          console.error('Sign in error:', error);
          setError(error.message);
        } else {
          console.log('Sign in successful!');
          // Wait a bit for auth state to propagate
          setTimeout(() => checkStatus(), 1000);
        }
      }
    } catch (err) {
      console.error('Sign in error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setTimeout(() => checkStatus(), 1000);
    } catch (err) {
      console.error('Sign out error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Auth & Storage Debug</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Auth Context Status */}
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">Auth Context Status</h2>
          <pre className="text-sm">
            {JSON.stringify({
              authLoading,
              userEmail: user?.email,
              userId: user?.id,
              hasSession: !!session,
              sessionExpiry: session?.expires_at,
            }, null, 2)}
          </pre>
        </div>

        {/* Auth Storage Hook Status */}
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">Auth Storage Hook</h2>
          <pre className="text-sm">
            {JSON.stringify({
              isAuthenticated,
              userId,
            }, null, 2)}
          </pre>
        </div>

        {/* Storage Manager Status */}
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">Storage Manager Status</h2>
          <pre className="text-sm">
            {JSON.stringify(storageStatus, null, 2)}
          </pre>
        </div>

        {/* Direct Supabase Session */}
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">Direct Supabase Session</h2>
          <pre className="text-sm">
            {JSON.stringify({
              hasSession: !!supabaseSession,
              userEmail: supabaseSession?.user?.email,
              userId: supabaseSession?.user?.id,
              expiresAt: supabaseSession?.expires_at,
            }, null, 2)}
          </pre>
        </div>

        {/* Environment Variables */}
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">Environment Variables</h2>
          <pre className="text-sm">
            {JSON.stringify({
              NEXT_PUBLIC_ENABLE_SUPABASE: process.env.NEXT_PUBLIC_ENABLE_SUPABASE,
              NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set',
              NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set',
            }, null, 2)}
          </pre>
        </div>

        {/* Games Data */}
        {games && (
          <div className="bg-gray-100 p-4 rounded">
            <h2 className="font-bold mb-2">Games Data</h2>
            <pre className="text-sm">
              {JSON.stringify({
                gameCount: Object.keys(games).length,
                gameIds: Object.keys(games).slice(0, 5),
              }, null, 2)}
            </pre>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={testSupabaseConnection}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Test Supabase Connection
          </button>
          <button
            onClick={forceSupabase}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Force Supabase Provider
          </button>
          <button
            onClick={signInTest}
            disabled={loading}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            Test Sign In
          </button>
          {user && (
            <button
              onClick={signOut}
              disabled={loading}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
            >
              Sign Out
            </button>
          )}
          <button
            onClick={checkStatus}
            disabled={loading}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
          >
            Refresh Status
          </button>
        </div>
      </div>
    </div>
  );
}