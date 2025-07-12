import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlayerAssessmentModal from './PlayerAssessmentModal';
import type { Player } from '@/types';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_k: string, fb?: string) => fb || _k,
  }),
}));

const players: Player[] = [
  { id: 'p1', name: 'Player One', jerseyNumber: '10' },
  { id: 'p2', name: 'Player Two', jerseyNumber: '20' },
];

const renderModal = (props = {}) =>
  render(
    <PlayerAssessmentModal
      isOpen={true}
      onClose={() => {}}
      selectedPlayerIds={['p1']}
      availablePlayers={players}
      assessments={{}}
      onSave={jest.fn()}
      {...props}
    />
  );

describe('PlayerAssessmentModal', () => {
  it('renders selected player', () => {
    renderModal();
    expect(screen.getByText('Player One #10')).toBeInTheDocument();
  });

  it('calls onSave when save button clicked', () => {
    const onSave = jest.fn();
    renderModal({ onSave });
    fireEvent.click(screen.getByText('Player One #10'));
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    expect(onSave).toHaveBeenCalled();
  });

  it('shows checkmark for saved players', () => {
    const { container } = renderModal({
      assessments: {
        p1: {
          overall: 5,
          sliders: { intensity: 3, courage: 3, duels: 3, technique: 3, creativity: 3, decisions: 3, awareness: 3, teamwork: 3, fair_play: 3, impact: 3 },
          notes: '',
          minutesPlayed: 0,
          createdAt: 0,
          createdBy: 'test',
        },
      },
    });
    expect(container.querySelector('.text-indigo-400')).toBeInTheDocument();
  });
});
