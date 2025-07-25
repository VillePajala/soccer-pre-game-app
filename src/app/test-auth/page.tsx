'use client';

import { useEffect, useState } from 'react';
import { HiOutlineUser } from 'react-icons/hi2';
import { AuthButton } from '@/components/auth/AuthButton';

export default function TestAuthPage() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const enableSupabase = process.env.NEXT_PUBLIC_ENABLE_SUPABASE;
  const showAuthButton = process.env.NEXT_PUBLIC_ENABLE_SUPABASE === 'true';

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">Auth Button Test Page</h1>
      
      <div className="bg-gray-100 p-6 rounded-lg space-y-4">
        <h2 className="text-xl font-semibold">Environment Check</h2>
        <div className="space-y-2">
          <p><strong>NEXT_PUBLIC_ENABLE_SUPABASE:</strong> <code>{enableSupabase || 'undefined'}</code></p>
          <p><strong>Type:</strong> <code>{typeof enableSupabase}</code></p>
          <p><strong>Should show auth button:</strong> <code>{showAuthButton ? 'YES' : 'NO'}</code></p>
          <p><strong>Mounted:</strong> <code>{mounted ? 'YES' : 'NO'}</code></p>
        </div>
      </div>

      <div className="bg-blue-100 p-6 rounded-lg space-y-4">
        <h2 className="text-xl font-semibold">Icon Test</h2>
        <p>Can you see this icon? → <HiOutlineUser className="inline w-6 h-6" /></p>
        <p>If no icon appears above, react-icons may not be loading properly.</p>
      </div>

      <div className="bg-green-100 p-6 rounded-lg space-y-4">
        <h2 className="text-xl font-semibold">Direct AuthButton Render</h2>
        <p>This renders AuthButton directly without TopBar:</p>
        <div className="mt-4">
          <AuthButton 
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg inline-flex items-center"
            iconSize="w-5 h-5"
          />
        </div>
      </div>

      <div className="bg-purple-100 p-6 rounded-lg space-y-4">
        <h2 className="text-xl font-semibold">TopBar Logic Test</h2>
        <div className="space-y-2">
          {showAuthButton ? (
            <div>
              <p className="text-green-600 font-semibold">✅ TopBar should render the auth button</p>
              <p>The condition <code>process.env.NEXT_PUBLIC_ENABLE_SUPABASE === &apos;true&apos;</code> is met.</p>
            </div>
          ) : (
            <div>
              <p className="text-red-600 font-semibold">❌ TopBar will NOT render the auth button</p>
              <p>The condition <code>process.env.NEXT_PUBLIC_ENABLE_SUPABASE === &apos;true&apos;</code> is NOT met.</p>
              <p>Current value: <code>{enableSupabase || 'undefined'}</code></p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-yellow-100 p-6 rounded-lg space-y-4">
        <h2 className="text-xl font-semibold">Manual Button Tests</h2>
        <div className="space-y-4">
          <div>
            <p className="mb-2">Button with dark background (similar to TopBar):</p>
            <button className="bg-gray-800/90 backdrop-blur hover:bg-gray-700 text-white px-4 py-2 rounded-lg shadow-lg border border-gray-700 transition-colors">
              <HiOutlineUser className="w-5 h-5" />
            </button>
          </div>
          <div>
            <p className="mb-2">Button with light background:</p>
            <button className="bg-white hover:bg-gray-100 text-gray-800 px-4 py-2 rounded-lg shadow-lg border border-gray-300 transition-colors">
              <HiOutlineUser className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-red-100 p-6 rounded-lg">
        <h2 className="text-xl font-semibold">Troubleshooting Steps</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Check if the icon appears in the &quot;Icon Test&quot; section above</li>
          <li>Check if AuthButton renders in the &quot;Direct AuthButton Render&quot; section</li>
          <li>Verify the environment variable value matches exactly &quot;true&quot;</li>
          <li>Check the browser console for any errors</li>
          <li>Inspect the top-right corner of your main app - the button might be there but hard to see</li>
        </ol>
      </div>
    </div>
  );
}