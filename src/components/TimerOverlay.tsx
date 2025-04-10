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
}

const TimerOverlay: React.FC<TimerOverlayProps> = ({
  timeElapsedInSeconds,
}) => {
  return (
    <div 
      className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
      // This div covers the whole viewport area defined by its nearest positioned ancestor
      // which should be the div containing the SoccerField
    >
      <div 
        className="bg-black bg-opacity-60 p-6 rounded-lg shadow-xl"
        // Semi-transparent background panel
      >
        <span className="text-white font-bold text-7xl tabular-nums">
          {/* Large timer text */}
          {formatTime(timeElapsedInSeconds)}
        </span>
      </div>
    </div>
  );
};

export default TimerOverlay; 