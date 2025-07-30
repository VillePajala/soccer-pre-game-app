'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface AuthSettings {
  currentUrl: string;
  supabaseUrl?: string;
  hasSession: boolean;
  sessionEmail?: string;
}

export default function CheckSiteUrl() {
  const [authSettings, setAuthSettings] = useState<AuthSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Get current session to check auth state
        const { data: { session } } = await supabase.auth.getSession();
        
        setAuthSettings({
          currentUrl: window.location.origin,
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasSession: !!session,
          sessionEmail: session?.user?.email,
        });
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Check Supabase Site URL Configuration</h1>
      
      <div className="bg-gray-800 p-6 rounded-lg mb-6">
        <h2 className="text-xl mb-4">Current Environment</h2>
        <pre className="bg-gray-700 p-4 rounded text-sm overflow-auto">
{JSON.stringify(authSettings, null, 2)}
        </pre>
      </div>

      <div className="bg-blue-900 p-6 rounded-lg mb-6">
        <h2 className="text-xl mb-4 text-blue-300">📋 How to Check Your Site URL in Supabase</h2>
        <ol className="list-decimal list-inside space-y-3 text-blue-100">
          <li>
            <strong>Go to Supabase Dashboard</strong>
            <br />
            <a href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              {process.env.NEXT_PUBLIC_SUPABASE_URL}
            </a>
          </li>
          <li>
            <strong>Navigate to Settings → Authentication</strong>
            <br />
            <span className="text-sm text-blue-200">Or use direct link: </span>
            <a href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/project/_/settings/auth`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm">
              Authentication Settings
            </a>
          </li>
          <li>
            <strong>Find &quot;Site URL&quot;</strong>
            <br />
            <span className="text-sm text-blue-200">This should be your main production URL</span>
          </li>
          <li>
            <strong>Find &quot;Redirect URLs&quot;</strong>
            <br />
            <span className="text-sm text-blue-200">This should include all allowed domains</span>
          </li>
        </ol>
      </div>

      <div className="bg-green-900 p-6 rounded-lg mb-6">
        <h2 className="text-xl mb-4 text-green-300">✅ Recommended Configuration</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-green-200">Site URL:</h3>
            <code className="bg-gray-800 px-3 py-1 rounded block mt-1">https://prosoccercoach.vercel.app</code>
          </div>
          <div>
            <h3 className="font-semibold text-green-200">Redirect URLs (one per line):</h3>
            <pre className="bg-gray-800 px-3 py-2 rounded block mt-1 text-sm">https://prosoccercoach.vercel.app/**{'\n'}https://*-ville-pajalas-projects.vercel.app/**{'\n'}http://localhost:3000/**</pre>
          </div>
        </div>
      </div>

      <div className="bg-yellow-900 p-6 rounded-lg">
        <h2 className="text-xl mb-4 text-yellow-300">⚠️ Important Notes</h2>
        <ul className="list-disc list-inside space-y-2 text-yellow-200">
          <li>
            <strong>Site URL</strong> is used as the default redirect for password reset emails
          </li>
          <li>
            <strong>Redirect URLs</strong> must include all domains where your app runs
          </li>
          <li>
            Password reset emails will always go to the Site URL, but the app handles redirects
          </li>
          <li>
            If testing on preview URLs, the email link will go to production, but the token will work
          </li>
        </ul>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg mt-6">
        <h2 className="text-xl mb-4">Quick Links</h2>
        <div className="space-y-2">
          <Link 
            href="/debug-password-reset" 
            className="text-blue-400 hover:underline block"
          >
            → Test Password Reset
          </Link>
          <Link 
            href="/test-signup" 
            className="text-blue-400 hover:underline block"
          >
            → Test Sign Up
          </Link>
          <Link 
            href="/" 
            className="text-blue-400 hover:underline block"
          >
            → Back to App
          </Link>
        </div>
      </div>
    </div>
  );
}