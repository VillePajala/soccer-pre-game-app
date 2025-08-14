import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlayerBar from './PlayerBar';
import { Player } from '@/types';
import { GameEvent } from '@/types';

// Mock next/image since it's used in the component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ComponentProps<'img'>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} src={props.src || ''} alt={props.alt || ''} />;
  },
}));

describe('PlayerBar', () => {
  // Sample player data similar to what masterRoster utility would provide
  const mockPlayers: Player[] = [
    { id: 'player1', name: 'John Doe', nickname: 'John', color: '#FF0000', isGoalie: false },
    { id: 'player2', name: 'Jane Smith', nickname: 'Jane', color: '#00FF00', isGoalie: true },
    { id: 'player3', name: 'Bob Johnson', nickname: 'Bob', color: '#0000FF', isGoalie: false },
  ];

  const mockGameEvents: GameEvent[] = [
    { id: 'goal1', type: 'goal', time: 300, scorerId: 'player1', assisterId: 'player3' },
    { id: 'goal2', type: 'opponentGoal', time: 600 },
  ];

  const defaultProps = {
    players: mockPlayers,
    gameEvents: mockGameEvents,
    onPlayerDragStartFromBar: jest.fn(),
    selectedPlayerIdFromBar: null,
    onBarBackgroundClick: jest.fn(),
    onPlayerTapInBar: jest.fn(),
    onToggleGoalie: jest.fn(),
  };

  it('renders the component with player disks', () => {
    render(<PlayerBar {...defaultProps} />);
    
    // Check if each player's nickname is displayed
    mockPlayers.forEach(player => {
      expect(screen.getByText(player.nickname!)).toBeInTheDocument();
    });
  });

  it('calls onBarBackgroundClick when clicking background', () => {
    render(<PlayerBar {...defaultProps} />);
    
    // Find and click on the background (the main container)
    const background = screen.getByRole('img', { name: /MatchOps Coach Logo/i }).closest('div');
    if (background) {
      fireEvent.click(background);
      expect(defaultProps.onBarBackgroundClick).toHaveBeenCalled();
    }
  });

  it('handles player selection in the bar', () => {
    render(<PlayerBar {...defaultProps} />);
    
    // Find John's player disk and click it
    const johnDisk = screen.getByText('John').closest('div');
    if (johnDisk) {
      fireEvent.mouseDown(johnDisk);
      expect(defaultProps.onPlayerTapInBar).toHaveBeenCalledWith(expect.objectContaining({
        id: 'player1',
        name: 'John Doe',
      }));
    }
  });

  it('indicates goalies correctly', () => {
    render(<PlayerBar {...defaultProps} />);
    
    // The goalie (Jane) should have a different visual indicator (background color)
    const janeDisk = screen.getByText('Jane').closest('div');
    expect(janeDisk).toBeInTheDocument();
    expect(janeDisk).toHaveStyle('background-color: #F97316'); // Goalie color from PlayerDisk.tsx

    // Optionally, check a non-goalie's color
    const johnDisk = screen.getByText('John').closest('div');
    expect(johnDisk).toBeInTheDocument();
    // John's color is #FF0000 (red)
    expect(johnDisk).toHaveStyle('background-color: #FF0000'); 
  });
}); 