import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n.test';
import PlayerAssessmentCard from './PlayerAssessmentCard';
import type { Player } from '@/types';

describe('PlayerAssessmentCard', () => {
  const player: Player = { id: 'p1', name: 'Test', jerseyNumber: '9' };

  it('renders player name', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <PlayerAssessmentCard player={player} onSave={jest.fn()} />
      </I18nextProvider>
    );
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('calls onSave with assessment', () => {
    const onSave = jest.fn();
    render(
      <I18nextProvider i18n={i18n}>
        <PlayerAssessmentCard player={player} onSave={onSave} />
      </I18nextProvider>
    );
    fireEvent.click(screen.getByText('Test'));
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    expect(onSave).toHaveBeenCalled();
  });

  it('loads existing assessment values', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <PlayerAssessmentCard
          player={player}
          onSave={jest.fn()}
          assessment={{
            overall: 7,
            sliders: { intensity: 4, courage: 4, duels: 4, technique: 4, creativity: 4, decisions: 4, awareness: 4, teamwork: 4, fair_play: 4, impact: 4 },
            notes: 'note',
            minutesPlayed: 0,
            createdAt: 0,
            createdBy: 'test',
          }}
        />
      </I18nextProvider>
    );
    fireEvent.click(screen.getByText('Test'));
    expect(screen.getByDisplayValue('note')).toBeInTheDocument();
  });
});
