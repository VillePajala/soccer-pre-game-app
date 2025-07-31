'use client';

import React, { useState } from 'react';
import { AuthButton } from '@/components/auth/AuthButton';
import { ConnectionStatusIndicator } from '@/components/ConnectionStatusIndicator';
import { SyncProgressModal } from '@/components/SyncProgressModal';

export default function TopBar() {
  const [showSyncModal, setShowSyncModal] = useState(false);
  
  // Only show auth button if Supabase is enabled
  // Check for both 'true' and 'True' to handle case sensitivity
  const envValue = process.env.NEXT_PUBLIC_ENABLE_SUPABASE;
  const showAuthButton = envValue === 'true' || envValue === 'True';
  
  return (
    <div className="fixed top-0 right-0 z-40 p-4">
      <div className="flex items-center gap-3">
        {/* Connection Status Indicator - always show */}
        <div onClick={() => setShowSyncModal(true)}>
          <ConnectionStatusIndicator 
            className="cursor-pointer"
            showDetails={true}
          />
        </div>
        
        {/* Auth Button - only if Supabase enabled */}
        {showAuthButton && (
          <AuthButton 
            className="bg-gray-800/90 backdrop-blur hover:bg-gray-700 text-white px-4 py-2 rounded-lg shadow-lg border border-gray-700 transition-colors"
            iconSize="w-5 h-5"
          />
        )}
      </div>

      {/* Sync Progress Modal */}
      <SyncProgressModal 
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
      />
    </div>
  );
}