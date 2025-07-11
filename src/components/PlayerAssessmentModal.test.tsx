import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import PlayerAssessmentModal from './PlayerAssessmentModal';
import type { Player } from '@/types';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_k: string, fallback?: string) => fallback || _k,
  }),
}));

const players: Player[] = [
  { id: 'p1', name: 'Alice', jerseyNumber: '10' },
  { id: 'p2', name: 'Bob', jerseyNumber: '7' },
];

describe('PlayerAssessmentModal', () => {
  test('renders player names when open', () => {
    render(
      <PlayerAssessmentModal
        isOpen={true}
        onClose={jest.fn()}
        players={players}
        onSaveAssessment={jest.fn()}
      />,
    );
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
  });

  test('calls onSaveAssessment when Save clicked', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    render(
      <PlayerAssessmentModal
        isOpen={true}
        onClose={jest.fn()}
        players={players}
        onSaveAssessment={onSave}
      />,
    );
    // Expand first card
    const card = screen.getByText(/Alice/).closest('div');
    if (card) {
      await user.click(card);
    }
    const ratingBtn = await screen.findByRole('button', { name: '5' });
    await user.click(ratingBtn);
    const saveBtn = await screen.findByRole('button', { name: /Save/i });
    await user.click(saveBtn);
    expect(onSave).toHaveBeenCalledWith('p1', expect.any(Object));
  });
});

