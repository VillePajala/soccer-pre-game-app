'use client'; // Need this for client-side interactions like canvas

import React, { useRef, useEffect } from 'react';

const SoccerField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Basic setup: Clear canvas and set background (optional)
    // We might draw the field lines here later
    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      context.fillStyle = 'green'; // Example field color
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    // TODO: Add drawing logic for field lines, players, and user drawings

  }, []); // Empty dependency array ensures this runs once on mount

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full bg-green-700" // Use Tailwind for initial background
    />
  );
};

export default SoccerField; 