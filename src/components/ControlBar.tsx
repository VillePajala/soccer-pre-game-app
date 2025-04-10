'use client';

import React from 'react';
import { 
    FaUndo, FaRedo, FaEye, FaEyeSlash, FaTrashAlt, FaEraser, FaUserPlus, 
    FaRegStopCircle, FaRegClock // Added Icons for Overlay Toggle
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
  // Consistent Button Styles
  const baseButtonStyle = "text-slate-100 font-semibold py-2 px-2 w-11 h-10 flex items-center justify-center rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95 active:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900";
  const smallButtonStyle = "text-slate-100 font-semibold py-1 px-3 rounded shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all duration-150 active:scale-95 active:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900";
  
  // Specific Colors
  const secondaryColor = "bg-slate-700 hover:bg-slate-600 focus:ring-slate-500";
  const resetColor = "bg-red-600 hover:bg-red-700 focus:ring-red-500";
  const clearColor = "bg-yellow-500 hover:bg-yellow-600 text-gray-900 focus:ring-yellow-400";
  const addOpponentColor = "bg-rose-700 hover:bg-rose-800 focus:ring-rose-600";
  const startColor = "bg-green-600 hover:bg-green-700 focus:ring-green-500";
  const pauseColor = "bg-orange-500 hover:bg-orange-600 focus:ring-orange-400";
  const timerControlBg = "bg-slate-900";

  return (
    <div 
      className="bg-slate-900/85 backdrop-blur-md p-2 sm:p-4 h-auto min-h-20 flex-shrink-0 flex flex-wrap items-center justify-center space-x-1 sm:space-x-2 shadow-lg border-t border-slate-700/50"
      style={{ touchAction: 'none' }}
    >
      <button onClick={onUndo} disabled={!canUndo} className={`${baseButtonStyle} ${secondaryColor}`} title="Undo"><FaUndo size={20} /></button>
      <button onClick={onRedo} disabled={!canRedo} className={`${baseButtonStyle} ${secondaryColor}`} title="Redo"><FaRedo size={20} /></button>
        
      <button onClick={onToggleNames} className={`${baseButtonStyle} ${secondaryColor}`} title="Toggle Names">
          {showPlayerNames ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
      </button>
      <button
          onClick={onToggleLargeTimerOverlay}
          className={`${baseButtonStyle} ${secondaryColor}`}
          title={showLargeTimerOverlay ? "Hide Large Timer" : "Show Large Timer"}
        >
           {showLargeTimerOverlay ? <FaRegStopCircle size={20} /> : <FaRegClock size={20} />}
      </button>

      <button onClick={onResetField} className={`${baseButtonStyle} ${resetColor}`} title="Reset Field"><FaTrashAlt size={20} /></button>
      <button onClick={onClearDrawings} className={`${baseButtonStyle} ${clearColor}`} title="Clear Drawings"><FaEraser size={20} /></button>
      <button onClick={onAddOpponent} className={`${baseButtonStyle} ${addOpponentColor}`} title="Add Opponent"><FaUserPlus size={20} style={{ color: 'white' }}/>
      </button>

      <div className={`flex items-center space-x-2 ${timerControlBg}/90 backdrop-blur-sm p-2 rounded-lg border border-slate-700/50 mx-1 sm:mx-2`}>
        <span className="text-slate-200 font-medium text-base tabular-nums mx-1">
          {formatTime(timeElapsedInSeconds)}
        </span>
        <button
          onClick={onStartPauseTimer}
          className={`${smallButtonStyle} ${isTimerRunning ? pauseColor : startColor}`}
        >
          {isTimerRunning ? 'Pause' : 'Start'}
        </button>
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