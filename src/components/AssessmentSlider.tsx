'use client';

import React from 'react';

interface AssessmentSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

const AssessmentSlider: React.FC<AssessmentSliderProps> = ({ label, value, onChange, min = 1, max = 10, step = 0.5 }) => {
  return (
    <div className="flex items-center space-x-2 w-full">
      <label className="text-sm text-slate-300 w-24 shrink-0">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-2 rounded-lg appearance-none cursor-pointer bg-slate-600"
        style={{ accentColor: `hsl(${120 * ((value - min) / (max - min))}, 70%, 50%)` }}
      />
      <span className="text-sm text-yellow-400 w-6 text-right">{value}</span>
    </div>
  );
};

export default AssessmentSlider;
