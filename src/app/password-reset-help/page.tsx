'use client';

import React from 'react';

export default function PasswordResetHelpPage() {
  return (
    <main className="max-w-2xl mx-auto p-6 text-slate-200">
      <h1 className="text-2xl font-semibold mb-4">Password reset help</h1>
      <p className="mb-3">If you requested a password reset but did not receive an email:</p>
      <ul className="list-disc pl-6 space-y-2">
        <li>Check your spam or junk folder</li>
        <li>Ensure you used the correct email address on your account</li>
        <li>Wait a few minutes and try again</li>
      </ul>
      <p className="mt-4">If the problem persists, contact support or your team admin.</p>
    </main>
  );
}


