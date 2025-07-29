'use client';

import React, { useState, useEffect, useRef } from 'react';
// Import Heroicons (Outline style)
import {
    HiOutlineArrowUturnLeft,
    HiOutlineArrowUturnRight,
    HiOutlineTrash,
    HiOutlineBackspace, // Icon for Clear Drawings
    HiOutlineStopCircle,
    HiOutlineClock,
    HiOutlineClipboardDocumentList, // Replaces FaClipboardList
    HiOutlineClipboard, // Icon for Tactics Board
    HiOutlineCog6Tooth, // Settings icon
    HiOutlineBookOpen, // Import for Training Resources
    HiOutlineArrowTopRightOnSquare, // External link icon
    HiOutlineChevronLeft, // Chevron for Back button
    HiOutlineQuestionMarkCircle, // Icon for help
    HiOutlinePlusCircle, // Icon for adding discs
    // HiOutlineMinusCircle, // Icon for adding opponent discs
    // HiOutlineFolderArrowDown,   // Icon for Save Game As... (COMMENTED OUT)
    HiOutlineFolderOpen,       // Icon for Load Game...
    HiOutlineUsers,            // Icon for Manage Roster
    HiOutlineArchiveBoxArrowDown, // Use this for Quick Save
    // ADD New Icons
    HiOutlineAdjustmentsHorizontal, // For Game Settings
    HiOutlineDocumentArrowDown,   // For Export Data
    HiOutlineSquares2X2,       // For Place All Players on Field
    // HiOutlineXCircle, // REMOVE unused
    // HiOutlineRectangleGroup, // REMOVE unused
    HiOutlineTrophy,
    HiOutlineArrowRightOnRectangle, // For Sign Out
    HiBars3, // Hamburger menu icon
} from 'react-icons/hi2'; // Using hi2 for Heroicons v2 Outline
// REMOVE FaClock, FaUsers, FaCog (FaFutbol remains)
import { FaFutbol } from 'react-icons/fa';

// Import translation hook
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
// Removed - AuthButton now in TopBar: import { AuthButton } from '@/components/auth/AuthButton';

// Define props for ControlBar
interface ControlBarProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onResetField: () => void;
  onClearDrawings: () => void;
  onAddOpponent: () => void;
  showLargeTimerOverlay: boolean;
  onToggleLargeTimerOverlay: () => void;
  onToggleTrainingResources: () => void; // Add prop for training modal
  onToggleGoalLogModal: () => void; // Add prop for goal modal
  onToggleGameStatsModal: () => void;
  onOpenLoadGameModal: () => void; // NEW PROP
  onStartNewGame: () => void; // CHANGED from onResetGameStats
  onOpenRosterModal: () => void; // Add prop for opening roster modal
  onQuickSave: () => void; // Add prop for quick save
  onOpenGameSettingsModal: () => void;
  isGameLoaded: boolean; // To enable/disable the settings button
  onPlaceAllPlayers: () => void; // New prop for placing all players on the field
  highlightRosterButton: boolean; // <<< ADD prop for highlighting
  onOpenSeasonTournamentModal: () => void;
  isTacticsBoardView: boolean;
  onToggleTacticsBoard: () => void;
  onAddHomeDisc: () => void;
  onAddOpponentDisc: () => void;
  onToggleInstructionsModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenPlayerAssessmentModal: () => void;
  onSignOut?: () => void;
}

