import React from 'react';
import SoccerField from '@/components/SoccerField';
import PlayerBar from '@/components/PlayerBar';
import ControlBar from '@/components/ControlBar';

export default function Home() {
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Top Player Bar */}
      <PlayerBar />

      {/* Main Field Area */}
      <div className="flex-grow bg-green-600 p-4 flex items-center justify-center">
        {/* <p className="text-white text-2xl">Soccer Field Area (Canvas goes here)</p> */}
        {/* Placeholder for SoccerField component */}
        <SoccerField />
      </div>

      {/* Bottom Control Bar */}
      <ControlBar />
    </div>
  );
}
