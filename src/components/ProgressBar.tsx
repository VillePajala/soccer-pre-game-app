'use client';
import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ current, total }) => {
  const pct = total > 0 ? Math.min(current / total, 1) * 100 : 0;
  return (
    <div className="w-full h-2 bg-slate-700 rounded overflow-hidden">
      <div className="h-full bg-indigo-600" style={{ width: `${pct}%` }} />
    </div>
  );
};

export default ProgressBar;