const ControlBar: React.FC<ControlBarProps> = ({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onResetField,
  onClearDrawings,
  onAddOpponent,
  showLargeTimerOverlay,
  onToggleLargeTimerOverlay,
  onToggleTrainingResources,
  onToggleGoalLogModal,
  onToggleGameStatsModal,
  onOpenLoadGameModal,
  onStartNewGame,
  onOpenRosterModal,
  onQuickSave,
  onOpenGameSettingsModal,
  isGameLoaded,
  onPlaceAllPlayers,
  highlightRosterButton, // <<< Receive prop
  onOpenSeasonTournamentModal,
  isTacticsBoardView,
  onToggleTacticsBoard,
  onAddHomeDisc,
  onAddOpponentDisc,
  onToggleInstructionsModal,
  onOpenSettingsModal,
  onOpenPlayerAssessmentModal,
  onSignOut,
}) => {
  const { t } = useTranslation(); // Standard hook
  const { user, signOut: authSignOut } = useAuth();
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const sidePanelRef = useRef<HTMLDivElement>(null);
  
  // --- RE-ADD BUTTON STYLES --- 
  // Consistent Button Styles - Adjusted active state
  const baseButtonStyle = "text-slate-100 font-semibold py-1.5 px-2 w-9 h-9 flex items-center justify-center rounded-md shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900";
  
  // Specific Colors - Added specific hover backgrounds
  const secondaryColor = "bg-slate-700 hover:bg-slate-600 focus:ring-slate-500";
  const resetColor = "bg-red-600 hover:bg-red-500 focus:ring-red-500";
  const clearColor = "bg-amber-600 hover:bg-amber-500 focus:ring-amber-500 text-white";
  const logGoalColor = "bg-blue-600 hover:bg-blue-500 focus:ring-blue-500"; 
  // --- END RE-ADD BUTTON STYLES --- 


  const handleSidePanelToggle = () => {
    setIsSidePanelOpen(!isSidePanelOpen);
    setDragOffset(0); // Reset drag offset when toggling
  };

  // Handle touch/swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isSidePanelOpen) return;
    e.preventDefault();
    setIsDragging(true);
    const touch = e.touches[0];
    const startX = touch.clientX;
    
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      const currentX = touch.clientX;
      const diff = currentX - startX;

      // Only allow left swipe (negative diff) to close
      if (diff < 0) {
        setDragOffset(Math.max(diff, -320)); // 320px is panel width
      }

      // Prevent page scroll while swiping
      e.preventDefault();
    };
    
    const handleTouchEnd = () => {
      setIsDragging(false);
      
      // Close panel if dragged more than 30% of width
      if (dragOffset < -96) { // 30% of 320px
        setIsSidePanelOpen(false);
      }
      
      setDragOffset(0);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
    
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  };

  // Handle mouse drag for desktop testing
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isSidePanelOpen) return;
    setIsDragging(true);
    const startX = e.clientX;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const currentX = e.clientX;
      const diff = currentX - startX;
      
      // Only allow left drag (negative diff) to close
      if (diff < 0) {
        setDragOffset(Math.max(diff, -320)); // 320px is panel width
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      
      // Close panel if dragged more than 30% of width
      if (dragOffset < -96) { // 30% of 320px
        setIsSidePanelOpen(false);
      }
      
      setDragOffset(0);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Prevent text selection while dragging
    e.preventDefault();
  };

  // Close side panel if clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidePanelRef.current && !sidePanelRef.current.contains(event.target as Node)) {
        setIsSidePanelOpen(false);
      }
    };

    if (isSidePanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSidePanelOpen]);


  const iconSize = "w-5 h-5"; // Standard icon size class
  const menuIconSize = "w-5 h-5 mr-2"; // Smaller icon size for menu items

  // Helper to wrap handlers to also close the menu & reset view
  const wrapHandler = (handler: () => void) => () => {
    handler();
    setIsSidePanelOpen(false);
  };

  // Callback to handle StartNewGame button click
  const handleStartNewGame = () => {
    onStartNewGame();
    setIsSidePanelOpen(false);
  };

  return (
    <div className="bg-gradient-to-b from-slate-800 to-slate-900 p-2 shadow-md flex flex-wrap justify-center items-center gap-x-4 gap-y-2 relative z-40">
      {/* Left Group: Undo/Redo */}
      <div className="flex items-center gap-1">
        <button onClick={onUndo} disabled={!canUndo} className={`${baseButtonStyle} ${secondaryColor}`} title={t('controlBar.undo') ?? "Undo"}>
            <HiOutlineArrowUturnLeft className={iconSize}/>
        </button>
        <button onClick={onRedo} disabled={!canRedo} className={`${baseButtonStyle} ${secondaryColor}`} title={t('controlBar.redo') ?? "Redo"}>
            <HiOutlineArrowUturnRight className={iconSize}/>
        </button>
      </div>

      {/* Center Group: Field Actions */}
      <div className="flex items-center gap-1">
        <button 
          onClick={onToggleTacticsBoard} 
          className={`${baseButtonStyle} ${isTacticsBoardView ? 'bg-indigo-600 hover:bg-indigo-500 focus:ring-indigo-500' : secondaryColor}`} 
          title={t(isTacticsBoardView ? 'controlBar.toggleTacticsBoardHide' : 'controlBar.toggleTacticsBoardShow') ?? (isTacticsBoardView ? "Show Players" : "Show Tactics Board")}
        >
            <HiOutlineClipboard className={iconSize}/>
        </button>
        {isTacticsBoardView ? (
          <>
            <button onClick={onAddHomeDisc} className={`${baseButtonStyle} bg-purple-600 hover:bg-purple-500 focus:ring-purple-500`} title={t('controlBar.addHomeDisc', 'Add Home Disc') ?? "Add Home Disc"}>
              <HiOutlinePlusCircle className={iconSize}/>
            </button>
            <button onClick={onAddOpponentDisc} className={`${baseButtonStyle} bg-red-600 hover:bg-red-500 focus:ring-red-500`} title={t('controlBar.addOpponentDisc', 'Add Opponent Disc') ?? "Add Opponent Disc"}>
              <HiOutlinePlusCircle className={iconSize}/>
            </button>
            <button onClick={onClearDrawings} className={`${baseButtonStyle} ${clearColor}`} title={t('controlBar.clearDrawings') ?? "Clear Drawings"}>
                <HiOutlineBackspace className={iconSize}/>
            </button>
            <button onClick={onResetField} className={`${baseButtonStyle} ${resetColor}`} title={t('controlBar.resetField') ?? "Reset Field"}>
                <HiOutlineTrash className={iconSize}/>
            </button>
          </>
        ) : (
          <>
        <button onClick={onPlaceAllPlayers} className={`${baseButtonStyle} bg-purple-600 hover:bg-purple-500 focus:ring-purple-500`} title={t('controlBar.placeAllPlayers') ?? "Place All Players on Field"}>
            <HiOutlineSquares2X2 className={iconSize}/>
        </button>
        <button onClick={onAddOpponent} className={`${baseButtonStyle} bg-red-600 hover:bg-red-500 focus:ring-red-500`} title={t('controlBar.addOpponent') ?? "Add Opponent"}>
            <HiOutlinePlusCircle className={iconSize}/>
        </button>
        <button onClick={onClearDrawings} className={`${baseButtonStyle} ${clearColor}`} title={t('controlBar.clearDrawings') ?? "Clear Drawings"}>
            <HiOutlineBackspace className={iconSize}/>
        </button>
        <button onClick={onResetField} className={`${baseButtonStyle} ${resetColor}`} title={t('controlBar.resetField') ?? "Reset Field"}>
            <HiOutlineTrash className={iconSize}/>
        </button>
          </>
        )}
      </div>

      {/* Right Group: Live/Info Actions & Settings */}
      <div className="flex items-center gap-1">
        {/* Log Goal (Moved Here, Use FaFutbol Icon) */}
        <button onClick={onToggleGoalLogModal} className={`${baseButtonStyle} ${logGoalColor}`} title={t('controlBar.logGoal', 'Log Goal') ?? "Log Goal"}>
            <FaFutbol size={18} />
        </button>

        {/* <<< ADD Roster Settings Button >>> */}
        <button 
            id="roster-button" // Add an ID for potential coach mark targeting later
            onClick={onOpenRosterModal}
            className={`${baseButtonStyle} ${highlightRosterButton ? 'bg-indigo-600 hover:bg-indigo-500 focus:ring-indigo-500 animate-pulse' : secondaryColor}`}
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

        <button
          onClick={onToggleInstructionsModal}
          className={`${baseButtonStyle} ${secondaryColor}`}
          title={t('controlBar.appGuide') ?? 'App Guide'}
        >
            <HiOutlineQuestionMarkCircle className={iconSize} />
        </button>

        {/* Toggle Overlay Button */}
        <button
          onClick={onToggleLargeTimerOverlay}
          className={`${baseButtonStyle} bg-green-600 hover:bg-green-700 focus:ring-green-500`}
          title={t(showLargeTimerOverlay ? 'controlBar.toggleTimerOverlayHide' : 'controlBar.toggleTimerOverlayShow') ?? (showLargeTimerOverlay ? "Hide Large Timer" : "Show Large Timer")}
        >
            {showLargeTimerOverlay ? <HiOutlineStopCircle className={iconSize} /> : <HiOutlineClock className={iconSize} />}
        </button>
        
        {/* Auth Button - Moved to TopBar */}
        
        {/* Menu Button */}
        <div className="relative">
          <button
            onClick={handleSidePanelToggle}
            className={`${baseButtonStyle} ${secondaryColor}`}
            title={t('controlBar.menu') ?? "Menu"}
          >
            <HiBars3 className={iconSize} />
          </button>
        </div>

      {/* Side Panel Overlay */}
      {isSidePanelOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsSidePanelOpen(false)} />
      )}
      
      {/* Side Panel */}
      <div 
        ref={sidePanelRef}
        onTouchStart={handleTouchStart}
        onMouseDown={handleMouseDown}
        className={`fixed top-0 left-0 h-full w-80 bg-slate-800/98 backdrop-blur-sm shadow-xl z-50 border-r border-slate-600/50 transform ${
          isDragging ? '' : 'transition-transform duration-300 ease-in-out'
        } ${
          isSidePanelOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          transform: isSidePanelOpen 
            ? `translateX(${dragOffset}px)` 
            : 'translateX(-100%)',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
        {/* Side Panel Header */}
        <div className="px-4 py-3 border-b border-slate-700/80 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-yellow-300">{t('controlBar.menu.title', 'Menu')}</h3>
          <button 
            onClick={() => setIsSidePanelOpen(false)} 
            className="text-slate-400 hover:text-slate-200 p-1 rounded"
          >
            <HiOutlineChevronLeft className="w-5 h-5" />
          </button>
        </div>
        
        {/* Side Panel Content */}
        <nav className="flex flex-col p-4 space-y-1 overflow-y-auto h-full">
          {/* Group 1: Game Management */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('sidebarCategories.gameManagement', 'Game Management')}</h4>
            <div className="space-y-1">
              <button onClick={wrapHandler(onQuickSave)} className="w-full flex items-center px-3 py-2.5 text-sm text-slate-100 hover:bg-slate-700/75 rounded-lg transition-colors">
                <HiOutlineArchiveBoxArrowDown className={menuIconSize} /> {t('controlBar.saveGame', 'Save Game')}
              </button>
              <button onClick={wrapHandler(onOpenLoadGameModal)} className="w-full flex items-center px-3 py-2.5 text-sm text-slate-100 hover:bg-slate-700/75 rounded-lg transition-colors">
                <HiOutlineFolderOpen className={menuIconSize} /> {t('controlBar.loadGame', 'Load Game')}
              </button>
              <button onClick={wrapHandler(handleStartNewGame)} className="w-full flex items-center px-3 py-2.5 text-sm text-slate-100 hover:bg-slate-700/75 rounded-lg transition-colors">
                <HiOutlinePlusCircle className={menuIconSize} /> {t('controlBar.startNewGame', 'Start New Game')}
              </button>
            </div>
          </div>

          {/* Group 2: Setup & Configuration */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('sidebarCategories.setupConfiguration', 'Setup & Configuration')}</h4>
            <div className="space-y-1">
              <button onClick={wrapHandler(onOpenGameSettingsModal)} className={`w-full flex items-center px-3 py-2.5 text-sm text-slate-100 hover:bg-slate-700/75 rounded-lg transition-colors ${!isGameLoaded ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={!isGameLoaded}>
                <HiOutlineAdjustmentsHorizontal className={menuIconSize} /> {t('controlBar.gameSettingsButton', 'Game Settings')}
              </button>
              <button onClick={wrapHandler(onOpenRosterModal)} className="w-full flex items-center px-3 py-2.5 text-sm text-slate-100 hover:bg-slate-700/75 rounded-lg transition-colors">
                <HiOutlineUsers className={menuIconSize} /> {t('controlBar.manageRoster', 'Manage Roster')}
              </button>
              <button onClick={wrapHandler(onOpenSeasonTournamentModal)} className="w-full flex items-center px-3 py-2.5 text-sm text-slate-100 hover:bg-slate-700/75 rounded-lg transition-colors">
                <HiOutlineTrophy className={menuIconSize} /> {t('controlBar.manageSeasonsAndTournaments', 'Manage Seasons & Tournaments')}
              </button>
            </div>
          </div>

          {/* Group 3: Analysis & Tools */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('sidebarCategories.analysisTools', 'Analysis & Tools')}</h4>
            <div className="space-y-1">
              <button onClick={wrapHandler(onToggleGameStatsModal)} className="w-full flex items-center px-3 py-2.5 text-sm text-slate-100 hover:bg-slate-700/75 rounded-lg transition-colors">
                <HiOutlineClipboardDocumentList className={menuIconSize} /> {t('controlBar.stats', 'Statistics')}
              </button>
              <button onClick={wrapHandler(onOpenPlayerAssessmentModal)} className="w-full flex items-center px-3 py-2.5 text-sm text-slate-100 hover:bg-slate-700/75 rounded-lg transition-colors">
                <HiOutlineClipboard className={menuIconSize} /> {t('controlBar.assessPlayers', 'Assess Players')}
              </button>
              <button onClick={wrapHandler(onToggleTrainingResources)} className="w-full flex items-center px-3 py-2.5 text-sm text-slate-100 hover:bg-slate-700/75 rounded-lg transition-colors">
                <HiOutlineBookOpen className={menuIconSize} /> {t('controlBar.training', 'Training Resources')}
              </button>
              <button onClick={wrapHandler(onOpenLoadGameModal)} className="w-full flex items-center px-3 py-2.5 text-sm text-slate-100 hover:bg-slate-700/75 rounded-lg transition-colors">
                <HiOutlineDocumentArrowDown className={menuIconSize} /> {t('controlBar.exportData', 'Export Data')}
              </button>
            </div>
          </div>

          {/* Group 4: External Resources */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('sidebarCategories.resources', 'Resources')}</h4>
            <div className="space-y-1">
              <a
                href="https://www.palloliitto.fi/valmentajien-materiaalit-jalkapallo"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsSidePanelOpen(false)}
                className="w-full flex items-center px-3 py-2.5 text-sm text-slate-100 hover:bg-slate-700/75 rounded-lg transition-colors"
              >
                <HiOutlineArrowTopRightOnSquare className={menuIconSize} />
                {t('controlBar.coachingMaterials', 'Coaching Materials')}
              </a>
              <a 
                href="https://taso.palloliitto.fi" 
                target="_blank" 
                rel="noopener noreferrer" 
                onClick={() => setIsSidePanelOpen(false)}
                className="w-full flex items-center px-3 py-2.5 text-sm text-slate-100 hover:bg-slate-700/75 rounded-lg transition-colors"
              >
                <HiOutlineArrowTopRightOnSquare className={menuIconSize} />
                {t('controlBar.tasoLink', 'Taso')}
              </a>
            </div>
          </div>

          {/* Group 5: App Settings */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('sidebarCategories.settings', 'Settings')}</h4>
            <div className="space-y-1">
              <button onClick={wrapHandler(onOpenSettingsModal)} className="w-full flex items-center px-3 py-2.5 text-sm text-slate-100 hover:bg-slate-700/75 rounded-lg transition-colors">
                <HiOutlineCog6Tooth className={menuIconSize} /> {t('controlBar.appSettings', 'App Settings')}
              </button>
            </div>
          </div>

          {/* Group 6: Account */}
          {(user || onSignOut) && (
            <div className="mt-auto pt-4 border-t border-slate-700/50 space-y-1">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {t('sidebarCategories.account', 'Account')}
              </h4>
              <button
                onClick={() => {
                  if (onSignOut) {
                    onSignOut();
                  } else {
                    authSignOut();
                  }
                  setIsSidePanelOpen(false);
                }}
                className="w-full flex items-center px-3 py-2.5 text-sm text-red-300 hover:bg-red-600/20 rounded-lg transition-colors"
              >
                <HiOutlineArrowRightOnRectangle className={`${menuIconSize} rotate-180`} />
                {t('auth.signOut', 'Sign Out')}
              </button>
            </div>
          )}
        </nav>
      </div>

    </div>
    </div>
  );
};

export default React.memo(ControlBar);