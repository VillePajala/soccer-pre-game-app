import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SeasonTournamentManagementModal from './SeasonTournamentManagementModal';
import { UseMutationResult } from '@tanstack/react-query';
import { Season, Tournament } from '@/types';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n'; // Your i18n instance

const mockMutation = () => ({
  mutate: jest.fn(),
  isPending: false,
});

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  seasons: [{ id: 's1', name: 'Season 1' }],
  tournaments: [{ id: 't1', name: 'Tournament 1' }],
  addSeasonMutation: mockMutation() as unknown as UseMutationResult<Season | null, Error, { name: string; }>,
  addTournamentMutation: mockMutation() as unknown as UseMutationResult<Tournament | null, Error, { name: string; }>,
  updateSeasonMutation: mockMutation() as unknown as UseMutationResult<Season | null, Error, { id: string; name: string; }>,
  deleteSeasonMutation: mockMutation() as unknown as UseMutationResult<boolean, Error, string>,
  updateTournamentMutation: mockMutation() as unknown as UseMutationResult<Tournament | null, Error, { id: string; name: string; }>,
  deleteTournamentMutation: mockMutation() as unknown as UseMutationResult<boolean, Error, string>,
};

const renderWithProviders = (props: Partial<typeof defaultProps> = {}) => {
  return render(
    <I18nextProvider i18n={i18n}>
      <SeasonTournamentManagementModal {...defaultProps} {...props} />
    </I18nextProvider>
  );
};

describe('SeasonTournamentManagementModal', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('renders seasons and tournaments lists', () => {
    renderWithProviders();
    expect(screen.getByText('Season 1')).toBeInTheDocument();
    expect(screen.getByText('Tournament 1')).toBeInTheDocument();
  });

  it('allows creating a new season', async () => {
    const user = userEvent.setup();
    renderWithProviders();

    const createSeasonButton = screen.getByTestId('create-season-button');
    await user.click(createSeasonButton);

    const input = screen.getByPlaceholderText(i18n.t('seasonTournamentModal.newSeasonPlaceholder'));
    await user.type(input, 'New Amazing Season');

    const saveButton = screen.getByTestId('save-new-season-button');
    await user.click(saveButton);

    expect(defaultProps.addSeasonMutation.mutate).toHaveBeenCalledWith({ name: 'New Amazing Season' });
  });

  it('allows creating a new tournament', async () => {
    const user = userEvent.setup();
    renderWithProviders();

    const createTournamentButton = screen.getByTestId('create-tournament-button');
    await user.click(createTournamentButton);

    const input = screen.getByPlaceholderText(i18n.t('seasonTournamentModal.newTournamentPlaceholder'));
    await user.type(input, 'New Awesome Tournament');

    const saveButton = screen.getByTestId('save-new-tournament-button');
    await user.click(saveButton);

    expect(defaultProps.addTournamentMutation.mutate).toHaveBeenCalledWith({ name: 'New Awesome Tournament' });
  });

  it('allows editing a season', async () => {
    const user = userEvent.setup();
    renderWithProviders();
    
    const editButton = screen.getByRole('button', { name: 'Edit Season 1' });
    await user.click(editButton);

    const input = screen.getByDisplayValue('Season 1');
    await user.clear(input);
    await user.type(input, 'Updated Season Name');

    const saveButton = screen.getByRole('button', { name: 'Save Season 1' });
    await user.click(saveButton);

    expect(defaultProps.updateSeasonMutation.mutate).toHaveBeenCalledWith({ id: 's1', name: 'Updated Season Name' });
  });

  it('allows editing a tournament', async () => {
    const user = userEvent.setup();
    renderWithProviders();
    
    const editButton = screen.getByRole('button', { name: 'Edit Tournament 1' });
    await user.click(editButton);

    const input = screen.getByDisplayValue('Tournament 1');
    await user.clear(input);
    await user.type(input, 'Updated Tournament Name');

    const saveButton = screen.getByRole('button', { name: 'Save Tournament 1' });
    await user.click(saveButton);

    expect(defaultProps.updateTournamentMutation.mutate).toHaveBeenCalledWith({ id: 't1', name: 'Updated Tournament Name' });
  });

  it('allows deleting a season', async () => {
    window.confirm = jest.fn(() => true); // Mock window.confirm
    const user = userEvent.setup();
    renderWithProviders();

    const deleteButton = screen.getByRole('button', { name: 'Delete Season 1' });
    await user.click(deleteButton);

    expect(window.confirm).toHaveBeenCalled();
    expect(defaultProps.deleteSeasonMutation.mutate).toHaveBeenCalledWith('s1');
  });

  it('allows deleting a tournament', async () => {
    window.confirm = jest.fn(() => true); // Mock window.confirm
    const user = userEvent.setup();
    renderWithProviders();

    const deleteButton = screen.getByRole('button', { name: 'Delete Tournament 1' });
    await user.click(deleteButton);

    expect(window.confirm).toHaveBeenCalled();
    expect(defaultProps.deleteTournamentMutation.mutate).toHaveBeenCalledWith('t1');
  });
}); 