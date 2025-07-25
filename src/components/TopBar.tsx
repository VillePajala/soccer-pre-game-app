'use client';

import React from 'react';
import { AuthButton } from '@/components/auth/AuthButton';

export default function TopBar() {
  // Only show auth button if Supabase is enabled
  // Check for both 'true' and 'True' to handle case sensitivity
  const envValue = process.env.NEXT_PUBLIC_ENABLE_SUPABASE;
  const showAuthButton = envValue === 'true' || envValue === 'True';
  
  if (!showAuthButton) {
    return null;
  }

  return (
    <div className="fixed top-0 right-0 z-40 p-4">
      <AuthButton 
        className="bg-gray-800/90 backdrop-blur hover:bg-gray-700 text-white px-4 py-2 rounded-lg shadow-lg border border-gray-700 transition-colors"
        iconSize="w-5 h-5"
      />
    </div>
  );
}