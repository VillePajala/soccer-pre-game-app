'use client';

import React from 'react';

export interface RatingBarProps {
  value?: number;
  max?: number;
  rating?: number;
  maxRating?: number;
}

const RatingBar: React.FC<RatingBarProps> = ({ value, max = 10, rating, maxRating }) => {
  // Support both value/max and rating/maxRating props
  const actualValue = rating !== undefined ? rating : (value ?? 0);
  const actualMax = maxRating !== undefined ? maxRating : max;
  const pct = Math.min(Math.max(actualValue, 0), actualMax) / actualMax * 100;
  const hue = 120 * (actualValue / actualMax); // red to green
  const color = `hsl(${hue}, 70%, 50%)`;
  return (
    <div className="flex items-center space-x-2 w-full">
      <div className="flex-1 h-2 bg-slate-700 rounded relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-sm text-yellow-400 w-8 text-right">{actualValue.toFixed(1)}</span>
    </div>
  );
};

export default React.memo(RatingBar);
