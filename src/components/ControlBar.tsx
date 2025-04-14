'use client';

import React, { useState, useEffect, useRef } from 'react';
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
    HiOutlineLanguage,
    HiOutlineCog6Tooth, // Settings icon
    HiOutlineBookOpen, // Import for Training Resources
    HiOutlineArrowTopRightOnSquare, // External link icon
    HiOutlineChevronRight // Chevron for submenu
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
  onToggleTimerOverlay: () => void;
  isTimerOverlayVisible: boolean;
  onToggleHelp: () => void;
  onToggleGameStatsModal: () => void;
  onToggleTrainingResourcesModal: () => void;
  onLogGoal: () => void;
  // Timer props
  timeElapsedInSeconds: number;
  showLargeTimerOverlay: boolean;
  onToggleLargeTimerOverlay: () => void;
  // Add name visibility prop
  showPlayerNames: boolean;
  onToggleInstructions: () => void;
  onToggleTrainingResources: () => void; // Add prop for training modal
  // Add Fullscreen props
  isFullscreen: boolean;
  onToggleFullScreen: () => void;
  onToggleGoalLogModal: () => void; // Add prop for goal modal
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
  onToggleTimerOverlay,
  isTimerOverlayVisible,
  onToggleHelp,
  onToggleGameStatsModal,
  onToggleTrainingResourcesModal,
  onLogGoal,
  // Timer props
  timeElapsedInSeconds,
  showLargeTimerOverlay,
  onToggleLargeTimerOverlay,
  // Destructure name visibility prop
  showPlayerNames,
  onToggleInstructions,
  onToggleTrainingResources, // Destructure new prop
  // Destructure Fullscreen props
  isFullscreen,
  onToggleFullScreen,
  onToggleGoalLogModal, // Destructure goal modal handler
}) => {
  const { t, i18n } = useTranslation(); // Initialize translation hook, get i18n instance
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [isTulospalveluOpen, setIsTulospalveluOpen] = useState(false); // New state for submenu
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const tulospalveluRef = useRef<HTMLDivElement>(null); // Reference for submenu

  // --- RE-ADD BUTTON STYLES --- 
  // Consistent Button Styles - Adjusted active state
  const baseButtonStyle = "text-slate-100 font-semibold py-2 px-2 w-10 h-10 flex items-center justify-center rounded-md shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900";
  
  // Specific Colors - Added specific hover backgrounds
  const secondaryColor = "bg-slate-700 hover:bg-slate-600 focus:ring-slate-500";
  const resetColor = "bg-red-600 hover:bg-red-500 focus:ring-red-500";
  const clearColor = "bg-amber-600 hover:bg-amber-500 focus:ring-amber-500 text-white";
  const addOpponentColor = secondaryColor;
  const logGoalColor = "bg-blue-600 hover:bg-blue-500 focus:ring-blue-500"; 
  // --- END RE-ADD BUTTON STYLES --- 

  const handleLanguageToggle = () => {
    const nextLang = i18n.language === 'en' ? 'fi' : 'en';
    i18n.changeLanguage(nextLang);
    setIsSettingsMenuOpen(false); // Close menu after action
  };

  const handleSettingsButtonClick = () => {
    setIsSettingsMenuOpen(!isSettingsMenuOpen);
  };

  // Close settings menu if clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setIsSettingsMenuOpen(false);
      }
    };

    if (isSettingsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsMenuOpen]);

  // Close submenu when clicking outside or when settings menu closes
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tulospalveluRef.current && !tulospalveluRef.current.contains(event.target as Node)) {
        setIsTulospalveluOpen(false);
      }
    };

    if (isTulospalveluOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTulospalveluOpen]);

  // Close submenu when settings menu closes
  useEffect(() => {
    if (!isSettingsMenuOpen) {
      setIsTulospalveluOpen(false);
    }
  }, [isSettingsMenuOpen]);

  const iconSize = "w-6 h-6"; // Standard icon size class
  const menuIconSize = "w-5 h-5 mr-2"; // Smaller icon size for menu items

  // Helper to wrap handlers to also close the menu
  const wrapHandler = (handler: () => void) => () => {
    handler();
    setIsSettingsMenuOpen(false);
    setIsTulospalveluOpen(false);
  };

  return (
    <div className="bg-slate-800 p-2 shadow-md flex flex-wrap justify-center gap-2 relative">
      {/* Action Buttons - Use Heroicons */}
      {/* Undo */}
      <button onClick={onUndo} disabled={!canUndo} className={`${baseButtonStyle} ${secondaryColor}`} title={t('controlBar.undo') ?? "Undo"}>
          <HiOutlineArrowUturnLeft className={iconSize}/>
      </button>
      {/* Redo */}
      <button onClick={onRedo} disabled={!canRedo} className={`${baseButtonStyle} ${secondaryColor}`} title={t('controlBar.redo') ?? "Redo"}>
          <HiOutlineArrowUturnRight className={iconSize}/>
      </button>
      {/* Toggle Names */}
      <button onClick={onToggleNames} className={`${baseButtonStyle} ${secondaryColor}`} title={t(showPlayerNames ? 'controlBar.toggleNamesHide' : 'controlBar.toggleNamesShow') ?? (showPlayerNames ? "Hide Names" : "Show Names")}>
          {showPlayerNames ? <HiOutlineEyeSlash className={iconSize}/> : <HiOutlineEye className={iconSize}/>}
      </button>
      {/* Clear Drawings */}
      <button onClick={onClearDrawings} className={`${baseButtonStyle} ${clearColor}`} title={t('controlBar.clearDrawings') ?? "Clear Drawings"}>
          <HiOutlineBackspace className={iconSize}/>
      </button>
      {/* Add Opponent */}
      <button onClick={onAddOpponent} className={`${baseButtonStyle} ${addOpponentColor}`} title={t('controlBar.addOpponent') ?? "Add Opponent"}>
          <HiOutlineUserPlus className={iconSize}/>
      </button>
      {/* Reset Field */}
      <button onClick={onResetField} className={`${baseButtonStyle} ${resetColor}`} title={t('controlBar.resetField') ?? "Reset Field"}>
          <HiOutlineTrash className={iconSize}/>
      </button>
      {/* Log Goal */}
      <button onClick={onToggleGoalLogModal} className={`${baseButtonStyle} ${logGoalColor}`} title={t('controlBar.logGoal', 'Log Goal') ?? "Log Goal"}>
          <FaFutbol size={20} /> {/* Keep Fa icon size prop for now */}
      </button>

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
      {/* --- End Timer Controls --- */}

      {/* Fullscreen Button - Moved back to main bar */}
      <button 
        onClick={onToggleFullScreen}
        className={`${baseButtonStyle} ${secondaryColor}`}
        title={isFullscreen ? t('controlBar.exitFullscreen', 'Exit Fullscreen') : t('controlBar.enterFullscreen', 'Enter Fullscreen')}
      >
        {isFullscreen ? <HiOutlineArrowsPointingIn className={iconSize} /> : <HiOutlineArrowsPointingOut className={iconSize} />}
      </button>

      {/* NEW Settings Button & Menu */}
      <div className="relative" ref={settingsMenuRef}>
        <button
          onClick={handleSettingsButtonClick}
          className={`${baseButtonStyle} ${secondaryColor}`}
          title={t('controlBar.settings') ?? "Settings"}
        >
          <HiOutlineCog6Tooth className={iconSize} />
        </button>

        {/* Settings Dropdown Menu */}
        {isSettingsMenuOpen && (
          <div className="absolute bottom-full right-0 mb-2 w-48 bg-slate-700 rounded-md shadow-xl py-1 z-50 border border-slate-500">
            {/* Stats Button */}
            <button 
              onClick={wrapHandler(onToggleGameStatsModal)}
              className="w-full flex items-center px-3 py-2 text-sm text-slate-100 hover:bg-slate-600"
            >
              <HiOutlineClipboardDocumentList className={menuIconSize} />
              {t('controlBar.stats', 'Stats')}
            </button>
            {/* Training Resources Button */}
            <button 
              onClick={wrapHandler(onToggleTrainingResources)}
              className="w-full flex items-center px-3 py-2 text-sm text-slate-100 hover:bg-slate-600 border-t border-slate-600/50"
            >
              <HiOutlineBookOpen className={menuIconSize} />
              {t('controlBar.training', 'Training')} 
            </button>
            {/* Help Button (App Guide) */}
            <button 
              onClick={wrapHandler(onToggleInstructions)}
              className="w-full flex items-center px-3 py-2 text-sm text-slate-100 hover:bg-slate-600 border-t border-slate-600/50"
            >
              <HiOutlineQuestionMarkCircle className={menuIconSize} />
              {t('controlBar.appGuide', 'App Guide')} 
            </button>
            {/* Language Toggle Button */}
            <button 
              onClick={handleLanguageToggle}
              className="w-full flex items-center px-3 py-2 text-sm text-slate-100 hover:bg-slate-600 border-t border-slate-600/50"
            >
              <HiOutlineLanguage className={menuIconSize} />
              {t('controlBar.language', 'Language')} ({i18n.language === 'en' ? 'FI' : 'EN'})
            </button>

            {/* External Links Section - NEW */}
            <div className="border-t border-slate-600/50 mt-1 pt-1">
              {/* Taso Link */}
              <a 
                href="https://taso.palloliitto.fi/taso/login.php" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full flex items-center px-3 py-2 text-sm text-slate-100 hover:bg-slate-600"
                onClick={() => setIsSettingsMenuOpen(false)} // Close menu on click
              >
                <HiOutlineArrowTopRightOnSquare className={menuIconSize} />
                {t('controlBar.tasoLink', 'Taso')}
              </a>

              {/* Tulospalvelu Submenu - NEW */}
              <div className="relative" ref={tulospalveluRef}>
                <button 
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent settings menu from closing
                    setIsTulospalveluOpen(!isTulospalveluOpen);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-100 hover:bg-slate-600"
                >
                  <span className="flex items-center">
                    <HiOutlineArrowTopRightOnSquare className={menuIconSize} />
                    {t('controlBar.tulospalveluLink', 'Tulospalvelu')}
                  </span>
                  <HiOutlineChevronRight className={`w-4 h-4 transition-transform ${isTulospalveluOpen ? 'rotate-90' : ''}`} />
                </button>

                {/* Tulospalvelu Submenu Items */}
                {isTulospalveluOpen && (
                  <div className="absolute right-0 bottom-full mb-1 w-56 bg-slate-700 rounded-md shadow-xl py-1 z-50 border border-slate-500">
                    <a 
                      href="https://tulospalvelu.palloliitto.fi/category/P91!Itajp25/tables" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full flex items-center px-3 py-2 text-sm text-slate-100 hover:bg-slate-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsTulospalveluOpen(false);
                        setIsSettingsMenuOpen(false);
                      }}
                    >
                      <HiOutlineArrowTopRightOnSquare className="w-4 h-4 mr-2 opacity-70" />
                      {t('controlBar.tulospalveluP9', 'P9 Alue Taso 1')}
                    </a>
                    <a 
                      href="https://tulospalvelu.palloliitto.fi/category/P9EKK!splita_ekk25/tables" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full flex items-center px-3 py-2 text-sm text-slate-100 hover:bg-slate-600 border-t border-slate-600/50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsTulospalveluOpen(false);
                        setIsSettingsMenuOpen(false);
                      }}
                    >
                      <HiOutlineArrowTopRightOnSquare className="w-4 h-4 mr-2 opacity-70" />
                      {t('controlBar.tulospalveluP9EK', 'P/T 9 EK Kortteli (2016)')}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default ControlBar;