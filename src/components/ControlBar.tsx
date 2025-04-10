'use client';

import React from 'react';

const ControlBar: React.FC = () => {
  // Placeholder functions for button clicks
  const handleUndo = () => console.log('Undo clicked');
  const handleRedo = () => console.log('Redo clicked');
  const handleToggleNames = () => console.log('Toggle Names clicked');
  const handleReset = () => console.log('Reset clicked'); // Optional

  return (
    <div className="bg-gray-300 p-2 h-16 flex-shrink-0 flex items-center justify-center space-x-3">
      <button
        onClick={handleUndo}
        className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded shadow"
      >
        Undo
      </button>
      <button
        onClick={handleRedo}
        className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded shadow"
      >
        Redo
      </button>
      <button
        onClick={handleToggleNames}
        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded shadow"
      >
        Toggle Names
      </button>
      {/* Optional Reset Button */}
      {/* <button
        onClick={handleReset}
        className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded shadow"
      >
        Reset
      </button> */}
    </div>
  );
};

export default ControlBar; 