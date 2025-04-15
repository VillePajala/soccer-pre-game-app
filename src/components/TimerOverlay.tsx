'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FaPlay, FaPause, FaUndo } from 'react-icons/fa'; // Import icons
import { useTranslation } from 'react-i18next'; // Import translation hook

// Helper function to format time (copied from ControlBar for now)
// TODO: Consider moving to a shared utility file
const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

interface TimerOverlayProps {
  timeElapsedInSeconds: number;
  subAlertLevel: 'none' | 'warning' | 'due';
  onSubstitutionMade: () => void;
  completedIntervalDurations: number[];
  subIntervalMinutes: number;
  onSetSubInterval: (minutes: number) => void;
  isTimerRunning: boolean;
  onStartPauseTimer: () => void;
  onResetTimer: () => void;
  onToggleGoalLogModal?: () => void;
  onRecordOpponentGoal?: () => void;
  teamName: string;
  opponentName: string;
  homeScore: number;
  awayScore: number;
  // Game Structure props
  numberOfPeriods: 1 | 2;
  periodDurationMinutes: number;
  currentPeriod: number;
  gameStatus: 'notStarted' | 'inProgress' | 'periodEnd' | 'gameEnd';
  onSetNumberOfPeriods: (periods: 1 | 2) => void;
  onSetPeriodDuration: (minutes: number) => void;
  lastSubTime: number | null;
  onOpponentNameChange: (name: string) => void;
}

