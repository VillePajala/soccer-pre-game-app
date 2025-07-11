'use client';

import React from 'react';

interface AssessmentSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

const AssessmentSlider: React.FC<AssessmentSliderProps> = ({ label, value, onChange }) => {
  return (
    <div className="flex flex-col items-center w-8">
      <label className="text-xs text-slate-400 mb-1" htmlFor={label}>{label}</label>
      <input
        id={label}
        type="range"
        min="1"
        max="5"
        step="0.5"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-8 h-32 rotate-[-90deg]"
      />
      <span className="text-xs text-slate-200 mt-1">{value}</span>
    </div>
  );
};

export default AssessmentSlider;
