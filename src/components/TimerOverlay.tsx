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
      className="absolute inset-0 flex flex-col items-center justify-center z-50 pointer-events-none p-4 backdrop-blur-lg" // Increased blur further
    >
      {/* Main Content Block */}
      <div 
        className="bg-slate-900/75 backdrop-blur-sm p-10 rounded-xl shadow-2xl flex flex-col items-center pointer-events-auto border border-slate-600/50" // Adjusted background/opacity, border color/opacity
      >
        <span className={`${timerTextColor} font-bold text-9xl tabular-nums mb-4`}>
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
      </div>

      {/* Display Completed Interval Durations */}
      {completedIntervalDurations.length > 0 && (
          <div 
            className="absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-slate-900/75 backdrop-blur-sm p-4 rounded-lg pointer-events-auto w-64 shadow-lg max-h-64 overflow-y-auto border border-slate-600/50" // Adjusted background/opacity, border color/opacity
          >
              <h4 className="text-slate-200 font-semibold mb-2 text-center text-base">Lineup Durations:</h4> {/* Adjusted text */}
              <ul className="text-slate-300 text-base text-center space-y-1"> {/* Adjusted text */}
                  {completedIntervalDurations.map((duration, index) => (
                      <li key={index}>{formatTime(duration)}</li>
                  ))}
              </ul>
          </div>
      )}
    </div>
  );
};

export default TimerOverlay; 