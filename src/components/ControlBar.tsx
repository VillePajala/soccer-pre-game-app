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
    // HiOutlineFolderArrowDown,   // Icon for Save Game As... (COMMENTED OUT)
    HiOutlineFolderOpen,       // Icon for Load Game...
    HiOutlineArrowPath,        // CORRECT Icon for Reset Stats
    HiOutlineUsers,            // Icon for Manage Roster
    HiOutlineArchiveBoxArrowDown, // Use this for Quick Save
    // ADD New Icons
    HiOutlineAdjustmentsHorizontal, // For Game Settings
    HiOutlineDocumentArrowDown   // For Export Data
} from 'react-icons/hi2'; // Using hi2 for Heroicons v2 Outline
// REMOVE FaClock, FaUsers, FaCog (FaFutbol remains)
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
  showLargeTimerOverlay: boolean;
  onToggleLargeTimerOverlay: () => void;
  showPlayerNames: boolean;
  onToggleInstructions: () => void;
  onToggleTrainingResources: () => void; // Add prop for training modal
  isFullscreen: boolean;
  onToggleFullScreen: () => void;
  onToggleGoalLogModal: () => void; // Add prop for goal modal
  onToggleGameStatsModal: () => void;
  onHardResetApp: () => void; // Add the new prop type
  // onOpenSaveGameModal: () => void; // REMOVED - Button commented out
  onOpenLoadGameModal: () => void; // NEW PROP
  onStartNewGame: () => void; // CHANGED from onResetGameStats
  onOpenRosterModal: () => void; // Add prop for opening roster modal
  onQuickSave: () => void; // Add prop for quick save
  onOpenGameSettingsModal: () => void;
  isGameLoaded: boolean; // To enable/disable the settings button
}

