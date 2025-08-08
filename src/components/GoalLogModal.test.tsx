import React from 'react';
import { render, screen, fireEvent } from '@/__tests__/test-utils';
import '@testing-library/jest-dom';
import GoalLogModal from './GoalLogModal';
import { Player } from '@/types';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n.test';

const players: Player[] = [
  { id: 'p1', name: 'John Doe', nickname: 'John', color: '#fff', isGoalie: false },
  { id: 'p2', name: 'Jane Smith', nickname: 'Jane', color: '#000', isGoalie: false },
];

const renderModal = (props = {}) =>
  render(
    <I18nextProvider i18n={i18n}>
      <GoalLogModal
        isOpen={true}
        onClose={jest.fn()}
        onLogGoal={jest.fn()}
        onLogOpponentGoal={jest.fn()}
        availablePlayers={players}
        currentTime={30}
        {...props}
      />
    </I18nextProvider>
  );

describe('GoalLogModal', () => {
  it('calls onLogGoal with selected scorer', () => {
    const onLogGoal = jest.fn();
    renderModal({ onLogGoal });

    // Use the select by ID since label text is also using i18n keys
    const scorerSelect = document.getElementById('scorerSelect');
    fireEvent.change(scorerSelect!, { target: { value: 'p1' } });
    // Use the i18n key since translations aren't working in test
    fireEvent.click(screen.getByRole('button', { name: 'goalLogModal.logGoalButton' }));

    expect(onLogGoal).toHaveBeenCalledWith('p1', undefined);
  });

  it('calls onLogOpponentGoal with current time', () => {
    const onLogOpponentGoal = jest.fn();
    renderModal({ onLogOpponentGoal });

    // The i18n in tests returns the key, not the translation
    fireEvent.click(screen.getByText('goalLogModal.logOpponentGoalButtonShort'));
    expect(onLogOpponentGoal).toHaveBeenCalledWith(30);
  });
});
