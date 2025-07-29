'use client';

import React from 'react';

export interface TeamOpponentInputsProps {
  teamName: string;
  opponentName: string;
  onTeamNameChange: (value: string) => void;
  onOpponentNameChange: (value: string) => void;
  teamLabel: string;
  teamPlaceholder: string;
  opponentLabel: string;
  opponentPlaceholder: string;
  teamInputRef?: React.Ref<HTMLInputElement>;
  opponentInputRef?: React.Ref<HTMLInputElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  disabled?: boolean;
  stableInputProps?: {
    onFocus?: React.FocusEventHandler<HTMLInputElement>;
    onMouseDown?: React.MouseEventHandler<HTMLInputElement>;
  };
}

const TeamOpponentInputs: React.FC<TeamOpponentInputsProps> = ({
  teamName,
  opponentName,
  onTeamNameChange,
  onOpponentNameChange,
  teamLabel,
  teamPlaceholder,
  opponentLabel,
  opponentPlaceholder,
  teamInputRef,
  opponentInputRef,
  onKeyDown,
  disabled,
  stableInputProps,
}) => {
  return (
    <>
      <div className="mb-4">
        <label htmlFor="teamNameInput" className="block text-sm font-medium text-slate-300 mb-1">
          {teamLabel}
        </label>
        <input
          type="text"
          id="teamNameInput"
          ref={teamInputRef}
          value={teamName}
          onChange={(e) => onTeamNameChange(e.target.value)}
          placeholder={teamPlaceholder}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
          onKeyDown={onKeyDown}
          disabled={disabled}
          {...stableInputProps}
        />
      </div>
      <div className="mb-4">
        <label htmlFor="opponentNameInput" className="block text-sm font-medium text-slate-300 mb-1">
          {opponentLabel}
        </label>
        <input
          type="text"
          id="opponentNameInput"
          ref={opponentInputRef}
          value={opponentName}
          onChange={(e) => onOpponentNameChange(e.target.value)}
          placeholder={opponentPlaceholder}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
          onKeyDown={onKeyDown}
          disabled={disabled}
          {...stableInputProps}
        />
      </div>
    </>
  );
};

export default TeamOpponentInputs;
