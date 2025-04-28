'use client';

import React, { useState, useEffect, useRef } from 'react';

// Helper function to format time (MM:SS)
const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

interface GameInfoBarProps {
  teamName: string;
  opponentName: string;
  homeScore: number;
  awayScore: number;
  onTeamNameChange: (newName: string) => void;
  onOpponentNameChange: (newName: string) => void;
}

const GameInfoBar: React.FC<GameInfoBarProps> = ({
  teamName,
  opponentName,
  homeScore,
  awayScore,
  onTeamNameChange,
  onOpponentNameChange,
}) => {
  const [editingField, setEditingField] = useState<'team' | 'opponent' | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const teamInputRef = useRef<HTMLInputElement>(null);
  const opponentInputRef = useRef<HTMLInputElement>(null);
  const [lastTapInfo, setLastTapInfo] = useState<{ time: number; target: 'team' | 'opponent' | null }>({ time: 0, target: null });

  useEffect(() => {
    if (editingField === 'team') {
      teamInputRef.current?.focus();
      teamInputRef.current?.select();
    } else if (editingField === 'opponent') {
      opponentInputRef.current?.focus();
      opponentInputRef.current?.select();
    }
  }, [editingField]);

  const handleStartEdit = (field: 'team' | 'opponent') => {
    setEditingField(field);
    setEditValue(field === 'team' ? teamName : opponentName);
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const handleSaveEdit = () => {
    if (!editingField) return;
    const trimmedValue = editValue.trim();
    if (trimmedValue) { // Only save if not empty
      if (editingField === 'team') {
        onTeamNameChange(trimmedValue);
      } else {
        onOpponentNameChange(trimmedValue);
      }
    }
    handleCancelEdit(); // Reset state after save/attempt
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

  const handleTap = (target: 'team' | 'opponent') => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300; // Milliseconds

    if (lastTapInfo.target === target && (now - lastTapInfo.time) < DOUBLE_TAP_DELAY) {
      // Double tap detected
      handleStartEdit(target);
      // Reset tap info
      setLastTapInfo({ time: 0, target: null });
    } else {
      // First tap or too slow, record new tap info
      setLastTapInfo({ time: now, target: target });
    }
  };

  const inputClasses = "bg-transparent border-none outline-none text-slate-100 text-sm font-medium px-1 py-0 focus:bg-slate-700 rounded";

  return (
    <div className="bg-slate-900 px-4 py-1.5 text-slate-200 flex justify-center items-center text-sm shadow-md z-30 min-h-[3rem]">
      {/* Center Content: Teams and Score */}
      <div className="flex items-center space-x-3 font-medium">
        {/* Home Team Name - Make Editable */}
        <div className="text-right" title={editingField !== 'team' ? "Double-click to edit" : undefined}>
          {editingField === 'team' ? (
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
              onTouchEnd={() => handleTap('team')}
              onDoubleClick={() => handleStartEdit('team')}
              title={teamName}
            >
              {teamName}
            </span>
          )}
        </div>

        {/* Score */}
        <span className="bg-slate-700 px-2 py-0.5 rounded text-yellow-300 text-base font-bold">
          {homeScore} - {awayScore}
        </span>

        {/* Away Team Name - Make Editable */}
        <div className="text-left" title={editingField !== 'opponent' ? "Double-click to edit" : undefined}>
          {editingField === 'opponent' ? (
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
              onTouchEnd={() => handleTap('opponent')}
              onDoubleClick={() => handleStartEdit('opponent')}
              title={opponentName}
            >
              {opponentName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameInfoBar; 