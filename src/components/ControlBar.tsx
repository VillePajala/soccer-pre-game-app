'use client';

import React from 'react';
import { 
    FaUndo, FaRedo, FaEye, FaEyeSlash, FaTrashAlt, FaEraser, FaUserPlus, 
    FaRegStopCircle, FaRegClock, FaPlay, FaPause // Added Play/Pause icons
} from 'react-icons/fa'; // Example using Font Awesome via react-icons

// Import translation hook
import { useTranslation } from 'react-i18next';

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
  onToggleInstructions: () => void;
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
  onToggleInstructions,
}) => {
  const { t, i18n } = useTranslation(); // Initialize translation hook, get i18n instance

  // Consistent Button Styles
  const baseButtonStyle = "text-slate-100 font-semibold py-2 px-2 w-11 h-10 flex items-center justify-center rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95 active:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900";
  const smallButtonStyle = "text-slate-100 font-semibold py-1 px-2 w-9 h-8 flex items-center justify-center rounded shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all duration-150 active:scale-95 active:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900"; // Made smaller for timer controls
  
  // Specific Colors
  const secondaryColor = "bg-slate-700 hover:bg-slate-600 focus:ring-slate-500";
  const resetColor = "bg-red-600 hover:bg-red-700 focus:ring-red-500";
  const clearColor = "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 text-white";
  const addOpponentColor = "bg-rose-700 hover:bg-rose-800 focus:ring-rose-600";
  const startColor = "bg-green-600 hover:bg-green-700 focus:ring-green-500";
  const pauseColor = "bg-orange-500 hover:bg-orange-600 focus:ring-orange-400";
  const timerControlBg = "bg-slate-900";

  return (
    <div 
      className="bg-slate-900/85 backdrop-blur-md p-1.5 sm:p-2 h-auto flex-shrink-0 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 shadow-lg border-t border-slate-700/50 relative z-50"
      style={{ touchAction: 'none' }}
    >
      {/* History */}
      <button onClick={onUndo} disabled={!canUndo} className={`${baseButtonStyle} ${secondaryColor}`} title={t('controlBar.undo') ?? "Undo"}><FaUndo size={20} /></button>
      <button onClick={onRedo} disabled={!canRedo} className={`${baseButtonStyle} ${secondaryColor}`} title={t('controlBar.redo') ?? "Redo"}><FaRedo size={20} /></button>
      
      {/* Visibility/Edit */}
      <button onClick={onToggleNames} className={`${baseButtonStyle} ${secondaryColor}`} title={t('controlBar.toggleNames') ?? "Toggle Names"}>
          {showPlayerNames ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
      </button>
      <button onClick={onClearDrawings} className={`${baseButtonStyle} ${clearColor}`} title={t('controlBar.clearDrawings') ?? "Clear Drawings"}><FaEraser size={20} /></button>
      <button onClick={onAddOpponent} className={`${baseButtonStyle} ${addOpponentColor}`} title={t('controlBar.addOpponent') ?? "Add Opponent"}><FaUserPlus size={20} style={{ color: 'white' }}/></button>
      
      {/* Danger Zone */}
      <button onClick={onResetField} className={`${baseButtonStyle} ${resetColor}`} title={t('controlBar.resetField') ?? "Reset Field"}><FaTrashAlt size={20} /></button>

      {/* Timer Controls Group (More Compact) */}
      <div className={`flex items-center space-x-2 ${timerControlBg}/90 backdrop-blur-sm p-1.5 rounded-lg border border-slate-700/50`}>
        {/* Toggle Overlay Button */}
        <button
          onClick={onToggleLargeTimerOverlay}
          className={`${baseButtonStyle} ${secondaryColor}`}
          title={t(showLargeTimerOverlay ? 'controlBar.toggleTimerOverlayHide' : 'controlBar.toggleTimerOverlayShow') ?? (showLargeTimerOverlay ? "Hide Large Timer" : "Show Large Timer")}
        >
           {showLargeTimerOverlay ? <FaRegStopCircle size={20} /> : <FaRegClock size={20} />}
        </button>
        {/* Timer Display */}
        <span className="text-slate-200 font-medium text-base tabular-nums mx-1">
          {formatTime(timeElapsedInSeconds)}
        </span>
        {/* Start/Pause Button (Icon Only) */}
        <button
          onClick={onStartPauseTimer}
          className={`${smallButtonStyle} ${isTimerRunning ? pauseColor : startColor}`}
          title={isTimerRunning ? "Pause" : "Start"} // Keep title for tooltip
        >
          {isTimerRunning ? <FaPause size={16}/> : <FaPlay size={16}/>}
        </button>
        {/* Reset Button (Icon Only) */}
        <button
          onClick={onResetTimer}
          disabled={timeElapsedInSeconds === 0 && !isTimerRunning}
          className={`${smallButtonStyle} ${secondaryColor}`}
          title="Reset" // Keep title for tooltip
        >
          <FaUndo size={16}/>
        </button>
      </div>

      {/* Help & Language */}
      <button 
        onClick={onToggleInstructions} 
        className={`${baseButtonStyle} ${secondaryColor}`}
        title={t('controlBar.help') ?? "Help"}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
        </svg>
      </button>
      <div className="flex items-center gap-1">
        <button 
          onClick={() => i18n.changeLanguage('en')}
          className={`py-1 px-1.5 rounded text-xs font-semibold transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-offset-slate-900 ${i18n.language === 'en' ? 'bg-yellow-500 text-slate-900 focus:ring-yellow-400' : 'bg-slate-600 hover:bg-slate-500 text-slate-200 focus:ring-slate-400'}`}
          disabled={i18n.language === 'en'}
        >
          EN
        </button>
        <button 
          onClick={() => i18n.changeLanguage('fi')}
          className={`py-1 px-1.5 rounded text-xs font-semibold transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-offset-slate-900 ${i18n.language === 'fi' ? 'bg-yellow-500 text-slate-900 focus:ring-yellow-400' : 'bg-slate-600 hover:bg-slate-500 text-slate-200 focus:ring-slate-400'}`}
          disabled={i18n.language === 'fi'}
        >
          FI
        </button>
      </div>
    </div>
  );
};

export default ControlBar;