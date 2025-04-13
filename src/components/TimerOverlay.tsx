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
  teamName: string;
  opponentName: string;
  homeScore: number;
  awayScore: number;
  lastSubConfirmationTimeSeconds: number;
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
  teamName = "Team",
  opponentName = "Opponent",
  homeScore = 0,
  awayScore = 0,
  lastSubConfirmationTimeSeconds = 0,
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

  const handleConfirmSubClick = () => {
    onSubstitutionMade();
  };

  // Calculate time since last substitution
  const timeSinceLastSub = lastSubConfirmationTimeSeconds === 0 
    ? timeElapsedInSeconds 
    : timeElapsedInSeconds - lastSubConfirmationTimeSeconds;

  return (
    <div className={`fixed inset-0 z-40 flex flex-col items-center p-4 pt-24 ${bgColor} backdrop-blur-lg transition-colors duration-500`}>
      <div className="w-full max-w-lg flex flex-col items-center">
        {/* Timer Display */}
        <div className="mb-1">
          <span className={`text-7xl sm:text-8xl font-bold tabular-nums ${textColor}`}>
            {formatTime(timeElapsedInSeconds)}
          </span>
        </div>
        
        {/* Time Since Last Substitution */}
        <div className="mb-3 flex flex-col items-center">
          <span className="text-xs text-slate-400">{t('timerOverlay.timeSinceLastSub', 'Time since last substitution')}</span>
          <span className="text-lg font-semibold tabular-nums text-slate-300">
            {formatTime(timeSinceLastSub)}
          </span>
        </div>

        {/* Game Score Display */}
        <div className="mb-4 bg-slate-800/70 px-5 py-2 rounded-lg">
          <div className="flex items-center justify-center gap-3 text-xl font-semibold">
            <span className="text-slate-100">{teamName}</span>
            <span className={`text-2xl font-bold ${homeScore > awayScore ? 'text-green-400' : 'text-slate-100'}`}>{homeScore}</span>
            <span className="text-slate-500">-</span>
            <span className={`text-2xl font-bold ${awayScore > homeScore ? 'text-red-400' : 'text-slate-100'}`}>{awayScore}</span>
            <span className="text-slate-100">{opponentName}</span>
          </div>
          {/* Match status indicator */}
          <div className="text-center mt-1">
            {homeScore > awayScore ? (
              <div className="text-sm font-medium text-green-400">
                {t('gameStatsModal.winning', 'Winning')} (+{homeScore - awayScore})
              </div>
            ) : homeScore < awayScore ? (
              <div className="text-sm font-medium text-red-400">
                {t('gameStatsModal.losing', 'Losing')} (-{awayScore - homeScore})
              </div>
            ) : (
              <div className="text-sm font-medium text-yellow-400">
                {t('gameStatsModal.draw', 'Draw')}
              </div>
            )}
          </div>
        </div>

        {/* Timer Controls */}
        <div className="flex items-center space-x-3 mb-6">
          <button 
            onClick={onStartPauseTimer} 
            className={`${timerButtonStyle} ${isTimerRunning ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-400' : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'}`}
          >
            {isTimerRunning ? <FaPause size={16}/> : <FaPlay size={16}/>} 
            <span>{isTimerRunning ? "Pause" : "Start"}</span>
          </button>
          <button 
            onClick={onResetTimer}
            className={`${timerButtonStyle} bg-slate-600 hover:bg-slate-700 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed`}
            disabled={timeElapsedInSeconds === 0 && !isTimerRunning}
          >
            <FaUndo size={14}/>
            <span>Reset</span>
          </button>
        </div>
        
        {/* Interval Controls - directly below timer controls */}
        <div className="bg-slate-800/80 backdrop-blur-sm p-3 rounded-lg w-full mb-4">
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-center">
              <span className="text-sm font-medium text-slate-300 mr-2">{t('timerOverlay.intervalLabel')}</span>
              <button
                onClick={() => onSetSubInterval(subIntervalMinutes - 1)}
                disabled={subIntervalMinutes <= 1}
                className="text-slate-100 font-bold py-1 px-3 rounded shadow bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-xl active:scale-95"
                aria-label="Decrease interval"
              >
                -
              </button>
              <span className="text-slate-100 font-bold text-xl tabular-nums w-8 mx-2 text-center">
                {subIntervalMinutes}
              </span>
              <button
                onClick={() => onSetSubInterval(subIntervalMinutes + 1)}
                className="text-slate-100 font-bold py-1 px-3 rounded shadow bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-xl active:scale-95"
                aria-label="Increase interval"
              >
                +
              </button>
            </div>
            <div className="flex justify-center">
              <button 
                onClick={handleConfirmSubClick} 
                className="text-slate-100 font-bold py-2 px-6 rounded-lg shadow-lg bg-indigo-600 hover:bg-indigo-700 pointer-events-auto text-base active:scale-95 w-full sm:w-auto"
              >
                {t('timerOverlay.confirmSubButton', 'Vaihto tehty')}
              </button>
            </div>
            <div className="flex justify-center pt-2"> 
              <button 
                onClick={onToggleGoalLogModal} 
                className="text-slate-200 font-medium py-2 px-6 rounded-lg shadow-md bg-teal-700 hover:bg-teal-600 pointer-events-auto text-base active:scale-95 w-full sm:w-auto"
              >
                {t('timerOverlay.logGoalButton', 'Log Goal')}
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