const ControlBar: React.FC<ControlBarProps> = ({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onToggleNames,
  onResetField,
  onClearDrawings,
  onAddOpponent,
  showLargeTimerOverlay,
  onToggleLargeTimerOverlay,
  showPlayerNames,
  onToggleInstructions,
  onToggleTrainingResources,
  isFullscreen,
  onToggleFullScreen,
  onToggleGoalLogModal,
  onToggleGameStatsModal,
  onHardResetApp,
  // onOpenSaveGameModal, // REMOVED
  onOpenLoadGameModal,
  onStartNewGame,
  onOpenRosterModal,
  onQuickSave,
  onOpenGameSettingsModal,
  isGameLoaded,
}) => {
  const { t, i18n } = useTranslation(); // Standard hook
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState<'main' | 'tulospalvelu'>('main'); // NEW state for menu view
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const [isPWA, setIsPWA] = useState(false); // State to track PWA standalone mode
  
  // Check PWA standalone mode on mount
  useEffect(() => {
    // This check only works client-side after the component mounts
    setIsPWA(window.matchMedia('(display-mode: standalone)').matches);
  }, []);

  // --- RE-ADD BUTTON STYLES --- 
  // Consistent Button Styles - Adjusted active state
  const baseButtonStyle = "text-slate-100 font-semibold py-1.5 px-2 w-9 h-9 flex items-center justify-center rounded-md shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900";
  
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
    console.log(`Changed language to ${nextLang}`);
    setIsSettingsMenuOpen(false); // Close menu after action
    setMenuView('main'); 
  };

  const handleSettingsButtonClick = () => {
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

  const iconSize = "w-5 h-5"; // Standard icon size class
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
      {/* Left Group: Undo/Redo */}
      <div className="flex items-center gap-2">
        <button onClick={onUndo} disabled={!canUndo} className={`${baseButtonStyle} ${secondaryColor}`} title={t('controlBar.undo') ?? "Undo"}>
            <HiOutlineArrowUturnLeft className={iconSize}/>
        </button>
        <button onClick={onRedo} disabled={!canRedo} className={`${baseButtonStyle} ${secondaryColor}`} title={t('controlBar.redo') ?? "Redo"}>
            <HiOutlineArrowUturnRight className={iconSize}/>
        </button>
      </div>

      {/* Center Group: Field Actions */}
      <div className="flex items-center gap-2">
        <button onClick={onToggleNames} className={`${baseButtonStyle} ${secondaryColor}`} title={t(showPlayerNames ? 'controlBar.toggleNamesHide' : 'controlBar.toggleNamesShow') ?? (showPlayerNames ? "Hide Names" : "Show Names")}>
            {showPlayerNames ? <HiOutlineEyeSlash className={iconSize}/> : <HiOutlineEye className={iconSize}/>}
        </button>
        <button onClick={onClearDrawings} className={`${baseButtonStyle} ${clearColor}`} title={t('controlBar.clearDrawings') ?? "Clear Drawings"}>
            <HiOutlineBackspace className={iconSize}/>
        </button>
        <button onClick={onAddOpponent} className={`${baseButtonStyle} ${addOpponentColor}`} title={t('controlBar.addOpponent') ?? "Add Opponent"}>
            <HiOutlineUserPlus className={iconSize}/>
        </button>
        <button onClick={onResetField} className={`${baseButtonStyle} ${resetColor}`} title={t('controlBar.resetField') ?? "Reset Field"}>
            <HiOutlineTrash className={iconSize}/>
        </button>
      </div>

      {/* Right Group: Live/Info Actions & Settings */}
      <div className="flex items-center gap-2">
        {/* Log Goal (Moved Here, Use FaFutbol Icon) */}
        <button onClick={onToggleGoalLogModal} className={`${baseButtonStyle} ${logGoalColor}`} title={t('controlBar.logGoal', 'Log Goal') ?? "Log Goal"}>
            <FaFutbol size={18} />
        </button>

        {/* <<< ADD Roster Settings Button >>> */}
        <button 
            onClick={onOpenRosterModal}
            className={`${baseButtonStyle} ${secondaryColor}`}
            title={t('controlBar.rosterSettings', 'Roster Settings') ?? "Roster Settings"}
        >
            <HiOutlineUsers className={iconSize} />
        </button>

        {/* <<< ADD Game Settings Button >>> */}
        <button 
            onClick={onOpenGameSettingsModal} 
            // Disable if no game is loaded? Keep enabled for consistency?
            // Let's keep it enabled, the modal itself might handle the state.
            // disabled={!isGameLoaded} 
            className={`${baseButtonStyle} ${secondaryColor}`}
            title={t('controlBar.gameSettings', 'Game Settings') ?? "Game Settings"}
        >
            <HiOutlineAdjustmentsHorizontal className={iconSize} />
        </button>

        {/* Toggle Overlay Button */}
        <button
          onClick={onToggleLargeTimerOverlay}
          className={`${baseButtonStyle} bg-green-600 hover:bg-green-700 focus:ring-green-500`}
          title={t(showLargeTimerOverlay ? 'controlBar.toggleTimerOverlayHide' : 'controlBar.toggleTimerOverlayShow') ?? (showLargeTimerOverlay ? "Hide Large Timer" : "Show Large Timer")}
        >
            {showLargeTimerOverlay ? <HiOutlineStopCircle className={iconSize} /> : <HiOutlineClock className={iconSize} />}
        </button>
        {/* <<< REMOVE Fullscreen Button Block >>> */}
        {/* RE-ADD Fullscreen Button Here, Conditionally Rendered */}
        {/* {!isPWA && (
          <button 
            onClick={onToggleFullScreen}
            className={`${baseButtonStyle} ${secondaryColor}`}
            title={isFullscreen ? t('controlBar.exitFullscreen', 'Exit Fullscreen') : t('controlBar.enterFullscreen', 'Enter Fullscreen')}
          >
            {isFullscreen ? <HiOutlineArrowsPointingIn className={iconSize} /> : <HiOutlineArrowsPointingOut className={iconSize} />}
          </button>
        )} */}
        {/* Settings Menu Button (REMAINING) */}
        <div className="relative" ref={settingsMenuRef}>
          <button
            onClick={handleSettingsButtonClick}
            className={`${baseButtonStyle} ${secondaryColor}`}
            title={t('controlBar.settings') ?? "Settings"}
          >
            <HiOutlineCog6Tooth className={iconSize} />
          </button>

          {/* Settings Dropdown Menu (REORGANIZED) */}
          {isSettingsMenuOpen && (
            <div 
               // Position between PlayerBar and ControlBar with slightly more padding
               // REMOVE overflow-hidden to allow inner scrolling
               className={`fixed top-[6.5rem] bottom-14 left-4 right-4 pb-4 bg-slate-800/90 backdrop-blur-sm rounded-t-lg shadow-xl z-50 border-x border-t border-slate-600 /* removed overflow-hidden */ transition-all duration-200 ease-in-out transform ${isSettingsMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'}`}
            >
               {/* Wrapper for Menu Views - ADD h-full */}
               <div className={`flex transition-transform duration-200 ease-out h-full ${menuView === 'tulospalvelu' ? '-translate-x-full' : 'translate-x-0'}`}>
               
                 {/* --- Main Menu View --- */}
                 <div className="w-full flex-shrink-0 overflow-y-auto h-full">
                   <div className="py-1"> 

                     {/* Group 1: Game Management */} 
                     <div className="py-1">
                       <button onClick={wrapHandler(onQuickSave)} className="w-full flex items-center px-3 py-2 text-sm text-slate-100 hover:bg-slate-600/75">
                         <HiOutlineArchiveBoxArrowDown className={menuIconSize} /> {t('controlBar.saveGame', 'Save')}
                       </button>
                       {/* <button onClick={wrapHandler(onOpenSaveGameModal)} className="w-full flex items-center px-3 py-2 text-sm text-slate-100 hover:bg-slate-600/75">
                         <HiOutlineFolderArrowDown className={menuIconSize} /> {t('controlBar.saveGameAs', 'Save As...')}
                       </button> */}
                       <button onClick={wrapHandler(onOpenLoadGameModal)} className="w-full flex items-center px-3 py-2 text-sm text-slate-100 hover:bg-slate-600/75">
                         <HiOutlineFolderOpen className={menuIconSize} /> {t('controlBar.loadGame', 'Load Game...')}
                       </button>
                       <button onClick={handleStartNewGame} className="w-full flex items-center px-3 py-2 text-sm text-slate-100 hover:bg-slate-600/75">
                         <HiOutlineArrowPath className={menuIconSize} /> {t('controlBar.newGameButton', 'New Game')}
                       </button>
                     </div>
                     
                     {/* Divider */}
                     <div className="my-1 border-t border-slate-600/75"></div>

                     {/* Group 2: Roster & Settings */}
                     <div className="py-1">
                       <button onClick={wrapHandler(onOpenGameSettingsModal)} className={`w-full flex items-center px-3 py-2 text-sm text-slate-100 hover:bg-slate-600/75 ${!isGameLoaded ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={!isGameLoaded}>
                         <HiOutlineAdjustmentsHorizontal className={menuIconSize} /> {t('controlBar.gameSettingsButton', 'Game Settings')}
                       </button>
                       <button onClick={wrapHandler(onOpenRosterModal)} className="w-full flex items-center px-3 py-2 text-sm text-slate-100 hover:bg-slate-600/75">
                         <HiOutlineUsers className={menuIconSize} /> {t('controlBar.manageRoster', 'Manage Roster')}
                       </button>
                     </div>

                     {/* ADD Subtle Divider */}
                     <hr className="border-slate-600/75 my-1 mx-3" />
                     
                     {/* Group 3: Information/Export */} 
                     <div className="py-1">
                       <button onClick={wrapHandler(onToggleGameStatsModal)} className="w-full flex items-center px-3 py-2 text-sm text-slate-100 hover:bg-slate-600/75">
                         <HiOutlineClipboardDocumentList className={menuIconSize} />{t('controlBar.stats', 'Stats')}
                       </button>
                       <button onClick={wrapHandler(onToggleTrainingResources)} className="w-full flex items-center px-3 py-2 text-sm text-slate-100 hover:bg-slate-600/75">
                         <HiOutlineBookOpen className={menuIconSize} />{t('controlBar.training', 'Training')}
                       </button>
                       {/* Export Data - Link to Load Modal for now, as it has Export All */} 
                       <button onClick={wrapHandler(onOpenLoadGameModal)} className="w-full flex items-center px-3 py-2 text-sm text-slate-100 hover:bg-slate-600/75">
                         <HiOutlineDocumentArrowDown className={menuIconSize} />{t('controlBar.exportData', 'Export Data')}
                       </button>
                       <a href="https://taso.palloliitto.fi" target="_blank" rel="noopener noreferrer" className="w-full flex items-center px-3 py-2 text-sm text-slate-100 hover:bg-slate-600/75" onClick={wrapHandler(() => {})}>
                         <HiOutlineArrowTopRightOnSquare className={menuIconSize} />{t('controlBar.tasoLink', 'Taso')}
                       </a>
                       {/* RE-ADD Button to navigate to Tulospalvelu submenu */}
                       <button onClick={() => setMenuView('tulospalvelu')} className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-100 hover:bg-slate-600/75">
                         <span className="flex items-center"><HiOutlineArrowTopRightOnSquare className={menuIconSize} />{t('controlBar.tulospalveluLink', 'Tulospalvelu')}</span>
                         <HiOutlineChevronRight className="w-4 h-4" />
                       </button>
                     </div>

                     {/* ADD Subtle Divider */}
                     <hr className="border-slate-600/75 my-1 mx-3" />
                     
                     {/* Group 4: General Settings & Actions (Revised) */}
                     <div className="border-t border-slate-600/50 pt-1 mt-1">
                       {/* Language Toggle */}
                       <button onClick={handleLanguageToggle} className="w-full flex items-center px-3 py-2 text-sm text-slate-100 hover:bg-slate-600/75">
                         <HiOutlineLanguage className={menuIconSize} /> {t('controlBar.toggleLanguage')} ({i18n.language === 'en' ? 'FI' : 'EN'})
                       </button>
                       {/* Hard Reset */}
                       <button onClick={wrapHandler(onHardResetApp)} className="w-full flex items-center px-3 py-2 text-sm text-red-400 hover:bg-red-900/50">
                         <HiOutlineExclamationTriangle className={menuIconSize} /> {t('controlBar.hardReset', 'Hard Reset App')}
                       </button>
                     </div>
                   </div> 
                 </div>{/* End Main Menu View */}

                 {/* --- RE-ADD Tulospalvelu View --- */}
                 <div className="w-full flex-shrink-0 overflow-y-auto h-full">
                   <div className="py-1"> 
                     <button onClick={() => setMenuView('main')} className="w-full flex items-center px-3 py-2 text-sm text-slate-300 hover:bg-slate-600 hover:text-slate-100 mb-1 border-b border-slate-600/50">
                       <HiOutlineChevronLeft className="w-4 h-4 mr-2" />
                       {t('controlBar.backButton', 'Back')}
                     </button>
                     <a href="https://tulospalvelu.palloliitto.fi/category/P91!Itajp25/tables" target="_blank" rel="noopener noreferrer" className="w-full flex items-center px-3 py-2 text-sm text-slate-100 hover:bg-slate-500" onClick={wrapHandler(() => {})}>
                       <HiOutlineArrowTopRightOnSquare className="w-4 h-4 mr-2 opacity-70" />
                       {t('controlBar.tulospalveluP9', 'P9 Alue Taso 1')}
                     </a>
                     <a href="https://tulospalvelu.palloliitto.fi/category/P9EKK!splita_ekk25/tables" target="_blank" rel="noopener noreferrer" className="w-full flex items-center px-3 py-2 text-sm text-slate-100 hover:bg-slate-500 border-t border-slate-500/50" onClick={wrapHandler(() => {})}>
                       <HiOutlineArrowTopRightOnSquare className="w-4 h-4 mr-2 opacity-70" />
                       {t('controlBar.tulospalveluP9EK', 'P/T 9 EK Kortteli (2016)')}
                     </a>
                   </div>
                 </div>{/* End Tulospalvelu View */} 
                 
               </div> {/* End inner wrapper */} 
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ControlBar;