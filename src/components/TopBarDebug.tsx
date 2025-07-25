'use client';

import React from 'react';
import { AuthButton } from '@/components/auth/AuthButton';

export default function TopBarDebug() {
  // Try different ways of checking the env var
  const envValue = process.env.NEXT_PUBLIC_ENABLE_SUPABASE;
  const checkString = process.env.NEXT_PUBLIC_ENABLE_SUPABASE === 'true';
  const checkTruthy = !!process.env.NEXT_PUBLIC_ENABLE_SUPABASE;
  
  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-200 text-black p-2 z-50">
      <div className="text-xs space-y-1">
        <p>TopBarDebug - ENV: {envValue || 'undefined'} | === &quot;true&quot;: {checkString ? 'YES' : 'NO'} | truthy: {checkTruthy ? 'YES' : 'NO'}</p>
        <div className="flex gap-2 items-center">
          <span>Always show button:</span>
          <AuthButton 
            className="bg-gray-800 hover:bg-gray-700 text-white px-2 py-1 rounded"
            iconSize="w-4 h-4"
          />
        </div>
      </div>
    </div>
  );
}