const TimerOverlay: React.FC<TimerOverlayProps> = ({
  timeElapsedInSeconds,
  subAlertLevel,
  onSubstitutionMade,
  completedIntervalDurations,
  subIntervalMinutes,
  onSetSubInterval,
  isTimerRunning,
  onStartPauseTimer,
  onResetTimer,
  onToggleGoalLogModal = () => { console.warn('onToggleGoalLogModal handler not provided'); },
  onRecordOpponentGoal = () => { console.warn('onRecordOpponentGoal handler not provided'); },
  teamName = "Team",
  opponentName = "Opponent",
  homeScore = 0,
  awayScore = 0,
  // Game Structure props
  numberOfPeriods = 2,
  periodDurationMinutes = 10,
  currentPeriod = 1,
  gameStatus = 'notStarted',
  onSetNumberOfPeriods = () => { console.warn('onSetNumberOfPeriods handler not provided'); },
  onSetPeriodDuration = () => { console.warn('onSetPeriodDuration handler not provided'); },
  lastSubTime = null,
  onOpponentNameChange = () => { console.warn('onOpponentNameChange handler not provided'); },
}) => {
  const { t } = useTranslation(); // Initialize translation hook

  // --- State for Opponent Name Editing ---
  const [isEditingOpponentName, setIsEditingOpponentName] = useState(false);
  const [editedOpponentName, setEditedOpponentName] = useState(opponentName);
  const opponentInputRef = useRef<HTMLInputElement>(null);
  // --- End State ---

  // --- Effects for Opponent Name Editing ---
  useEffect(() => {
    setEditedOpponentName(opponentName);
    if (isEditingOpponentName) {
      // Logic here (currently commented out or placeholder)
    }
    // Add missing dependency
  }, [opponentName, isEditingOpponentName]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingOpponentName) {
      opponentInputRef.current?.focus();
      opponentInputRef.current?.select();
    }
  }, [isEditingOpponentName]);
  // --- End Effects ---

  // Determine text color based on alert status directly from prop
  let textColor = 'text-slate-100'; // Base text color
  if (subAlertLevel === 'due') {
    textColor = 'text-red-400'; // Use a subtler red
  } else if (subAlertLevel === 'warning') {
    textColor = 'text-orange-300'; // Use a subtler orange
  }

  // Determine background color - REMOVE alert level logic
  const bgColor = 'bg-slate-900/85'; // Always use default background
  
  // Consistent button styles (simplified for overlay)
  const timerButtonStyle = "text-white font-semibold py-2 px-5 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors duration-150 flex items-center justify-center space-x-2";
  const controlButtonStyle = "text-slate-100 font-bold py-1 px-3 rounded shadow bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-lg active:scale-95";
  const controlValueStyle = "text-slate-100 font-bold text-lg tabular-nums w-8 mx-2 text-center";
  const controlLabelStyle = "text-sm font-medium text-slate-300 mr-2";
  // Add action button styles for consistency
  const actionButtonBase = "text-slate-100 font-bold py-2.5 px-4 rounded-lg shadow-lg pointer-events-auto text-base transition-all duration-150 hover:shadow-md";
  const primaryActionStyle = `${actionButtonBase} bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 active:scale-[0.98] focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900`;
  const secondaryActionStyle = `${actionButtonBase} bg-teal-700 hover:bg-teal-600 active:bg-teal-800 active:scale-[0.98] focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-900`;
  const dangerActionStyle = `${actionButtonBase} bg-red-700 hover:bg-red-600 active:bg-red-800 active:scale-[0.98] focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-900`;
  
  const handleConfirmSubClick = () => {
    onSubstitutionMade();
  };

  // Calculate time since last substitution
  const timeSinceLastSub = lastSubTime === null ? timeElapsedInSeconds : timeElapsedInSeconds - lastSubTime;
  
  // Determine button text based on game status using translations
  let startPauseButtonText = t('timerOverlay.startButton', 'Start'); // Default to Start
  if (gameStatus === 'inProgress') {
    startPauseButtonText = isTimerRunning ? t('timerOverlay.pauseButton', 'Pause') : t('timerOverlay.resumeButton', 'Resume');
  } else if (gameStatus === 'periodEnd') {
    startPauseButtonText = currentPeriod < numberOfPeriods 
      ? t('timerOverlay.startPeriodButton', 'Start Period {{period}}', { period: currentPeriod + 1 })
      : t('timerOverlay.gameOverButton', 'Game Over');
  } else if (gameStatus === 'gameEnd') {
    startPauseButtonText = t('timerOverlay.gameOverButton', 'Game Over');
  }
  
  // --- Handlers for Opponent Name Editing ---
  const handleStartEditingOpponent = () => {
    setEditedOpponentName(opponentName); // Reset to current prop value on edit start
    setIsEditingOpponentName(true);
  };

  const handleOpponentInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEditedOpponentName(event.target.value);
  };

  const handleSaveOpponentName = () => {
    const trimmedName = editedOpponentName.trim();
    if (trimmedName && trimmedName !== opponentName) {
      onOpponentNameChange(trimmedName);
    }
    setIsEditingOpponentName(false);
  };

  const handleCancelEditOpponent = () => {
    setIsEditingOpponentName(false);
    setEditedOpponentName(opponentName); // Reset to original prop value
  };

  const handleOpponentKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSaveOpponentName();
    } else if (event.key === 'Escape') {
      handleCancelEditOpponent();
    }
  };
  // --- End Handlers ---

  return (
    <div className={`fixed inset-0 z-40 flex flex-col items-center p-4 pt-12 ${bgColor} backdrop-blur-lg`}>
      <div className="w-full max-w-lg flex flex-col items-center">
        {/* Game Score Display - MOVED TO TOP ABOVE TIMER */}
        <div className="bg-slate-800/70 px-5 py-2 rounded-lg mb-4">
          <div className="flex items-center justify-center gap-3 text-xl font-semibold">
            <span className="text-slate-100">{teamName}</span>
            <span className={`text-2xl font-bold ${homeScore > awayScore ? 'text-green-400' : 'text-slate-100'}`}>{homeScore}</span>
            <span className="text-slate-500">-</span>
            <span className={`text-2xl font-bold ${awayScore > homeScore ? 'text-red-400' : 'text-slate-100'}`}>{awayScore}</span>
            {/* --- Opponent Name Display/Edit --- */}
            {isEditingOpponentName ? (
                <input
                    ref={opponentInputRef}
                    type="text"
                    value={editedOpponentName}
                    onChange={handleOpponentInputChange}
                    onBlur={handleSaveOpponentName} // Save on blur
                    onKeyDown={handleOpponentKeyDown}
                    className="bg-slate-700 text-slate-100 text-xl font-semibold outline-none rounded px-2 py-0.5 w-28" // Adjust width as needed
                    onClick={(e) => e.stopPropagation()} // Prevent triggering underlying handlers
                />
            ) : (
                <span 
                    className="text-slate-100 cursor-pointer hover:text-slate-300" 
                    onClick={handleStartEditingOpponent} // Click to edit
                    title={t('timerOverlay.editOpponentNameTitle', 'Click to edit opponent name') ?? undefined}
                >
                    {opponentName}
                </span>
            )}
            {/* --- End Opponent Name --- */}
          </div> 
        </div>
      
        {/* Timer Display */}
        <div className="mb-3">
          <span className={`text-7xl sm:text-8xl font-bold tabular-nums ${textColor}`}>
            {formatTime(timeElapsedInSeconds)}
          </span>
        </div>
        
        {/* Time Since Last Substitution - SIMPLIFIED */}
        {(gameStatus !== 'notStarted') && (
          <div className="mb-4 text-center">
            <span className="text-sm font-medium text-slate-400">
              {t('timerOverlay.timeSinceLastSubCombined', 'Viim. vaihto:')} <span className="tabular-nums text-slate-300 font-semibold">{formatTime(timeSinceLastSub)}</span>
            </span>
          </div>
        )}

        {/* Game Status / Period Info */}
        <div className="mb-4 text-center">
            {gameStatus === 'notStarted' && (
                <span className="text-base text-yellow-400 font-medium">
                    {t('timerOverlay.gameNotStarted', 'Game not started')} 
                    {numberOfPeriods === 1 ? 
                        ` (${periodDurationMinutes} min)` : 
                        ` (2 x ${periodDurationMinutes} min)`}
                </span>
            )}
            {gameStatus === 'inProgress' && (
                <span className="text-base text-green-400 font-medium">
                    {numberOfPeriods === 1 ? (
                        // For single period games, no text needed
                        ''
                    ) : (
                        // For 2 periods (half times), just show which half time
                        t('timerOverlay.halfTimeInProgress', 'Puoliaika {currentPeriod}/2')
                            .replace('{currentPeriod}', String(currentPeriod))
                    )}
                </span>
            )}
            {gameStatus === 'periodEnd' && currentPeriod < numberOfPeriods && (
                <span className="text-base text-orange-400 font-medium">
                    {numberOfPeriods === 1 ? 
                        t('timerOverlay.gameEnded', 'Game Ended') :
                        t('timerOverlay.halfTimeEnded', 'End of Half Time {currentPeriod}')
                            .replace('{currentPeriod}', String(currentPeriod))
                    }
                </span>
            )}
            {gameStatus === 'gameEnd' && (
                <span className="text-base text-red-500 font-medium">
                    {t('timerOverlay.gameEnded', 'Game Ended')}
                </span>
            )}
        </div>

        {/* Timer Controls */}
        <div className="flex items-center space-x-3 mb-5"> 
          <button 
            onClick={onStartPauseTimer} 
            disabled={gameStatus === 'gameEnd'} // Disable when game ended
            className={`${timerButtonStyle} ${isTimerRunning ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-400' : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'} ${gameStatus === 'gameEnd' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isTimerRunning ? <FaPause size={16}/> : <FaPlay size={16}/>} 
            <span>{startPauseButtonText}</span>
          </button>
          <button 
            onClick={onResetTimer}
            className={`${timerButtonStyle} bg-slate-600 hover:bg-slate-700 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed`}
            disabled={timeElapsedInSeconds === 0 && gameStatus === 'notStarted'} // Only disable if truly at start
          >
            <FaUndo size={14}/>
            <span>{t('timerControls.resetButton', 'Reset')}</span>
          </button>
        </div>
        
        {/* Game Setup & Interval Controls Section */}
        <div className="bg-slate-800/80 backdrop-blur-sm p-3 rounded-lg w-full mb-4 space-y-4">
          {/* Game Structure Controls (only when game not started) */}
          {gameStatus === 'notStarted' && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 items-center">
              {/* Number of Periods */}
              <div className="flex items-center justify-center">
                <span className={controlLabelStyle}>{t('timerOverlay.periodsLabel', 'Periods')}</span>
                <button 
                    onClick={() => onSetNumberOfPeriods(1)} 
                    className={`${controlButtonStyle} ${numberOfPeriods === 1 ? 'bg-indigo-600 border-2 border-indigo-400' : 'border-2 border-transparent'}`}>
                    1
                </button>
                <button 
                    onClick={() => onSetNumberOfPeriods(2)} 
                    className={`${controlButtonStyle} ${numberOfPeriods === 2 ? 'bg-indigo-600 border-2 border-indigo-400' : 'border-2 border-transparent'}`}>
                    2
                </button>
              </div>
              {/* Period Duration */}
              <div className="flex items-center justify-center">
                <span className={controlLabelStyle}>{t('timerOverlay.durationLabel', 'Duration')}</span>
                <button
                  onClick={() => onSetPeriodDuration(periodDurationMinutes - 1)}
                  disabled={periodDurationMinutes <= 1}
                  className={controlButtonStyle} aria-label="Decrease period duration">
                  -
                </button>
                <span className={controlValueStyle}>{periodDurationMinutes}</span>
                <button 
                  onClick={() => onSetPeriodDuration(periodDurationMinutes + 1)}
                  className={controlButtonStyle} aria-label="Increase period duration">
                  +
                </button>
              </div>
            </div>
          )}
          
          {/* Main Action Buttons Section - Improved layout */}
          <div className="flex flex-col space-y-3">
            {/* ONLY SHOW INTERVAL SETTINGS WHEN GAME NOT STARTED */}
            {gameStatus === 'notStarted' && (
              <div className="flex items-center justify-center">
                <span className={controlLabelStyle}>{t('timerOverlay.subIntervalLabel', 'Sub Interval')}</span>
                <button
                  onClick={() => onSetSubInterval(subIntervalMinutes - 1)}
                  disabled={subIntervalMinutes <= 1}
                  className={controlButtonStyle} aria-label="Decrease interval">
                  -
                </button>
                <span className={controlValueStyle}>{subIntervalMinutes}</span>
                <button
                  onClick={() => onSetSubInterval(subIntervalMinutes + 1)}
                  className={controlButtonStyle} aria-label="Increase interval">
                  +
                </button>
              </div>
            )}
            
            {/* Primary Action Button - Remove pulsingClass */}
            <div className="flex justify-center">
              <button 
                onClick={handleConfirmSubClick} 
                className={`${primaryActionStyle} w-full`}
              >
                {t('timerOverlay.confirmSubButton', 'Vaihto tehty')}
              </button>
            </div>
            
            {/* Goal Buttons - Side by side layout */}
            <div className="flex gap-2 pt-1">
              <button 
                onClick={onToggleGoalLogModal} 
                className={`${secondaryActionStyle} flex-1`}
                title={`${teamName} maali`}
              >
                {t('timerOverlay.teamGoalButton', 'Kirjaa maali')}
              </button>
              <button 
                onClick={onRecordOpponentGoal} 
                className={`${dangerActionStyle} flex-1`}
                title={`${opponentName} maali`}
              >
                {t('timerOverlay.opponentGoalButton', 'Vastustaja +1')}
              </button>
            </div>
          </div>
        </div>

        {/* Play Time History - only show if there are entries */}
        {completedIntervalDurations.length > 0 && (
          <div className="bg-slate-800/60 backdrop-blur-sm p-3 rounded-lg w-full max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700/50">
            <h3 className="text-sm font-semibold mb-1 text-center text-slate-300">{t('timerOverlay.historyTitle')}</h3>
            <ul className="list-none text-slate-400 text-sm text-center space-y-1">
              {completedIntervalDurations.map((duration, index) => (
                <li key={index}>{formatTime(duration)}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimerOverlay; 