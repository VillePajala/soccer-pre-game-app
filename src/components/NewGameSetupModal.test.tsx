/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';
import '@testing-library/jest-dom';
import NewGameSetupModal from './NewGameSetupModal';
import { getLastHomeTeamName, saveLastHomeTeamName } from '@/utils/appSettings';
import { getSeasons } from '@/utils/seasons';
import { getTournaments } from '@/utils/tournaments';
import { getMasterRoster } from '@/utils/masterRosterManager';
import type { UseMutationResult } from '@tanstack/react-query';
import type { Season, Tournament, Player } from '@/types';
import { ClerkProvider } from '@clerk/nextjs';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n-test';

// Mocks
jest.mock('@/utils/appSettings');
jest.mock('@/utils/seasons');
jest.mock('@/utils/tournaments');
jest.mock('@/utils/masterRosterManager');
jest.mock('@clerk/nextjs', () => ({
  ...jest.requireActual('@clerk/nextjs'),
  useAuth: () => ({
    getToken: jest.fn().mockResolvedValue('test-token'),
    userId: 'test-user-id',
  }),
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockGetLastHomeTeamName = getLastHomeTeamName as jest.Mock;
const mockSaveLastHomeTeamName = saveLastHomeTeamName as jest.Mock;
const mockGetSeasons = getSeasons as jest.Mock;
const mockGetTournaments = getTournaments as jest.Mock;
const mockGetMasterRoster = getMasterRoster as jest.Mock;

// Helper to render the component with all necessary providers
const renderComponent = (props: any) => {
  render(
    <ClerkProvider>
      <I18nextProvider i18n={i18n}>
        <NewGameSetupModal {...props} />
      </I18nextProvider>
    </ClerkProvider>
  );
};

describe.skip('NewGameSetupModal', () => {
  const mockOnStart = jest.fn();
  const mockOnCancel = jest.fn();

  const mockAddSeasonMutation = { mutateAsync: jest.fn(), isPending: false } as any;
  const mockAddTournamentMutation = { mutateAsync: jest.fn(), isPending: false } as any;
  
  const defaultProps = {
    isOpen: true,
    initialPlayerSelection: ['player1'],
    onStart: mockOnStart,
    onCancel: mockOnCancel,
    addSeasonMutation: mockAddSeasonMutation as UseMutationResult<Season | null, Error, { name: string; clerkToken: string; internalSupabaseUserId: string; }, unknown>,
    addTournamentMutation: mockAddTournamentMutation as UseMutationResult<Tournament | null, Error, { name: string; clerkToken: string; internalSupabaseUserId: string; }, unknown>,
    isAddingSeason: false,
    isAddingTournament: false,
    internalSupabaseUserId: 'test-user-id',
  };

  const mockPlayersData: Player[] = [{ id: 'player1', name: 'John Doe', jerseyNumber: '10', isGoalie: false, notes:'' }];
  const mockSeasonsData: Season[] = [{ id: 'season1', name: 'Spring 2024' }];
  const mockTournamentsData: Tournament[] = [{ id: 'tournament1', name: 'City Cup' }];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLastHomeTeamName.mockResolvedValue('Last Team');
    mockGetMasterRoster.mockResolvedValue(mockPlayersData);
    mockGetSeasons.mockResolvedValue(mockSeasonsData);
    mockGetTournaments.mockResolvedValue(mockTournamentsData);
    mockAddSeasonMutation.mutateAsync.mockImplementation(async ({ name }: { name: string }) => ({ id: `new-${name}`, name }));
    mockAddTournamentMutation.mutateAsync.mockImplementation(async ({ name }: { name: string }) => ({ id: `new-${name}`, name }));
  });

  test('loads initial data and renders form correctly', async () => {
    renderComponent(defaultProps);

    // Wait for a key element that appears after all data is loaded
    const homeTeamInput = await screen.findByLabelText('Your Team Name');

    // Assertions
    expect(homeTeamInput).toHaveValue('Last Team');
    expect(screen.getByText('Spring 2024')).toBeInTheDocument();
    expect(screen.getByText('City Cup')).toBeInTheDocument();
    expect(screen.getByLabelText(/John Doe/)).toBeChecked();

    // Verify mocks were called correctly
    expect(mockGetMasterRoster).toHaveBeenCalledWith('test-token', 'test-user-id');
    expect(mockGetSeasons).toHaveBeenCalledWith('test-token', 'test-user-id');
    expect(mockGetTournaments).toHaveBeenCalledWith('test-token', 'test-user-id');
  });

  test('submits the form with correct data', async () => {
    renderComponent(defaultProps);
    await screen.findByLabelText('Your Team Name'); // Wait for form to load

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Your Team Name'), { target: { value: 'New Dragons' } });
      fireEvent.change(screen.getByTestId('opponent-name-input'), { target: { value: 'Tigers' } });
      fireEvent.click(screen.getByRole('button', { name: 'Confirm & Start Game' }));
    });

    expect(mockSaveLastHomeTeamName).toHaveBeenCalledWith('New Dragons');
    expect(mockOnStart).toHaveBeenCalled();
  });

  test('creates a new season', async () => {
    renderComponent(defaultProps);
    const createButton = await screen.findByTestId('create-new-season-button');

    await act(async () => {
      fireEvent.click(createButton);
    });

    const nameInput = await screen.findByPlaceholderText('Enter new season name...');
    const addButton = screen.getByRole('button', { name: 'Add' });
    
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Winter League' } });
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      expect(mockAddSeasonMutation.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ name: 'Winter League' }));
    });
  });
});