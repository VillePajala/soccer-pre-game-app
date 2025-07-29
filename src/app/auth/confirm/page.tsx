'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const confirmEmail = async () => {
      const supabase = createClient();
      
      try {
        // Get token_hash and type from URL parameters
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type');

        if (!token_hash || !type) {
          setError('Missing confirmation parameters');
          setLoading(false);
          return;
        }

        // Verify the email with Supabase
        const { error: confirmError } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as 'signup' | 'recovery' | 'email_change' | 'phone_change',
        });

        if (confirmError) {
          setError(`Email confirmation failed: ${confirmError.message}`);
        } else {
          // Success! Redirect to home page
          router.push('/');
        }
      } catch {
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