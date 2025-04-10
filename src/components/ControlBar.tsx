'use client';

import React from 'react';

// Define props for ControlBar
interface ControlBarProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onToggleNames: () => void;
  onResetField: () => void;
  onClearDrawings: () => void;
  onAddOpponent: () => void;
  // Timer props
  timeElapsedInSeconds: number;
  isTimerRunning: boolean;
  onStartPauseTimer: () => void;
  onResetTimer: () => void;
  // Timer Overlay props
  showLargeTimerOverlay: boolean;
  onToggleLargeTimerOverlay: () => void;
  // TODO: Add props for Reset
}

// Helper function to format time
const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const ControlBar: React.FC<ControlBarProps> = ({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onToggleNames,
  onResetField,
  onClearDrawings,
  onAddOpponent,
  // Timer props
  timeElapsedInSeconds,
  isTimerRunning,
  onStartPauseTimer,
  onResetTimer,
  // Timer Overlay props
  showLargeTimerOverlay,
  onToggleLargeTimerOverlay,
}) => {
  // Placeholder functions for other buttons
  const handleReset = () => console.log('Reset clicked');

  // Base button style
  const baseButtonStyle = "text-white font-semibold py-2 px-4 rounded shadow disabled:opacity-50 disabled:cursor-not-allowed";
  const smallButtonStyle = "text-white font-semibold py-1 px-2 rounded shadow disabled:opacity-50 disabled:cursor-not-allowed text-sm"; // Smaller buttons for timer controls

  return (
    <div className="bg-gray-700 p-2 h-20 flex-shrink-0 flex items-center justify-center space-x-3">
      {/* Action Buttons */}
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
      {/* Reset Button */}
      <button
        onClick={onResetField} // Use passed handler
        className={`${baseButtonStyle} bg-red-500 hover:bg-red-600`}
      >
        Reset Field
      </button>
      {/* Clear Drawings Button */}
      <button
        onClick={onClearDrawings} // Use passed handler
        className={`${baseButtonStyle} bg-yellow-500 hover:bg-yellow-600`}
      >
        Clear Drawings
      </button>
      {/* Add Opponent Button */}
      <button
        onClick={onAddOpponent} // Use passed handler
        className={`${baseButtonStyle} bg-red-700 hover:bg-red-800`}
      >
        Add Opponent
      </button>

      {/* Spacer */}
      <div className="flex-grow"></div>

      {/* Timer Controls */}
      <div className="flex items-center space-x-2 bg-gray-800 p-2 rounded"> {/* Reduced padding/spacing */}
        {/* Toggle Overlay Button */}
        <button
          onClick={onToggleLargeTimerOverlay}
          className={`${smallButtonStyle} ${showLargeTimerOverlay ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-500 hover:bg-purple-600'}`}
          title={showLargeTimerOverlay ? "Hide Large Timer" : "Show Large Timer"}
        >
           {/* Simple Icon Placeholder - Could use SVG */}
           {showLargeTimerOverlay ? '⏹️' : '⏱️'}
        </button>
        {/* Small Timer Display */}
        <span className="text-white font-semibold text-base tabular-nums mx-1"> {/* Reduced text size, added margin */}
          {formatTime(timeElapsedInSeconds)}
        </span>
        {/* Start/Pause Button */}
        <button
          onClick={onStartPauseTimer}
          className={`${smallButtonStyle} ${isTimerRunning ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'}`}
        >
          {isTimerRunning ? 'Pause' : 'Start'}
        </button>
        {/* Reset Button */}
        <button
          onClick={onResetTimer}
          disabled={timeElapsedInSeconds === 0 && !isTimerRunning}
          className={`${smallButtonStyle} bg-gray-500 hover:bg-gray-600`}
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default ControlBar;