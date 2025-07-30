'use client';

import Link from 'next/link';

export default function PasswordResetHelp() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Password Reset Instructions</h1>
      
      <div className="bg-blue-900 p-6 rounded-lg mb-6">
        <h2 className="text-xl mb-4 text-blue-300">📧 Having trouble with password reset?</h2>
        <p className="text-blue-100 mb-4">
          Due to security requirements, password reset links work best when you&apos;re signed out.
        </p>
        
        <div className="bg-blue-800 p-4 rounded mb-4">
          <h3 className="font-semibold mb-2">Try this workaround:</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-100">
            <li>Sign out of your account (if you&apos;re signed in)</li>
            <li>Click the password reset link in your email again</li>
            <li>The password reset form should appear</li>
          </ol>
        </div>
      </div>

      <div className="bg-yellow-900 p-6 rounded-lg mb-6">
        <h2 className="text-xl mb-4 text-yellow-300">⚠️ Alternative Method</h2>
        <p className="text-yellow-100 mb-4">
          If the email link doesn&apos;t work, you can also:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-yellow-100">
          <li>Go to the sign-in page</li>
          <li>Click &quot;Forgot Password?&quot;</li>
          <li>Enter your email address</li>
          <li>Check for a new password reset email</li>
        </ol>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl mb-4">Quick Actions</h2>
        <div className="space-y-2">
          <Link 
            href="/" 
            className="text-blue-400 hover:underline block"
          >
            → Back to App
          </Link>
          <Link 
            href="/debug-password-reset" 
            className="text-blue-400 hover:underline block"
          >
            → Test Password Reset
          </Link>
        </div>
      </div>
    </div>
  );
}