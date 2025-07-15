'use client';

import React from 'react';
// Import Heroicons (Outline style)
import {
    HiOutlineArrowUturnLeft,
    HiOutlineArrowUturnRight,
    HiOutlineTrash,
    HiOutlineBackspace, // Icon for Clear Drawings
    HiOutlineStopCircle,
    HiOutlineClock,
    HiOutlineClipboard, // Icon for Tactics Board
    HiOutlineCog6Tooth, // Settings icon
    HiOutlineQuestionMarkCircle, // Icon for help
    HiOutlinePlusCircle, // Icon for adding discs
    // HiOutlineMinusCircle, // Icon for adding opponent discs
    // HiOutlineFolderArrowDown,   // Icon for Save Game As... (COMMENTED OUT)
    HiOutlineUsers,            // Icon for Manage Roster
    HiOutlineAdjustmentsHorizontal, // For Game Settings
    HiOutlineSquares2X2,       // For Place All Players on Field
} from 'react-icons/hi2'; // Using hi2 for Heroicons v2 Outline
// REMOVE FaClock, FaUsers, FaCog (FaFutbol remains)
import { FaFutbol } from 'react-icons/fa';

// Import translation hook
import { useTranslation } from 'react-i18next';
import logger from '@/utils/logger';

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
  onToggleGoalLogModal: () => void; // Add prop for goal modal
  onOpenRosterModal: () => void; // Add prop for opening roster modal
  onOpenGameSettingsModal: () => void;
  onPlaceAllPlayers: () => void; // New prop for placing all players on the field
  highlightRosterButton: boolean; // <<< ADD prop for highlighting
  isTacticsBoardView: boolean;
  onToggleTacticsBoard: () => void;
  onAddHomeDisc: () => void;
  onAddOpponentDisc: () => void;
  onToggleInstructionsModal: () => void;
  onOpenMenu: () => void;
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
  onToggleGoalLogModal,
  onOpenRosterModal,
  onOpenGameSettingsModal,
  onPlaceAllPlayers,
  highlightRosterButton, // <<< Receive prop
  isTacticsBoardView,
  onToggleTacticsBoard,
  onAddHomeDisc,
  onAddOpponentDisc,
  onToggleInstructionsModal,
  onOpenMenu,
}) => {
  const { t } = useTranslation(); // Standard hook
  logger.log('[ControlBar Render] Received highlightRosterButton prop:', highlightRosterButton); // <<< Log prop value
  
  // --- RE-ADD BUTTON STYLES --- 
  // Consistent Button Styles - Adjusted active state
  const baseButtonStyle = "text-slate-100 font-semibold py-1.5 px-2 w-9 h-9 flex items-center justify-center rounded-md shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900";
  
  // Specific Colors - Added specific hover backgrounds
  const secondaryColor = "bg-slate-700 hover:bg-slate-600 focus:ring-slate-500";
  const resetColor = "bg-red-600 hover:bg-red-500 focus:ring-red-500";
  const clearColor = "bg-amber-600 hover:bg-amber-500 focus:ring-amber-500 text-white";
  const logGoalColor = "bg-blue-600 hover:bg-blue-500 focus:ring-blue-500"; 
  // --- END RE-ADD BUTTON STYLES --- 


  const iconSize = "w-5 h-5"; // Standard icon size class


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
        
        
        {/* Menu Button */}
        <button
          onClick={onOpenMenu}
          className={`${baseButtonStyle} ${secondaryColor}`}
          title={t('controlBar.settings') ?? 'Settings'}
        >
          <HiOutlineCog6Tooth className={iconSize} />
        </button>
      </div>
    </div>
  );
};

export default ControlBar;
