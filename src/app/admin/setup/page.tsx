'use client';

export default function AdminSetupPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-8 max-w-lg w-full text-center">
        <div className="text-red-500 text-6xl mb-4">🚫</div>
        <h1 className="text-2xl font-bold text-slate-100 mb-4">
          Access Denied
        </h1>
        <p className="text-slate-300 mb-6">
          Admin setup is disabled for security reasons.
          Contact your system administrator to create admin accounts.
        </p>
        <button
          onClick={() => window.location.href = '/admin/monitoring'}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}