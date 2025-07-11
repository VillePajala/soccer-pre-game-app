'use client';

import React from 'react';

interface OverallRatingSelectorProps {
  value: number | null;
  onChange: (value: number) => void;
}

const OverallRatingSelector: React.FC<OverallRatingSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
        <button
          key={num}
          type="button"
          onClick={() => onChange(num)}
          className={`px-2 py-1 text-sm rounded-md border border-slate-700/50 bg-slate-800/40 hover:bg-slate-800/60 transition-colors ${value === num ? 'bg-slate-700/75 border-indigo-500 text-yellow-400' : 'text-slate-200'}`}
        >
          {num}
        </button>
      ))}
    </div>
  );
};

export default OverallRatingSelector;
