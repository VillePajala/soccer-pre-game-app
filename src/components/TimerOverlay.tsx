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
  let timerTextColor = 'text-white';
  if (subAlertLevel === 'due') {
    timerTextColor = 'text-red-500';
  } else if (subAlertLevel === 'warning') {
    timerTextColor = 'text-orange-400'; // Use orange for warning
  }

  // Button styles - make it reasonably large
  const subButtonStyle = "mt-6 text-white font-bold py-4 px-8 rounded-lg shadow-lg bg-blue-600 hover:bg-blue-700 pointer-events-auto text-xl"; // Bigger padding, font, rounded
  const smallIntervalButtonStyle = "text-white font-bold py-2 px-4 rounded shadow bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed pointer-events-auto text-2xl"; // Bigger padding, font
  const controlButtonStyle = "text-white font-bold py-3 px-6 rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed pointer-events-auto text-lg"; // Bigger padding, font, rounded

  return (
    <div 
      className="absolute inset-0 z-50 pointer-events-none p-4" 
      // Outer container - no flex centering here
    >
      {/* Centering wrapper for the main panel */}
      <div className="flex items-center justify-center h-full">
          {/* Main Content Block */}
          <div 
            className="bg-black bg-opacity-70 p-10 rounded-xl shadow-2xl flex flex-col items-center pointer-events-auto" 
            // Panel containing timer, buttons, interval controls
          >
            <span className={`${timerTextColor} font-bold text-9xl tabular-nums mb-4`}>
              {formatTime(timeElapsedInSeconds)}
            </span>

            {/* Timer Controls added to Overlay */}
            <div className="flex items-center space-x-6 mt-2 pointer-events-auto">
              {/* Start/Pause Button */}
              <button
                onClick={onStartPauseTimer}
                className={`${controlButtonStyle} ${isTimerRunning ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'}`}
              >
                {isTimerRunning ? 'Pause' : 'Start'}
              </button>
              {/* Reset Button */}
              <button
                onClick={onResetTimer}
                disabled={timeElapsedInSeconds === 0 && !isTimerRunning}
                className={`${controlButtonStyle} bg-gray-500 hover:bg-gray-600`}
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
              <span className="text-white text-lg mr-2">Interval:</span>
              <button
                onClick={() => onSetSubInterval(subIntervalMinutes - 1)}
                disabled={subIntervalMinutes <= 1} 
                className={smallIntervalButtonStyle}
              >
                -
              </button>
              <span className="text-white font-bold text-3xl tabular-nums w-12 text-center">
                {subIntervalMinutes}
              </span>
              <button
                onClick={() => onSetSubInterval(subIntervalMinutes + 1)}
                className={smallIntervalButtonStyle}
              >
                +
              </button>
              <span className="text-white text-lg ml-1">min</span>
            </div>
          </div>
      </div>

      {/* Display Completed Interval Durations - Positioned independently at bottom center */}
      {completedIntervalDurations.length > 0 && (
          <div 
            className="absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 p-4 rounded-lg pointer-events-auto w-64 shadow-lg max-h-64 overflow-y-auto" 
            // Positioned bottom-center, allows pointer events. Changed bottom-8 to bottom-16.
            // Increased max-h to 64, REMOVED scrollbar styling classes.
          >
              <h4 className="text-white text-lg font-semibold mb-2 text-center">Lineup Durations:</h4>
              <ul className="text-white text-base text-center space-y-1">
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