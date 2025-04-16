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
    HiOutlineChevronRight, // Chevron for submenu
    HiOutlineChevronLeft, // Chevron for Back button
    HiOutlineExclamationTriangle, // Icon for Hard Reset
    HiOutlineFolderArrowDown,   // Icon for Save Game As...
    HiOutlineFolderOpen,       // Icon for Load Game...
    HiOutlineArrowPath,        // CORRECT Icon for Reset Stats
    HiOutlineUsers            // Icon for Manage Roster
} from 'react-icons/hi2'; // Using hi2 for Heroicons v2 Outline
// Keep FaFutbol for now unless a good Heroicon alternative is found
import { FaFutbol } from 'react-icons/fa';

// Import translation hook
import { useTranslation } from 'react-i18next';

// Import direct translations
import { fiTranslations, enTranslations } from '../translations-direct';

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
  onToggleGameStatsModal: () => void;
  onHardResetApp: () => void; // Add the new prop type
  onOpenSaveGameModal: () => void; // NEW PROP
  onOpenLoadGameModal: () => void; // NEW PROP
  onStartNewGame: () => void; // CHANGED from onResetGameStats
  onOpenRosterModal: () => void; // Add prop for opening roster modal
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
  onToggleGameStatsModal,
  onHardResetApp, // Destructure new prop
  onOpenSaveGameModal, // Destructure new prop
  onOpenLoadGameModal, // Destructure new prop
  onStartNewGame, // CHANGED from onResetGameStats
  onOpenRosterModal // Destructure the new prop
}) => {
  const { t, i18n } = useTranslation(); // Initialize translation hook, get i18n instance
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState<'main' | 'tulospalvelu'>('main'); // NEW state for menu view
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  
  // State for direct translations (to avoid async issues with t)
  const [directTranslations, setDirectTranslations] = useState(
    i18n.language === 'fi' ? fiTranslations : enTranslations 
  );
  
  // Effect to handle language changes and update direct translations
  useEffect(() => {
    const handleLanguageChanged = () => {
      console.log("Language changed to:", i18n.language);
      setDirectTranslations(i18n.language === 'fi' ? fiTranslations : enTranslations);
    };
    
    i18n.on('languageChanged', handleLanguageChanged);
    
    // Cleanup
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [i18n]);
  
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
    
    // Force reload translations for the new language
    i18n.reloadResources([nextLang], ['common']).then(() => {
      console.log(`Reloaded resources for ${nextLang}`);
      i18n.changeLanguage(nextLang);
    });
    
    setIsSettingsMenuOpen(false); // Close menu after action
    setMenuView('main'); 
  };

  const handleSettingsButtonClick = () => {
    // When opening menu, force reload current language resources
    if (!isSettingsMenuOpen) {
      i18n.reloadResources([i18n.language], ['common']).then(() => {
        console.log(`Reloaded resources for ${i18n.language} before opening menu`);
      });
    }
    setIsSettingsMenuOpen(!isSettingsMenuOpen);
  };

  // Close settings menu if clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setIsSettingsMenuOpen(false);
        setMenuView('main'); // Reset view when closing menu
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

  const iconSize = "w-6 h-6"; // Standard icon size class
  const menuIconSize = "w-5 h-5 mr-2"; // Smaller icon size for menu items

  // Helper to wrap handlers to also close the menu & reset view
  const wrapHandler = (handler: () => void) => () => {
    handler();
    setIsSettingsMenuOpen(false);
    setMenuView('main'); 
  };

  // Callback to handle StartNewGame button click
  const handleStartNewGame = () => {
    onStartNewGame();
    setIsSettingsMenuOpen(false);
    setMenuView('main'); 
  };

  return (
    <div className="bg-slate-800 p-2 shadow-md flex flex-wrap justify-center gap-2 relative z-40">
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

      {/* Manage Roster Button */}
      <button 
        onClick={onOpenRosterModal}
        className={`${baseButtonStyle} ${secondaryColor}`}
        title={t('controlBar.manageRoster', 'Manage Roster')}
      >
        <HiOutlineUsers className={iconSize}/>
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
          <div 
             // Add transition, initial state (closed), and open state classes
             className={`absolute bottom-full right-0 mb-1 w-64 bg-slate-700 rounded-md shadow-xl z-50 border border-slate-500 overflow-hidden max-h-96 transition-all duration-150 ease-out transform ${isSettingsMenuOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
          > 
             {/* Inner wrapper for sliding animation */}
             <div className={`flex transition-transform duration-200 ease-out ${menuView === 'tulospalvelu' ? '-translate-x-full' : 'translate-x-0'}`}>
             
               {/* Main Menu View (Takes full width) */}
               <div className="w-full flex-shrink-0 overflow-y-auto max-h-96"> {/* Added overflow-y-auto + max-h */} 
                 <div className="py-1"> 
                   {/* Group 1: Game Management */}
                   <button onClick={wrapHandler(onOpenSaveGameModal)} className="w-full flex items-center px-3 py-2 text-sm text-slate-100 hover:bg-slate-600">
                     <HiOutlineFolderArrowDown className={menuIconSize} />{directTranslations.saveGameAs}
                   </button>
                   <button onClick={wrapHandler(onOpenLoadGameModal)} className="w-full flex items-center px-3 py-2 text-sm text-slate-100 hover:bg-slate-600 border-t border-slate-600/50">
                     <HiOutlineFolderOpen className={menuIconSize} />{directTranslations.loadGame}
                   </button>
                   <button onClick={handleStartNewGame} className="w-full flex items-center px-3 py-2 text-sm text-orange-400 hover:bg-orange-900/50 border-t border-slate-600/50" data-testid="start-new-game-button">
                     <HiOutlineArrowPath className="w-5 h-5 mr-2" /><span className="text-orange-400 font-medium">{directTranslations.startNewMatch}</span>
                   </button>
                   
                   {/* Group 2: Information/Resources - Add spacing before this group */}
                   <button onClick={wrapHandler(onToggleGameStatsModal)} className="w-full flex items-center px-3 py-2 text-sm text-slate-100 hover:bg-slate-600 pt-2 mt-1"> 
                     <HiOutlineClipboardDocumentList className={menuIconSize} />{directTranslations.stats}
                   </button>
                   <button onClick={wrapHandler(onToggleTrainingResources)} className="w-full flex items-center px-3 py-2 text-sm text-slate-100 hover:bg-slate-600 border-t border-slate-600/50">
                     <HiOutlineBookOpen className={menuIconSize} />{directTranslations.training}
                   </button>
                   <button onClick={() => setMenuView('tulospalvelu')} className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-100 hover:bg-slate-600 border-t border-slate-600/50">
                     <span className="flex items-center"><HiOutlineArrowTopRightOnSquare className={menuIconSize} />{t('controlBar.tulospalveluLink', 'Tulospalvelu')}</span>
                     <HiOutlineChevronRight className="w-4 h-4" />
                   </button>
                   
                   {/* Group 3: Application Settings/Help - Add spacing before this group */} 
                   <button onClick={wrapHandler(onToggleInstructions)} className="w-full flex items-center px-3 py-2 text-sm text-slate-100 hover:bg-slate-600 pt-2 mt-1">
                     <HiOutlineQuestionMarkCircle className={menuIconSize} />{directTranslations.appGuide}
                   </button>
                   <button onClick={handleLanguageToggle} className="w-full flex items-center px-3 py-2 text-sm text-slate-100 hover:bg-slate-600 border-t border-slate-600/50">
                     <HiOutlineLanguage className={menuIconSize} />{directTranslations.language} ({i18n.language === 'en' ? 'FI' : 'EN'})
                   </button>
                   <button onClick={wrapHandler(onHardResetApp)} className="w-full flex items-center px-3 py-2 text-sm text-red-400 hover:bg-red-900/50 border-t border-slate-600/50">
                     <HiOutlineExclamationTriangle className={menuIconSize} />{directTranslations.hardReset}
                   </button>
                 </div>
               </div>

               {/* Tulospalvelu View (Takes full width) */}
               <div className="w-full flex-shrink-0 overflow-y-auto max-h-96"> {/* Added overflow-y-auto + max-h */} 
                 <div className="py-1"> 
                   {/* Back Button */}
                   <button onClick={() => setMenuView('main')} className="w-full flex items-center px-3 py-2 text-sm text-slate-300 hover:bg-slate-600 hover:text-slate-100 mb-1 border-b border-slate-600/50">
                     <HiOutlineChevronLeft className="w-4 h-4 mr-2" />
                     {t('controlBar.backButton', 'Back')}
                   </button>
                   
                   {/* Tulospalvelu Links */} 
                   <a href="https://tulospalvelu.palloliitto.fi/category/P91!Itajp25/tables" target="_blank" rel="noopener noreferrer" className="w-full flex items-center px-3 py-2 text-sm text-slate-100 hover:bg-slate-500" onClick={wrapHandler(() => {})}>
                     <HiOutlineArrowTopRightOnSquare className="w-4 h-4 mr-2 opacity-70" />
                     {t('controlBar.tulospalveluP9', 'P9 Alue Taso 1')}
                   </a>
                   <a href="https://tulospalvelu.palloliitto.fi/category/P9EKK!splita_ekk25/tables" target="_blank" rel="noopener noreferrer" className="w-full flex items-center px-3 py-2 text-sm text-slate-100 hover:bg-slate-500 border-t border-slate-500/50" onClick={wrapHandler(() => {})}>
                     <HiOutlineArrowTopRightOnSquare className="w-4 h-4 mr-2 opacity-70" />
                     {t('controlBar.tulospalveluP9EK', 'P/T 9 EK Kortteli (2016)')}
                   </a>
                 </div>
               </div>
               
             </div> {/* End inner wrapper */}
          </div>
        )}
      </div>

    </div>
  );
};

export default ControlBar;