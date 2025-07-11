import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlayerAssessmentCard from './PlayerAssessmentCard';
import type { Player } from '@/types';

describe('PlayerAssessmentCard', () => {
  const player: Player = { id: 'p1', name: 'Test', jerseyNumber: '9' };

  it('renders player name', () => {
    render(<PlayerAssessmentCard player={player} onSave={jest.fn()} />);
    expect(screen.getByText('Test #9')).toBeInTheDocument();
  });

  it('calls onSave with assessment', () => {
    const onSave = jest.fn();
    render(<PlayerAssessmentCard player={player} onSave={onSave} />);
    fireEvent.click(screen.getByText('Test #9'));
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    expect(onSave).toHaveBeenCalled();
  });
});
