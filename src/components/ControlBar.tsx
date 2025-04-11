'use client';

import React from 'react';
import { 
    FaUndo, FaRedo, FaEye, FaEyeSlash, FaTrashAlt, FaEraser, FaUserPlus, 
    FaRegStopCircle, FaRegClock, FaPlay, FaPause,
    FaExpand, FaCompress // Icons for Fullscreen
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
  // Add Fullscreen props
  isFullscreen: boolean;
  onToggleFullScreen: () => void;
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
  // Destructure Fullscreen props
  isFullscreen,
  onToggleFullScreen,
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
  // const timerControlBg = "bg-slate-900"; // No longer needed

  const handleLanguageToggle = () => {
    const nextLang = i18n.language === 'en' ? 'fi' : 'en';
    i18n.changeLanguage(nextLang);
  };

  return (
    <div 
      className="bg-slate-900/85 backdrop-blur-md p-1.5 sm:p-2 h-auto flex-shrink-0 flex flex-wrap items-center justify-center gap-x-1.5 sm:gap-x-2 gap-y-1.5 shadow-lg border-t border-slate-700/50 relative z-50"
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

      {/* --- Timer Controls (Inline) --- */}
      {/* Toggle Overlay Button */}
      <button
        onClick={onToggleLargeTimerOverlay}
        className={`${baseButtonStyle} ${secondaryColor}`}
        title={t(showLargeTimerOverlay ? 'controlBar.toggleTimerOverlayHide' : 'controlBar.toggleTimerOverlayShow') ?? (showLargeTimerOverlay ? "Hide Large Timer" : "Show Large Timer")}
      >
          {showLargeTimerOverlay ? <FaRegStopCircle size={20} /> : <FaRegClock size={20} />}
      </button>
      {/* Timer Display */}
      <span className="text-slate-200 font-semibold text-lg tabular-nums mx-1 px-2 py-1 rounded bg-slate-800/60">
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
      {/* --- End Timer Controls --- */}

      {/* Meta Controls (Help, Fullscreen, Language) */}
      <div className="flex items-center gap-x-1.5">
        <button 
          onClick={onToggleInstructions} 
          className={`${baseButtonStyle} ${secondaryColor}`}
          title={t('controlBar.help') ?? "Help"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
          </svg>
        </button>
        {/* Fullscreen Button */}
        <button 
          onClick={onToggleFullScreen}
          className={`${baseButtonStyle} ${secondaryColor}`}
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? <FaCompress size={18} /> : <FaExpand size={18} />}
        </button>
        {/* Single Language Toggle Button - Shows the NEXT language */}
        <button 
          onClick={handleLanguageToggle}
          className={`${baseButtonStyle} ${secondaryColor} w-12`}
          title="Switch Language"
        >
          {i18n.language === 'en' ? 'FI' : 'EN'}
        </button>
      </div>
    </div>
  );
};

export default ControlBar;