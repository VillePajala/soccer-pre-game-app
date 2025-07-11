'use client';

import React from 'react';

interface OverallRatingSelectorProps {
  value: number;
  onChange: (value: number) => void;
}

const OverallRatingSelector: React.FC<OverallRatingSelectorProps> = ({ value, onChange }) => {
  const numbers = Array.from({ length: 10 }, (_, i) => i + 1);
  return (
    <div className="flex space-x-1">
      {numbers.map((n) => (
        <button
          key={n}
          type="button"
          aria-label={n.toString()}
          className={`px-2 py-1 rounded-md text-sm font-medium transition-colors ${
            value === n
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-800/40 text-slate-300 hover:bg-slate-800/60'
          }`}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
    </div>
  );
};

export default OverallRatingSelector;
