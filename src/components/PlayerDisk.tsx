'use client';

import React, { useMemo } from 'react';
import { Player } from '@/types'; // Import Player from types
import { GameEvent } from '@/app/page'; // Import GameEvent type
import {
    HiOutlineShieldCheck, // Goalie icon
} from 'react-icons/hi2';

interface PlayerDiskProps {
  id: string;
  fullName: string;
  nickname?: string;
  color?: string;
  isGoalie?: boolean; // Add goalie status prop
  // Bar specific props
  onPlayerDragStartFromBar?: (player: Player) => void;
  selectedPlayerIdFromBar?: string | null;
  gameEvents: GameEvent[]; // Add gameEvents prop
  onPlayerTapInBar?: (player: Player) => void; // New prop for tap action
  onToggleGoalie?: (playerId: string) => void; // Need this prop
}

// Define badge component
const StatBadge: React.FC<{ count: number, bgColor: string, positionClasses: string, title: string }> = ({ count, bgColor, positionClasses, title }) => (
  <div 
    title={title}
    className={`absolute ${positionClasses} w-5 h-5 rounded-full ${bgColor} flex items-center justify-center text-xs font-bold text-slate-900 shadow-md pointer-events-none z-20`}
  >
    {count}
  </div>
);

const PlayerDisk: React.FC<PlayerDiskProps> = ({
  id,
  fullName,
  nickname,
  color = '#7E22CE', // Default to purple-700 if no color passed
  isGoalie = false, // Default goalie status
  onPlayerDragStartFromBar,
  selectedPlayerIdFromBar,
  gameEvents,
  onPlayerTapInBar,
  onToggleGoalie // Destructure goalie toggle handler
}) => {
  // REMOVED: console.log(`[PlayerDisk id=${id} name=${fullName}] Component RENDER. gameEvents prop:`, JSON.stringify(gameEvents));

  // Calculate goals and assists for this player
  const playerStats = useMemo(() => {
    // REMOVED: console.log(`[PlayerDisk id=${id} name=${fullName}] Recalculating stats. gameEvents:`, JSON.stringify(gameEvents));
    const goals = gameEvents.filter(event => event.type === 'goal' && event.scorerId === id).length;
    const assists = gameEvents.filter(event => event.type === 'goal' && event.assisterId === id).length;
    // REMOVED: console.log(`[PlayerDisk id=${id} name=${fullName}] Calculated stats - Goals: ${goals}, Assists: ${assists}`);
    return { goals, assists };
  }, [gameEvents, id]);

  // --- Modified Event Handlers for Selection ONLY ---
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();

    // Single click selects
    if (onPlayerTapInBar) {
      onPlayerTapInBar({ id, name: fullName, nickname, color, isGoalie });
    }
  };

  const handleTouchStart = () => {
     // Basic start, no complex logic needed now
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
     e.preventDefault();

     // Simple tap selects
     if (onPlayerTapInBar) {
      onPlayerTapInBar({ id, name: fullName, nickname, color, isGoalie });
     }
  };

  // --- Goalie Toggle Icon Handler (Keep this) ---
  const handleToggleGoalieClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation(); // IMPORTANT: Prevent click from triggering disk selection
    if (onToggleGoalie) {
      onToggleGoalie(id);
    }
  };

  // HTML Drag and Drop (Keep this)
  const handleDragStart = () => {
    if (!onPlayerDragStartFromBar) return;
    const playerData: Player = { id, name: fullName, nickname, color, isGoalie };
    onPlayerDragStartFromBar(playerData);
  };

  // Conditional styling (Keep most, remove input-specific)
  const isInBar = !!onPlayerDragStartFromBar;
  const diskSizeClasses = isInBar ? "w-16 h-16 p-1" : "w-20 h-20 p-2";
  const textSizeClasses = isInBar ? "text-sm" : "text-sm";
  const selectionRingClass = selectedPlayerIdFromBar === id ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-900' : '';
  const goalieFillColor = '#F97316'; // Orange-500
  const defaultFillColor = color || '#7E22CE'; // Existing default purple
  const defaultTextColor = 'text-white';
  const finalFillColor = isGoalie ? goalieFillColor : defaultFillColor;

  return (
    <div
      className={`relative ${diskSizeClasses} rounded-full flex flex-col items-center justify-center cursor-pointer shadow-lg m-2 transition-all duration-150 ease-in-out ${selectionRingClass}`}
      style={{ backgroundColor: finalFillColor }}
      draggable={isInBar}
      onDragStart={handleDragStart}
      // Use simplified selection handlers
      onMouseDown={isInBar ? handleMouseDown : undefined}
      onTouchStart={isInBar ? handleTouchStart : undefined}
      onTouchEnd={isInBar ? handleTouchEnd : undefined}
      onTouchCancel={isInBar ? handleTouchEnd : undefined} // Might still need cancel to deselect? Revisit if needed.
    >
      {isInBar && (
        <>
          <div
            className="absolute inset-0 w-full h-full rounded-full"
            style={{
              background: `radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0) 80%)`
            }}
          />
          <div
            className="absolute inset-0 w-full h-full rounded-full"
            style={{
              background: `radial-gradient(circle at 70% 70%, rgba(0, 0, 0, 0.25) 0%, rgba(0, 0, 0, 0) 75%)`
            }}
          />
        </>
      )}
      {/* Goalie Toggle Icon (Only when selected - Keep this) */}
      {selectedPlayerIdFromBar === id && onToggleGoalie && (
        <button
          title={isGoalie ? "Unset Goalie" : "Set Goalie"}
          className="absolute top-0 left-0 transform -translate-x-1 -translate-y-1 p-1 bg-slate-600 hover:bg-slate-500 rounded-full shadow-md z-10"
          onClick={handleToggleGoalieClick}
          onTouchEnd={handleToggleGoalieClick}
        >
          <HiOutlineShieldCheck className={`w-5 h-5 ${isGoalie ? 'text-emerald-400' : 'text-slate-300'}`} />
        </button>
      )}

      {/* Always render the name span */}
      <span 
        className={`font-semibold ${textSizeClasses} ${defaultTextColor} break-words text-center leading-tight max-w-full px-1`}
        style={{ fontFamily: 'Rajdhani, sans-serif' }}
      >
        {nickname || fullName} {/* Always display nickname or full name */}
      </span>

      {/* Stat Badges (Keep these) */}
      {playerStats.goals > 0 && (
        <StatBadge
          count={playerStats.goals}
          bgColor="bg-yellow-400"
          positionClasses="top-[2px] right-[2px]"
          title={`${playerStats.goals} Goals`}
        />
      )}
      {playerStats.assists > 0 && (
        <StatBadge
          count={playerStats.assists}
          bgColor="bg-slate-400"
          positionClasses="bottom-[2px] right-[2px]"
          title={`${playerStats.assists} Assists`}
        />
      )}
    </div>
  );
};

export default PlayerDisk;