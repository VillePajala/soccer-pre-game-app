'use client';

import React, { useState, useEffect, useRef } from 'react';

interface GameInfoBarProps {
  teamName: string;
  opponentName: string;
  homeScore: number;
  awayScore: number;
  onTeamNameChange: (newName: string) => void;
  onOpponentNameChange: (newName: string) => void;
  homeOrAway: 'home' | 'away';
}

const GameInfoBar: React.FC<GameInfoBarProps> = ({
  teamName,
  opponentName,
  homeScore,
  awayScore,
  onTeamNameChange,
  onOpponentNameChange,
  homeOrAway,
}) => {
  const [editingField, setEditingField] = useState<'left' | 'right' | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const teamInputRef = useRef<HTMLInputElement>(null);
  const opponentInputRef = useRef<HTMLInputElement>(null);
  const [lastTapInfo, setLastTapInfo] = useState<{ time: number; target: 'left' | 'right' | null }>({ time: 0, target: null });

  useEffect(() => {
    if (editingField === 'left') {
      teamInputRef.current?.focus();
      teamInputRef.current?.select();
    } else if (editingField === 'right') {
      opponentInputRef.current?.focus();
      opponentInputRef.current?.select();
    }
  }, [editingField]);

  const handleStartEdit = (side: 'left' | 'right') => {
    setEditingField(side);
    setEditValue(side === 'left' ? teamName : opponentName);
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const handleSaveEdit = () => {
    if (!editingField) return;
    const trimmedValue = editValue.trim();
    if (trimmedValue) {
      if (editingField === 'left') {
        if (homeOrAway === 'home') {
          onTeamNameChange(trimmedValue);
        } else {
          onOpponentNameChange(trimmedValue);
        }
      } else {
        if (homeOrAway === 'home') {
          onOpponentNameChange(trimmedValue);
        } else {
          onTeamNameChange(trimmedValue);
        }
      }
    }
    handleCancelEdit();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleTap = (side: 'left' | 'right') => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (lastTapInfo.target === side && (now - lastTapInfo.time) < DOUBLE_TAP_DELAY) {
      handleStartEdit(side);
      setLastTapInfo({ time: 0, target: null });
    } else {
      setLastTapInfo({ time: now, target: side });
    }
  };

  const inputClasses = "bg-transparent border-none outline-none text-slate-100 text-sm font-medium px-1 py-0 focus:bg-slate-700 rounded";

  const leftTeamName = homeOrAway === 'home' ? teamName : opponentName;
  const rightTeamName = homeOrAway === 'home' ? opponentName : teamName;
  const leftScore = homeScore;
  const rightScore = awayScore;

  return (
    <div className="bg-slate-900 px-4 py-1 text-slate-200 flex justify-center items-center text-sm shadow-md min-h-[2.5rem]">
      {/* Center Content: Teams and Score */}
      <div className="flex items-center space-x-3 font-medium">
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

export default GameInfoBar; 