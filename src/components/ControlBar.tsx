'use client';

import React from 'react';
import { 
    FaUndo, FaRedo, FaEye, FaEyeSlash, FaTrashAlt, FaEraser, FaUserPlus 
} from 'react-icons/fa'; // Example using Font Awesome via react-icons

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
  // Add name visibility prop
  showPlayerNames: boolean;
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
  // Destructure name visibility prop
  showPlayerNames,
}) => {
  // Placeholder functions for other buttons
  const handleReset = () => console.log('Reset clicked');

  // Consistent Button Styles
  const baseButtonStyle = "text-gray-100 font-semibold py-2 px-4 rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150";
  const smallButtonStyle = "text-gray-100 font-semibold py-1 px-3 rounded shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors duration-150";
  
  // Specific Colors
  const primaryColor = "bg-blue-600 hover:bg-blue-700";
  const secondaryColor = "bg-gray-600 hover:bg-gray-500";
  const resetColor = "bg-red-600 hover:bg-red-700";
  const clearColor = "bg-yellow-500 hover:bg-yellow-600 text-gray-900"; // Yellow needs dark text
  const addOpponentColor = "bg-red-700 hover:bg-red-800"; // Keep distinct red for opponent?
  const startColor = "bg-green-600 hover:bg-green-700";
  const pauseColor = "bg-orange-500 hover:bg-orange-600";
  const timerControlBg = "bg-gray-900"; // Darker background for timer area
  const intervalControlBg = "bg-gray-900"; 

  return (
    <div className="bg-gray-800 p-3 h-20 flex-shrink-0 flex items-center space-x-4"> {/* Increased base spacing between groups */}
      {/* Group 1: Undo/Redo */}
      <div className="flex items-center space-x-2">
        <button onClick={onUndo} disabled={!canUndo} className={`${baseButtonStyle} ${secondaryColor}`} title="Undo"><FaUndo /></button>
        <button onClick={onRedo} disabled={!canRedo} className={`${baseButtonStyle} ${secondaryColor}`} title="Redo"><FaRedo /></button>
      </div>
      
      {/* Group 2: Toggles */}
      <div className="flex items-center space-x-2">
        <button onClick={onToggleNames} className={`${baseButtonStyle} ${secondaryColor}`} title="Toggle Names">
          {showPlayerNames ? <FaEyeSlash /> : <FaEye />}
        </button>
         <button
          onClick={onToggleLargeTimerOverlay}
          className={`${baseButtonStyle} ${secondaryColor}`}
          title={showLargeTimerOverlay ? "Hide Large Timer" : "Show Large Timer"}
        >
           {showLargeTimerOverlay ? '⏹️' : '⏱️'} {/* Using text icons for toggle timer */}
        </button>
      </div>

      {/* Group 3: Field Actions */}
      <div className="flex items-center space-x-2">
        <button onClick={onResetField} className={`${baseButtonStyle} ${resetColor}`} title="Reset Field"><FaTrashAlt /></button>
        <button onClick={onClearDrawings} className={`${baseButtonStyle} ${clearColor}`} title="Clear Drawings"><FaEraser /></button>
        <button onClick={onAddOpponent} className={`${baseButtonStyle} ${addOpponentColor}`} title="Add Opponent"><FaUserPlus style={{ color: 'white' }}/>
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-grow"></div>

      {/* Group 4: Timer Controls */}
      <div className={`flex items-center space-x-2 ${timerControlBg} p-2 rounded-lg`}> 
        {/* Small Timer Display */}
        <span className="text-gray-100 font-semibold text-base tabular-nums mx-1">
          {formatTime(timeElapsedInSeconds)}
        </span>
        {/* Start/Pause Button */}
        <button
          onClick={onStartPauseTimer}
          className={`${smallButtonStyle} ${isTimerRunning ? pauseColor : startColor}`}
        >
          {isTimerRunning ? 'Pause' : 'Start'}
        </button>
        {/* Reset Button */}
        <button
          onClick={onResetTimer}
          disabled={timeElapsedInSeconds === 0 && !isTimerRunning}
          className={`${smallButtonStyle} ${secondaryColor}`}
        >
          Reset
        </button>
      </div>

    </div>
  );
};

export default ControlBar;