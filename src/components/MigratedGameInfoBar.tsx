'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGameSession, useGameScore, useGameStore } from '@/stores/gameStore';
import type { GameInfoBarProps } from './GameInfoBar.migration';

/**
 * Migrated GameInfoBar component that uses Zustand stores
 * Maintains same interface as legacy component but with centralized state
 */
export const MigratedGameInfoBar: React.FC<GameInfoBarProps> = ({
  // Props that will be overridden by store values
  teamName: propTeamName,
  opponentName: propOpponentName,
  homeScore: propHomeScore,
  awayScore: propAwayScore,
  
  // Props that are still used
  onTeamNameChange,
  onOpponentNameChange,
  homeOrAway,
}) => {
  // Get values from Zustand stores
  const gameSession = useGameSession();
  const { homeScore, awayScore } = useGameScore();
  const gameStore = useGameStore();
  
  // Use store values instead of props where available
  const displayTeamName = gameSession.teamName || propTeamName;
  const displayOpponentName = gameSession.opponentName || propOpponentName;
  const displayHomeScore = homeScore;
  const displayAwayScore = awayScore;
  
  // Local state for editing
  const [editingField, setEditingField] = useState<'left' | 'right' | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const teamInputRef = useRef<HTMLInputElement>(null);
  const opponentInputRef = useRef<HTMLInputElement>(null);
  const [lastTapInfo, setLastTapInfo] = useState<{ time: number; target: 'left' | 'right' | null }>({ 
    time: 0, 
    target: null 
  });

  // Focus input when editing starts
  useEffect(() => {
    if (editingField === 'left') {
      teamInputRef.current?.focus();
      teamInputRef.current?.select();
    } else if (editingField === 'right') {
      opponentInputRef.current?.focus();
      opponentInputRef.current?.select();
    }
  }, [editingField]);

  const handleStartEdit = useCallback((side: 'left' | 'right') => {
    setEditingField(side);
    setEditValue(side === 'left' ? displayTeamName : displayOpponentName);
  }, [displayTeamName, displayOpponentName]);

  const handleCancelEdit = useCallback(() => {
    setEditingField(null);
    setEditValue('');
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingField) return;
    
    const trimmedValue = editValue.trim();
    if (trimmedValue) {
      if (editingField === 'left') {
        if (homeOrAway === 'home') {
          // Left side is team name when we're home team
          gameStore.setTeamName(trimmedValue);
          onTeamNameChange(trimmedValue);
        } else {
          // Left side is opponent name when we're away team
          gameStore.setOpponentName(trimmedValue);
          onOpponentNameChange(trimmedValue);
        }
      } else {
        if (homeOrAway === 'home') {
          // Right side is opponent name when we're home team
          gameStore.setOpponentName(trimmedValue);
          onOpponentNameChange(trimmedValue);
        } else {
          // Right side is team name when we're away team
          gameStore.setTeamName(trimmedValue);
          onTeamNameChange(trimmedValue);
        }
      }
    }
    handleCancelEdit();
  }, [
    editingField, 
    editValue, 
    homeOrAway, 
    gameStore, 
    onTeamNameChange, 
    onOpponentNameChange, 
    handleCancelEdit
  ]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  }, []);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  }, [handleSaveEdit, handleCancelEdit]);

  const handleTap = useCallback((side: 'left' | 'right') => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (lastTapInfo.target === side && (now - lastTapInfo.time) < DOUBLE_TAP_DELAY) {
      handleStartEdit(side);
      setLastTapInfo({ time: 0, target: null });
    } else {
      setLastTapInfo({ time: now, target: side });
    }
  }, [lastTapInfo, handleStartEdit]);

  // Calculate display values based on home/away status
  const leftTeamName = homeOrAway === 'home' ? displayTeamName : displayOpponentName;
  const rightTeamName = homeOrAway === 'home' ? displayOpponentName : displayTeamName;
  const leftScore = displayHomeScore;
  const rightScore = displayAwayScore;

  const inputClasses = "bg-transparent border-none outline-none text-slate-100 text-sm font-medium px-1 py-0 focus:bg-slate-700 rounded";

  return (
    <div 
      className="bg-gradient-to-b from-slate-800 to-slate-900 px-4 py-1 text-slate-200 flex justify-center items-center text-sm shadow-md min-h-[2.5rem]"
      style={{ fontFamily: 'Rajdhani, sans-serif' }}
    >
      {/* Center Content: Teams and Score */}
      <div className="flex items-center space-x-3 font-semibold">
        {/* Left Team Name */}
        <div className="text-right" title={editingField !== 'left' ? "Double-click to edit" : undefined}>
          {editingField === 'left' ? (
            <input
              ref={teamInputRef}
              type="text"
              value={editValue}
              onChange={handleInputChange}
              onBlur={handleSaveEdit}
              onKeyDown={handleInputKeyDown}
              className={`${inputClasses} text-right max-w-[120px] w-full`}
            />
          ) : (
            <span 
              className="truncate cursor-pointer hover:bg-slate-700/50 p-1 rounded" 
              onTouchEnd={() => handleTap('left')}
              onDoubleClick={() => handleStartEdit('left')}
              title={leftTeamName}
            >
              {leftTeamName}
            </span>
          )}
        </div>

        {/* Score */}
        <span className="bg-slate-700 px-2 py-0.5 rounded text-yellow-300 text-sm font-bold">
          {leftScore} - {rightScore}
        </span>

        {/* Right Team Name */}
        <div className="text-left" title={editingField !== 'right' ? "Double-click to edit" : undefined}>
          {editingField === 'right' ? (
            <input
              ref={opponentInputRef}
              type="text"
              value={editValue}
              onChange={handleInputChange}
              onBlur={handleSaveEdit}
              onKeyDown={handleInputKeyDown}
              className={`${inputClasses} text-left max-w-[120px] w-full`}
            />
          ) : (
            <span 
              className="truncate cursor-pointer hover:bg-slate-700/50 p-1 rounded" 
              onTouchEnd={() => handleTap('right')}
              onDoubleClick={() => handleStartEdit('right')}
              title={rightTeamName}
            >
              {rightTeamName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(MigratedGameInfoBar);