'use client';

import React from 'react';
import { getConfigInfo } from '@/lib/storage/config';

export function SupabaseDebug() {
  const config = getConfigInfo();
  const enableSupabase = process.env.NEXT_PUBLIC_ENABLE_SUPABASE;
  
  return (
    <div className="fixed top-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-xs z-50">
      <h3 className="font-bold mb-2">Supabase Debug Info:</h3>
      <ul className="space-y-1">
        <li>ENABLE_SUPABASE: {enableSupabase || 'undefined'}</li>
        <li>Provider: {config.provider}</li>
        <li>Supabase Configured: {config.supabaseConfigured ? 'Yes' : 'No'}</li>
        <li>Fallback Enabled: {config.fallbackEnabled ? 'Yes' : 'No'}</li>
      </ul>
    </div>
  );
}