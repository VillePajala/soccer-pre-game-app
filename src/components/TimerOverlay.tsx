'use client';

import React from 'react';

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
}) => {
  // Determine text color based on alert status
  let timerTextColor = 'text-slate-100'; // Base text color
  if (subAlertLevel === 'due') {
    timerTextColor = 'text-red-500';
  } else if (subAlertLevel === 'warning') {
    timerTextColor = 'text-orange-400';
  }

  // Button styles
  const subButtonStyle = "mt-6 text-slate-100 font-bold py-4 px-8 rounded-lg shadow-lg bg-indigo-600 hover:bg-indigo-700 pointer-events-auto text-xl active:scale-95 active:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-black focus:ring-offset-opacity-75"; // Indigo primary, focus ring, added active:brightness-90
  const smallIntervalButtonStyle = "text-slate-100 font-bold py-2 px-4 rounded shadow bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed pointer-events-auto text-2xl active:scale-95 active:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 focus:ring-offset-black focus:ring-offset-opacity-75"; // Slate secondary, focus ring, added active:brightness-90
  const controlButtonStyle = "text-slate-100 font-bold py-3 px-6 rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed pointer-events-auto text-lg active:scale-95 active:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-offset-opacity-75"; // Base for controls, added focus, added active:brightness-90

  return (
    <div 
      className="absolute inset-0 flex flex-col items-center z-50 pointer-events-none overflow-y-auto pb-8" // Outer container scrolls, REMOVED backdrop-blur-lg
    >
        {/* Inner Container - Grow, sharp corners, full width */}
        <div 
          className="flex-grow bg-slate-900/75 backdrop-blur-sm p-10 shadow-2xl flex flex-col items-center pointer-events-auto border border-slate-600/50 w-full" // Kept flex-grow, REMOVED rounded-xl, REMOVED max-w-lg, kept p-10
        >
          <span className={`${timerTextColor} font-bold text-8xl tabular-nums mb-4`}>
            {formatTime(timeElapsedInSeconds)}
          </span>

          {/* Timer Controls added to Overlay */}
          <div className="flex items-center space-x-6 mt-2 pointer-events-auto">
            <button
              onClick={onStartPauseTimer}
              className={`${controlButtonStyle} ${isTimerRunning ? 'bg-orange-500 hover:bg-orange-600 focus:ring-orange-400' : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'}`}
            >
              {isTimerRunning ? 'Pause' : 'Start'}
            </button>
            <button
              onClick={onResetTimer}
              disabled={timeElapsedInSeconds === 0 && !isTimerRunning}
              className={`${controlButtonStyle} bg-slate-700 hover:bg-slate-600 focus:ring-slate-500`}
            >
              Reset
            </button>
          </div>

          {/* "Sub Made" button */}
          <button
            onClick={onSubstitutionMade}
            className={subButtonStyle}
          >
            SUBSTITUTION MADE
          </button>

          {/* Sub Interval Controls */}
          <div className="flex items-center space-x-4 mt-6 pointer-events-auto">
            <span className="text-slate-300 font-medium text-lg mr-2">Interval:</span> {/* Lighter, medium weight */}
            <button
              onClick={() => onSetSubInterval(subIntervalMinutes - 1)}
              disabled={subIntervalMinutes <= 1} 
              className={smallIntervalButtonStyle}
            >
              -
            </button>
            <span className="text-slate-100 font-bold text-3xl tabular-nums w-12 text-center">
              {subIntervalMinutes}
            </span>
            <button
              onClick={() => onSetSubInterval(subIntervalMinutes + 1)}
              className={smallIntervalButtonStyle}
            >
              +
            </button>
            <span className="text-slate-300 font-medium text-lg ml-1">min</span> {/* Lighter, medium weight */}
          </div>

          {/* Display Completed Interval Durations Horizontally */}
          {completedIntervalDurations.length > 0 && (
            <div className="flex flex-wrap justify-center mt-6 w-full">
              {completedIntervalDurations.map((duration, index) => (
                <span 
                  key={index} 
                  className="text-slate-300 text-sm font-mono tabular-nums mx-2 my-1 bg-slate-800/50 px-2 py-1 rounded"
                >
                  {formatTime(duration)}
                </span>
              ))}
            </div>
          )}
        </div>
    </div>
  );
};

export default TimerOverlay; 