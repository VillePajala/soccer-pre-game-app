'use client';

import React from 'react';

interface AssessmentSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

const AssessmentSlider: React.FC<AssessmentSliderProps> = ({ label, value, onChange }) => {
  return (
    <div className="flex flex-col items-center space-y-1">
      <input
        type="range"
        min={1}
        max={5}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="appearance-none h-32 w-1 bg-indigo-600/70 rounded-full -rotate-90"
      />
      <span className="text-xs text-slate-300">{label}</span>
    </div>
  );
};

export default AssessmentSlider;
