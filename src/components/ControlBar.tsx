'use client';

import React from 'react';
// Import Heroicons (Outline style)
import {
    HiOutlineArrowUturnLeft,
    HiOutlineArrowUturnRight,
    HiOutlineEye,
    HiOutlineEyeSlash,
    HiOutlineTrash,
    HiOutlineBackspace, // Icon for Clear Drawings
    HiOutlineUserPlus,
    HiOutlineStopCircle,
    HiOutlineClock,
    HiOutlineArrowsPointingOut, // Replaces FaExpand
    HiOutlineArrowsPointingIn,  // Replaces FaCompress
    HiOutlineClipboardDocumentList, // Replaces FaClipboardList
    HiOutlineQuestionMarkCircle,
    HiOutlineLanguage
} from 'react-icons/hi2'; // Using hi2 for Heroicons v2 Outline
// Keep FaFutbol for now unless a good Heroicon alternative is found
import { FaFutbol } from 'react-icons/fa';

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
  onToggleGoalLogModal: () => void; // Add prop for goal modal
  onToggleGameStatsModal: () => void; // Add prop for stats modal
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
  onToggleGoalLogModal, // Destructure goal modal handler
  onToggleGameStatsModal // Destructure stats modal handler
}) => {
  const { t, i18n } = useTranslation(); // Initialize translation hook, get i18n instance

  // Consistent Button Styles - Adjusted active state
  const baseButtonStyle = "text-slate-100 font-semibold py-2 px-2 w-10 h-10 flex items-center justify-center rounded-md shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900";
  
  // Specific Colors - Added specific hover backgrounds
  const secondaryColor = "bg-slate-700 hover:bg-slate-600 focus:ring-slate-500";
  const resetColor = "bg-red-600 hover:bg-red-500 focus:ring-red-500";
  const clearColor = "bg-amber-600 hover:bg-amber-500 focus:ring-amber-500 text-white";
  const addOpponentColor = "bg-rose-700 hover:bg-rose-600 focus:ring-rose-600";
  const logGoalColor = "bg-blue-600 hover:bg-blue-500 focus:ring-blue-500"; 
  // const startColor = "bg-green-600 hover:bg-green-500 focus:ring-green-500"; // Not currently used
  // const pauseColor = "bg-orange-500 hover:bg-orange-400 focus:ring-orange-400"; // Not currently used

  const handleLanguageToggle = () => {
    const nextLang = i18n.language === 'en' ? 'fi' : 'en';
    i18n.changeLanguage(nextLang);
  };

  const iconSize = "w-6 h-6"; // Standard icon size class

  return (
    <div 
      className="bg-slate-900/85 backdrop-blur-md p-1 sm:p-1.5 h-auto flex-shrink-0 flex flex-wrap items-center justify-center gap-x-1 sm:gap-x-1.5 gap-y-1 shadow-lg border-t border-slate-700/50 relative z-50"
      style={{ touchAction: 'none' }}
    >
      {/* History - Use Heroicons */}
      <button onClick={onUndo} disabled={!canUndo} className={`${baseButtonStyle} ${secondaryColor}`} title={t('controlBar.undo') ?? "Undo"}><HiOutlineArrowUturnLeft className={iconSize} /></button>
      <button onClick={onRedo} disabled={!canRedo} className={`${baseButtonStyle} ${secondaryColor}`} title={t('controlBar.redo') ?? "Redo"}><HiOutlineArrowUturnRight className={iconSize} /></button>
      
      {/* Visibility/Edit - Use Heroicons */}
      <button onClick={onToggleNames} className={`${baseButtonStyle} ${secondaryColor}`} title={t('controlBar.toggleNames') ?? "Toggle Names"}>
          {showPlayerNames ? <HiOutlineEyeSlash className={iconSize} /> : <HiOutlineEye className={iconSize} />}
      </button>
      {/* Use Backspace icon for Clear Drawings */}
      <button onClick={onClearDrawings} className={`${baseButtonStyle} ${clearColor}`} title={t('controlBar.clearDrawings') ?? "Clear Drawings"}><HiOutlineBackspace className={iconSize} /></button>
      <button onClick={onAddOpponent} className={`${baseButtonStyle} ${addOpponentColor}`} title={t('controlBar.addOpponent') ?? "Add Opponent"}><HiOutlineUserPlus className={iconSize} /></button>
      
      {/* Danger Zone - Use Heroicons */}
      <button onClick={onResetField} className={`${baseButtonStyle} ${resetColor}`} title={t('controlBar.resetField') ?? "Reset Field"}><HiOutlineTrash className={iconSize} /></button>

      {/* NEW: Log Goal Button - Keep FaFutbol for now */}
      <button onClick={onToggleGoalLogModal} className={`${baseButtonStyle} ${logGoalColor}`} title={t('controlBar.logGoal', 'Log Goal') ?? "Log Goal"}>
          <FaFutbol size={20} /> {/* Keep Fa icon size prop for now */}
      </button>

      {/* Add a visual divider - REMOVING */}
      {/* <div className="border-l border-slate-600 h-6 mx-1"></div> */}

      {/* --- Timer Controls (Inline) - Use Heroicons --- */}
      {/* Toggle Overlay Button */}
      <button
        onClick={onToggleLargeTimerOverlay}
        className={`${baseButtonStyle} ${secondaryColor}`}
        title={t(showLargeTimerOverlay ? 'controlBar.toggleTimerOverlayHide' : 'controlBar.toggleTimerOverlayShow') ?? (showLargeTimerOverlay ? "Hide Large Timer" : "Show Large Timer")}
      >
          {showLargeTimerOverlay ? <HiOutlineStopCircle className={iconSize} /> : <HiOutlineClock className={iconSize} />}
      </button>
      {/* Timer Display - Adjust padding/margin for alignment if needed */}
      <span className="text-slate-200 font-semibold text-lg tabular-nums mx-1 px-2 py-1 h-10 flex items-center justify-center rounded bg-slate-800/60 min-w-[5ch]">
        {formatTime(timeElapsedInSeconds)}
      </span>
      {/* Start/Pause Button (Icon Only) - REMOVING */}
      {/* ... commented out button ... */}
      {/* Reset Button (Icon Only) - REMOVING */}
      {/* ... commented out button ... */}
      {/* --- End Timer Controls --- */}

      {/* Meta Controls (Help, Fullscreen, Language, Stats) - Use Heroicons */}
      {/* Stats Button */}
       <button 
        onClick={onToggleGameStatsModal}
        className={`${baseButtonStyle} ${secondaryColor}`}
        title={t('controlBar.showStats', 'Show Stats') ?? "Show Stats"}
      >
        <HiOutlineClipboardDocumentList className={iconSize} />
      </button>
      {/* Help Button */}
      <button 
        onClick={onToggleInstructions} 
        className={`${baseButtonStyle} ${secondaryColor}`}
        title={t('controlBar.help') ?? "Help"}
      >
        <HiOutlineQuestionMarkCircle className={iconSize} />
      </button>
      {/* Fullscreen Button */}
      <button 
        onClick={onToggleFullScreen}
        className={`${baseButtonStyle} ${secondaryColor}`}
        title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
      >
        {isFullscreen ? <HiOutlineArrowsPointingIn className={iconSize} /> : <HiOutlineArrowsPointingOut className={iconSize} />}
      </button>
      {/* Single Language Toggle Button - Use Heroicon */} 
      <button 
        onClick={handleLanguageToggle}
        className={`${baseButtonStyle} ${secondaryColor} w-auto px-3`} 
        title="Switch Language"
      >
        {/* Using text still, but could use HiOutlineLanguage if preferred */}
        {/* <HiOutlineLanguage className={iconSize} /> */}
        {i18n.language === 'en' ? 'FI' : 'EN'}
      </button>
    </div>
  );
};

export default ControlBar;