'use client';

import React from 'react';

// Define props for ControlBar
interface ControlBarProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onToggleNames: () => void;
  // TODO: Add props for Reset
}

const ControlBar: React.FC<ControlBarProps> = ({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onToggleNames,
}) => {
  // Placeholder functions for other buttons
  const handleReset = () => console.log('Reset clicked');

  // Base button style
  const baseButtonStyle = "text-white font-semibold py-2 px-4 rounded shadow disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="bg-gray-700 p-2 h-16 flex-shrink-0 flex items-center justify-center space-x-3">
      <button
        onClick={onUndo} // Use passed handler
        disabled={!canUndo} // Use status prop
        className={`${baseButtonStyle} bg-gray-500 hover:bg-gray-600`}
      >
        Undo
      </button>
      <button
        onClick={onRedo} // Use passed handler
        disabled={!canRedo} // Use status prop
        className={`${baseButtonStyle} bg-gray-500 hover:bg-gray-600`}
      >
        Redo
      </button>
      <button
        onClick={onToggleNames}
        className={`${baseButtonStyle} bg-blue-500 hover:bg-blue-600`}
      >
        Toggle Names
      </button>
      {/* Optional Reset Button */}
      {/* <button
        onClick={handleReset}
        className={`${baseButtonStyle} bg-red-500 hover:bg-red-600`}
      >
        Reset
      </button> */}
    </div>
  );
};

export default ControlBar;