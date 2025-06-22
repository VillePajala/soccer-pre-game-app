'use client';

import React from 'react';

interface UpdateBannerProps {
  onUpdate: () => void;
}

const UpdateBanner: React.FC<UpdateBannerProps> = ({ onUpdate }) => {
  return (
    <div className="fixed bottom-4 right-4 bg-slate-800 text-white p-4 rounded-lg shadow-lg border border-slate-700 flex items-center gap-4 z-50">
      <p className="text-sm">A new version of the app is available.</p>
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