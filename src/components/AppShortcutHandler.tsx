'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface AppShortcutHandlerProps {
  onNewGame: () => void;
  onResumeGame: () => void;
  onViewStats: () => void;
  onManageRoster: () => void;
}

export default function AppShortcutHandler({
  onNewGame,
  onResumeGame,
  onViewStats,
  onManageRoster
}: AppShortcutHandlerProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const action = searchParams.get('action');
    
    if (action) {
      console.log('[App Shortcuts] Handling action:', action);
      
      // Handle the shortcut action
      switch (action) {
        case 'new-game':
          onNewGame();
          break;
        case 'resume-game':
          onResumeGame();
          break;
        case 'view-stats':
          onViewStats();
          break;
        case 'manage-roster':
          onManageRoster();
          break;
        default:
          console.warn('[App Shortcuts] Unknown action:', action);
      }
      
      // Clean up the URL parameter after handling
      const url = new URL(window.location.href);
      url.searchParams.delete('action');
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [searchParams, router, onNewGame, onResumeGame, onViewStats, onManageRoster]);

  // This component doesn't render anything
  return null;
}