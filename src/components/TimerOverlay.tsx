'use client';

import React from 'react';
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
  lastSubConfirmationTimeSeconds: number;
  // Game Structure props
  numberOfPeriods: 1 | 2;
  periodDurationMinutes: number;
  currentPeriod: number;
  gameStatus: 'notStarted' | 'inProgress' | 'periodEnd' | 'gameEnd';
  onSetNumberOfPeriods: (periods: 1 | 2) => void;
  onSetPeriodDuration: (minutes: number) => void;
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
  lastSubConfirmationTimeSeconds = 0,
  // Game Structure props
  numberOfPeriods = 2,
  periodDurationMinutes = 10,
  currentPeriod = 1,
  gameStatus = 'notStarted',
  onSetNumberOfPeriods = () => { console.warn('onSetNumberOfPeriods handler not provided'); },
  onSetPeriodDuration = () => { console.warn('onSetPeriodDuration handler not provided'); },
}) => {
  const { t } = useTranslation(); // Initialize translation hook

  // Determine text color based on alert status
  let textColor = 'text-slate-100'; // Base text color
  if (subAlertLevel === 'due') {
    textColor = 'text-red-500';
  } else if (subAlertLevel === 'warning') {
    textColor = 'text-orange-400';
  }

  let bgColor = 'bg-slate-900/85'; // Default background
  if (subAlertLevel === 'warning') {
    bgColor = 'bg-orange-800/90';
  } else if (subAlertLevel === 'due') {
    bgColor = 'bg-red-800/90';
  }
  
  // Consistent button styles (simplified for overlay)
  const timerButtonStyle = "text-white font-semibold py-2 px-5 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors duration-150 flex items-center justify-center space-x-2";
  const controlButtonStyle = "text-slate-100 font-bold py-1 px-3 rounded shadow bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-lg active:scale-95";
  const controlValueStyle = "text-slate-100 font-bold text-lg tabular-nums w-8 mx-2 text-center";
  const controlLabelStyle = "text-sm font-medium text-slate-300 mr-2";

  const handleConfirmSubClick = () => {
    onSubstitutionMade();
  };

  // Calculate time since last substitution
  const timeSinceLastSub = lastSubConfirmationTimeSeconds === 0 
    ? timeElapsedInSeconds 
    : timeElapsedInSeconds - lastSubConfirmationTimeSeconds;
    
  // Determine button text based on game status
  let startPauseButtonText = "Start";
  if (gameStatus === 'inProgress') {
    startPauseButtonText = isTimerRunning ? "Pause" : "Resume";
  } else if (gameStatus === 'periodEnd') {
    startPauseButtonText = currentPeriod < numberOfPeriods ? `Start Period ${currentPeriod + 1}` : "Game Over";
  } else if (gameStatus === 'gameEnd') {
    startPauseButtonText = "Game Over";
  }
  
  // Calculate total game time for display
  const totalGameTimeSeconds = numberOfPeriods * periodDurationMinutes * 60;

  return (
    <div className={`fixed inset-0 z-40 flex flex-col items-center p-4 pt-12 ${bgColor} backdrop-blur-lg transition-colors duration-500`}> {/* Reduced top padding */} 
      <div className="w-full max-w-lg flex flex-col items-center">
        {/* Game Score Display - MOVED TO TOP ABOVE TIMER */}
        <div className="bg-slate-800/70 px-5 py-2 rounded-lg mb-4">
          <div className="flex items-center justify-center gap-3 text-xl font-semibold">
            <span className="text-slate-100">{teamName}</span>
            <span className={`text-2xl font-bold ${homeScore > awayScore ? 'text-green-400' : 'text-slate-100'}`}>{homeScore}</span>
            <span className="text-slate-500">-</span>
            <span className={`text-2xl font-bold ${awayScore > homeScore ? 'text-red-400' : 'text-slate-100'}`}>{awayScore}</span>
            <span className="text-slate-100">{opponentName}</span>
          </div> 
        </div>
      
        {/* Timer Display */}
        <div className="mb-4">
          <span className={`text-7xl sm:text-8xl font-bold tabular-nums ${textColor}`}>
            {formatTime(timeElapsedInSeconds)}
          </span>
        </div>
        
        {/* Time Since Last Substitution */}
        <div className="mb-2 flex flex-col items-center">
          <span className="text-xs text-slate-400">{t('timerOverlay.timeSinceLastSub', 'Time since last substitution')}</span>
          <span className="text-lg font-semibold tabular-nums text-slate-300">
            {formatTime(timeSinceLastSub)}
          </span>
        </div>

        {/* Game Status / Period Info */}
        <div className="mb-3 text-center">
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
        <div className="flex items-center space-x-3 mb-4"> 
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
            <span>Reset</span>
          </button>
        </div>
        
        {/* Game Setup & Interval Controls Section */}
        <div className="bg-slate-800/80 backdrop-blur-sm p-3 rounded-lg w-full mb-4 space-y-4">
          {/* Game Structure Controls (only when game not started) */}
          {gameStatus === 'notStarted' && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 items-center border-b border-slate-700 pb-3 mb-3">
              {/* Number of Periods */}
              <div className="flex items-center justify-center">
                <span className={controlLabelStyle}>{t('timerOverlay.numPeriods', 'Periods')}</span>
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
                <span className={controlLabelStyle}>{t('timerOverlay.periodDuration', 'Duration')}</span>
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
          
          {/* Substitution Interval & Action Buttons */}
          <div className="flex flex-col space-y-3">
            {/* ONLY SHOW INTERVAL SETTINGS WHEN GAME NOT STARTED */}
            {gameStatus === 'notStarted' && (
              <div className="flex items-center justify-center">
                <span className={controlLabelStyle}>{t('timerOverlay.intervalLabel', 'Sub Interval')}</span>
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
            
            <div className="flex justify-center">
              <button 
                onClick={handleConfirmSubClick} 
                className="text-slate-100 font-bold py-2 px-6 rounded-lg shadow-lg bg-indigo-600 hover:bg-indigo-700 pointer-events-auto text-base active:scale-95 w-full sm:w-auto"
              >
                {t('timerOverlay.confirmSubButton', 'Vaihto tehty')}
              </button>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button 
                onClick={onToggleGoalLogModal} 
                className="text-slate-200 font-medium py-2 px-4 rounded-lg shadow-md bg-teal-700 hover:bg-teal-600 pointer-events-auto text-base active:scale-95 flex-1"
                title={`${teamName} maali`}
              >
                {t('timerOverlay.teamGoalButton', 'Kirjaa maali')}
              </button>
              <button 
                onClick={onRecordOpponentGoal} 
                className="text-slate-200 font-medium py-2 px-4 rounded-lg shadow-md bg-red-700 hover:bg-red-600 pointer-events-auto text-base active:scale-95 flex-1"
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