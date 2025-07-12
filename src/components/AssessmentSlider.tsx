'use client';

import React, { useRef, useState } from 'react';

interface AssessmentSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

const AssessmentSlider: React.FC<AssessmentSliderProps> = ({ label, value, onChange }) => {
  const [showPicker, setShowPicker] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const numbers = Array.from({ length: 19 }, (_, i) => 1 + i * 0.5);

  const handlePointerDown = () => {
    timeoutRef.current = setTimeout(() => setShowPicker(true), 500);
  };

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handlePointerUp = () => {
    clearTimer();
  };

  return (
    <div className="flex items-center space-x-2 w-full relative">
      <label className="text-sm text-slate-300 w-24 shrink-0">{label}</label>
      <input
        type="range"
        min={1}
        max={10}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="flex-1 h-2 rounded-lg appearance-none cursor-pointer bg-slate-600 accent-indigo-600"
      />
      <span className="text-sm text-yellow-400 w-6 text-right">{value}</span>
      {showPicker && (
        <select
          data-testid="wheel-picker"
          value={value}
          onChange={(e) => {
            onChange(Number(e.target.value));
            setShowPicker(false);
          }}
          onBlur={() => setShowPicker(false)}
          size={5}
          className="absolute top-full mt-1 bg-slate-700 text-white rounded-md p-1 focus:outline-none"
        >
          {numbers.map((n) => (
            <option key={n} value={n} className="text-center">
              {n}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

export default AssessmentSlider;
