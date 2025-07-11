'use client';

import React from 'react';

interface UpdateBannerProps {
  onUpdate: () => void;
  notes?: string;
}

const UpdateBanner: React.FC<UpdateBannerProps> = ({ onUpdate, notes }) => {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white p-4 rounded-lg shadow-lg border border-slate-700 flex flex-col sm:flex-row items-center gap-2 sm:gap-4 z-50">
      <p className="text-sm">A new version of the app is available.</p>
      {notes ? <p className="text-xs text-slate-300">{notes}</p> : null}
      <button
        onClick={onUpdate}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-md text-sm transition-colors"
      >
        Reload
      </button>
    </div>
  );
};

export default UpdateBanner;
