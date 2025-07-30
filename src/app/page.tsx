'use client';

import ModalProvider from '@/contexts/ModalProvider';
import HomePage from '@/components/HomePage';
import StartScreen from '@/components/StartScreen';
import { useState, useEffect, Suspense } from 'react';
import { getCurrentGameIdSetting } from '@/utils/appSettings';
import { getSavedGames } from '@/utils/savedGames';
import { useAuthStorage } from '@/hooks/useAuthStorage';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Component to handle verification toast that uses search params
function VerificationToast({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [show, setShow] = useState(false);


  useEffect(() => {
    const handlePasswordReset = async () => {
      // Debug: Log URL info
      if (typeof window !== 'undefined') {
        console.log('Page loaded - URL info:', {
          href: window.location.href,
          hash: window.location.hash,
          search: window.location.search,
          pathname: window.location.pathname
        });
        
        // Check for password reset code parameter (PKCE flow)
        const code = searchParams.get('code');
        
        if (code) {
          console.log('Password reset code detected, attempting direct exchange...');
          try {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) {
              console.error('PKCE code exchange error:', error);
              // Clean up URL and show error
              window.history.replaceState({}, '', window.location.pathname);
              router.push('/password-reset-help');
              return;
            } else {
              console.log('PKCE code exchange successful, redirecting to reset page...');
              // Clean up URL and redirect to reset page
              window.history.replaceState({}, '', window.location.pathname);
              router.push('/auth/reset-password');
              return;
            }
          } catch (err) {
            console.error('PKCE exchange failed:', err);
            window.history.replaceState({}, '', window.location.pathname);
            router.push('/password-reset-help');
            return;
          }
        }
        
        // Check for password reset in hash fragment (legacy flow)
        if (window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const hashType = hashParams.get('type');
          
          console.log('Hash params found:', { accessToken: accessToken?.substring(0, 20) + '...', type: hashType });
          
          if (hashType === 'recovery' && accessToken) {
            console.log('Password reset detected! Redirecting to reset page...');
            // Preserve the hash fragment in the redirect
            router.push(`/auth/reset-password${window.location.hash}`);
            return;
          }
        }
      }
    };

    handlePasswordReset();

    if (searchParams.get('verified') === 'true') {
      setShow(true);
      // Clean up the URL parameter
      router.replace('/', undefined);
      // Auto-hide toast after 5 seconds
      setTimeout(() => {
        setShow(false);
        onClose();
      }, 5000);
    }
  }, [searchParams, router, onClose]);

  if (!show) return null;

  return (
    <div className="fixed top-4 right-4 z-[200] max-w-sm">
      <div className="bg-green-600 text-white p-4 rounded-lg shadow-lg border border-green-500">
        <div className="flex items-center">
          <div className="text-green-200 text-lg mr-3">✓</div>
          <div>
            <h4 className="font-semibold">Email Verified!</h4>
            <p className="text-sm text-green-100 mt-1">
              Your email has been successfully verified. You can now sign in to your account.
            </p>
          </div>
          <button
            onClick={() => {
              setShow(false);
              onClose();
            }}
            className="ml-4 text-green-200 hover:text-white text-xl leading-none"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<'start' | 'home'>('start');
  const [initialAction, setInitialAction] = useState<'newGame' | 'loadGame' | 'resumeGame' | 'season' | 'stats' | null>(null);
  const [canResume, setCanResume] = useState(false);
  
  // Get auth state to listen for logout
  const { user } = useAuth();
  
  // Sync auth state with storage manager
  useAuthStorage();

  // Reset to StartScreen when user logs out
  useEffect(() => {
    if (!user && screen === 'home') {
      setScreen('start');
      setInitialAction(null);
    }
  }, [user, screen]);

  useEffect(() => {
    const checkResume = async () => {
      try {
        const lastId = await getCurrentGameIdSetting();
        if (!lastId) return;
        const games = await getSavedGames();
        if (games[lastId]) {
          setCanResume(true);
        }
      } catch {
        setCanResume(false);
      }
    };
    checkResume();
  }, []);

  const handleAction = (
    action: 'newGame' | 'loadGame' | 'resumeGame' | 'season' | 'stats'
  ) => {
    setInitialAction(action);
    setScreen('home');
  };

  return (
    <ModalProvider>
      {screen === 'start' ? (
        <StartScreen
          onStartNewGame={() => handleAction('newGame')}
          onLoadGame={() => handleAction('loadGame')}
          onResumeGame={() => handleAction('resumeGame')}
          canResume={canResume}
          onCreateSeason={() => handleAction('season')}
          onViewStats={() => handleAction('stats')}
          isAuthenticated={!!user}
        />
      ) : (
        <HomePage initialAction={initialAction ?? undefined} skipInitialSetup />
      )}
      
      {/* Email Verification Success Toast - wrapped in Suspense */}
      <Suspense fallback={null}>
        <VerificationToast onClose={() => {}} />
      </Suspense>
    </ModalProvider>
  );
}
