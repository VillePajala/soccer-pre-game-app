'use client';

import { useAuth } from '@clerk/nextjs';

export default function TestAuthPage() {
  const { isLoaded, isSignedIn, userId } = useAuth();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Clerk Auth Test</h1>
      <div className="space-y-2">
        <p>Is Loaded: {isLoaded ? 'Yes' : 'No'}</p>
        <p>Is Signed In: {isSignedIn ? 'Yes' : 'No'}</p>
        <p>User ID: {userId || 'None'}</p>
      </div>
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-2">Environment Variables Check:</h2>
        <pre className="bg-gray-100 p-4 rounded text-sm">
{`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 'Set' : 'Not Set'}
NEXT_PUBLIC_CLERK_SIGN_IN_URL: ${process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || 'Not Set'}
NEXT_PUBLIC_CLERK_SIGN_UP_URL: ${process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || 'Not Set'}
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: ${process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || 'Not Set'}
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: ${process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL || 'Not Set'}`}
        </pre>
      </div>
    </div>
  );
} 