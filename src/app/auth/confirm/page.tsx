'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

function ConfirmPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const confirmEmail = async () => {
      logger.debug('Confirm page - checking for confirmation parameters...');
      
      // Debug: Log URL info
      logger.debug('Confirm page URL info:', {
        href: window.location.href,
        hash: window.location.hash,
        search: window.location.search
      });
      
      try {
        // First check for code parameter in search params (newer method)
        const code = searchParams.get('code');
        if (code) {
          logger.debug('Sign-up code detected:', code.substring(0, 10) + '...');
          // Exchange code for session
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            logger.error('Sign-up code exchange error:', exchangeError);
            setError(`Email confirmation failed: ${exchangeError.message}`);
          } else {
            logger.debug('Sign-up code exchange successful!');
            setSuccess(true);
            setLoading(false);
            setTimeout(() => {
              router.push('/?verified=true');
            }, 2000);
            return;
          }
        }
        
        // Check for parameters in URL hash (Supabase sometimes sends them this way)
        let token_hash = searchParams.get('token_hash');
        let type = searchParams.get('type');
        
        if (!token_hash && window.location.hash) {
          logger.debug('No search params found, checking hash parameters...');
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          token_hash = hashParams.get('token') || hashParams.get('token_hash');
          type = hashParams.get('type');
          logger.debug('Hash params found:', { token_hash: !!token_hash, type });
        }

        if (!token_hash || !type) {
          logger.debug('Missing confirmation parameters - token_hash:', !!token_hash, 'type:', !!type);
          logger.debug('Available search params:', Array.from(searchParams.entries()));
          logger.debug('URL hash:', window.location.hash);
          setError('Missing confirmation parameters. Please check that you clicked the link from your email correctly, or try signing up again.');
          setLoading(false);
          return;
        }

        logger.debug('Using token method for confirmation - token:', token_hash, 'type:', type);
        
        // Try different verification methods based on what we have
        let confirmError = null;
        
        // First try verifyOtp with token_hash
        const verifyResult = await supabase.auth.verifyOtp({
          token_hash: token_hash,
          type: type as 'signup' | 'recovery' | 'email_change' | 'phone_change',
        });
        
        confirmError = verifyResult.error;
        
        // If that fails and we have an email parameter, try with email + token
        if (confirmError && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const email = hashParams.get('email');
          if (email && token_hash) {
            logger.debug('First attempt failed, trying with email:', email);
            const emailVerifyResult = await supabase.auth.verifyOtp({
              email: decodeURIComponent(email),
              token: token_hash,
              type: type as 'signup' | 'recovery' | 'email_change' | 'phone_change',
            });
            confirmError = emailVerifyResult.error;
          }
        }

        if (confirmError) {
          logger.error('Token verification error:', confirmError);
          setError(`Email confirmation failed: ${confirmError.message}`);
        } else {
          logger.debug('Token verification successful!');
          // Success! Show success state first, then redirect
          setSuccess(true);
          setLoading(false);
          setTimeout(() => {
            router.push('/?verified=true');
          }, 2000);
          return;
        }
      } catch (err) {
        logger.error('Unexpected error during confirmation:', err);
        setError('An unexpected error occurred during email confirmation');
      } finally {
        setLoading(false);
      }
    };

    confirmEmail();
  }, [searchParams, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold">Confirming your email...</h1>
          <p className="text-slate-400 mt-2">Please wait while we verify your account.</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-green-400 text-6xl mb-4">✓</div>
          <h1 className="text-xl font-semibold mb-4">Email Verified Successfully!</h1>
          <p className="text-slate-400 mb-6">
            Your email has been confirmed. You can now sign in to your account.
          </p>
          <div className="text-sm text-slate-500">
            Redirecting you to the app in a moment...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-400 text-6xl mb-4">✕</div>
          <h1 className="text-xl font-semibold mb-4">Email Confirmation Failed</h1>
          <p className="text-slate-400 mb-6">{error}</p>
          <div className="space-y-2">
            <button
              onClick={() => router.push('/')}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md"
            >
              Return to Home
            </button>
            <p className="text-sm text-slate-500">
              If you continue to have issues, please try signing up again or contact support.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // This shouldn't be reached, but just in case
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Redirecting...</h1>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold">Loading...</h1>
        </div>
      </div>
    }>
      <ConfirmPageContent />
    </Suspense>
  );
}