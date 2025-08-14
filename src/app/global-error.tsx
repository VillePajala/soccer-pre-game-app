'use client';

import * as Sentry from '@sentry/nextjs';
// import NextError from 'next/error'; // Unused import
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-8 max-w-lg w-full">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h1 className="text-2xl font-bold text-slate-100 mb-4">
                Something went wrong!
              </h1>
              <p className="text-slate-300 mb-6">
                A critical error occurred. The development team has been notified.
              </p>
              
              {process.env.NODE_ENV === 'development' && (
                <details className="text-left bg-slate-900 p-4 rounded border border-slate-600 mb-6">
                  <summary className="text-slate-400 cursor-pointer mb-2">
                    Technical Details
                  </summary>
                  <div className="text-xs text-red-400 space-y-2">
                    <div>
                      <strong>Error:</strong> {error.message}
                    </div>
                    {error.digest && (
                      <div>
                        <strong>Digest:</strong> {error.digest}
                      </div>
                    )}
                    <div>
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap mt-1 text-slate-500">
                        {error.stack}
                      </pre>
                    </div>
                  </div>
                </details>
              )}
              
              <div className="space-y-3">
                <button
                  onClick={reset}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="w-full bg-slate-600 hover:bg-slate-500 text-slate-200 font-medium py-2 px-4 rounded-md transition-colors"
                >
                  Go Home
                </button>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}