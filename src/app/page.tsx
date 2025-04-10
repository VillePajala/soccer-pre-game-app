import React from 'react';
import SoccerField from '@/components/SoccerField';

export default function Home() {
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Top Player Bar */}
      <div className="bg-blue-200 p-4 h-20 flex-shrink-0 overflow-x-auto whitespace-nowrap">
        <p className="text-center font-semibold">Player Bar (Scrollable)</p>
        {/* Placeholder for PlayerDisk components */}
      </div>

      {/* Main Field Area */}
      <div className="flex-grow bg-green-600 p-4 flex items-center justify-center">
        {/* <p className="text-white text-2xl">Soccer Field Area (Canvas goes here)</p> */}
        {/* Placeholder for SoccerField component */}
        <SoccerField />
      </div>

      {/* Bottom Control Bar */}
      <div className="bg-gray-300 p-4 h-16 flex-shrink-0 flex items-center justify-center space-x-4">
        <p className="font-semibold">Control Bar</p>
        {/* Placeholder for Control buttons */}
      </div>
    </div>
  );
}
