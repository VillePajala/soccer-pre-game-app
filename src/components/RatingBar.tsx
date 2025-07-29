'use client';

import React from 'react';

interface RatingBarProps {
  value: number;
  max?: number;
}

const RatingBar: React.FC<RatingBarProps> = ({ value, max = 10 }) => {
  const pct = Math.min(Math.max(value, 0), max) / max * 100;
  const hue = 120 * (value / max); // red to green
  const color = `hsl(${hue}, 70%, 50%)`;
  return (
    <div className="flex items-center space-x-2 w-full">
      <div className="flex-1 h-2 bg-slate-700 rounded relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-sm text-yellow-400 w-8 text-right">{value.toFixed(1)}</span>
    </div>
  );
};

export default React.memo(RatingBar);
