import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { SeasonsMigration } from './SeasonsMigration';

// Import the actual modules that are being mocked
import { getSeasons as getLocalSeasonsOriginal } from '@/utils/seasons';
import { createSupabaseSeason as createSupabaseSeasonOriginal } from '@/utils/supabase/seasons';
import { removeLocalStorageItemAsync as removeLocalStorageItemAsyncOriginal } from '@/utils/localStorage';
// import { SEASONS_LIST_KEY as SEASONS_LIST_KEY_ORIGINAL } from '@/config/constants'; // Unused

// Mock dependencies
jest.mock('@/utils/seasons', () => ({
  __esModule: true,
  getSeasons: jest.fn(), 
}));
jest.mock('@/utils/supabase/seasons', () => ({
  __esModule: true,
  createSupabaseSeason: jest.fn(),
}));
jest.mock('@/utils/localStorage', () => ({
  __esModule: true,
  removeLocalStorageItemAsync: jest.fn(),
}));

const SEASONS_LIST_KEY_CONFIG = 'mock_seasons_list_key';
jest.mock('@/config/constants', () => ({
  __esModule: true,
  SEASONS_LIST_KEY: SEASONS_LIST_KEY_CONFIG,
}));

// Cast the imported mocks to jest.Mock
const getLocalSeasonsMock = getLocalSeasonsOriginal as jest.Mock;
const createSupabaseSeasonMock = createSupabaseSeasonOriginal as jest.Mock;
const removeLocalStorageItemAsyncMock = removeLocalStorageItemAsyncOriginal as jest.Mock;

describe('SeasonsMigration Component', () => {
  const mockUserId = 'test-user-supabase-uuid-456';
  const mockOnComplete = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display migrating status and progress, then complete if local seasons exist', async () => {
    const mockLocalSeasons = [
      { id: 's1', name: 'Spring 2024' },
      { id: 's2', name: 'Summer 2024' },
    ];
    getLocalSeasonsMock.mockResolvedValue(mockLocalSeasons);
    createSupabaseSeasonMock.mockResolvedValue({ id: 'new-supa-id', name: 'Migrated Season' }); 
    removeLocalStorageItemAsyncMock.mockResolvedValue(undefined);

    render(
      <SeasonsMigration
        userId={mockUserId}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    );

    expect(screen.getByText('Migrating Seasons...')).toBeInTheDocument();
    expect(screen.getByText('Progress: 0 / 2')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Progress: 1 / 2')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('Progress: 2 / 2')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Seasons migrated successfully!')).toBeInTheDocument();
    });

    expect(createSupabaseSeasonMock).toHaveBeenCalledTimes(2);
    expect(createSupabaseSeasonMock).toHaveBeenCalledWith({ name: 'Spring 2024' });
    expect(createSupabaseSeasonMock).toHaveBeenCalledWith({ name: 'Summer 2024' });
    expect(removeLocalStorageItemAsyncMock).toHaveBeenCalledTimes(1);
    expect(removeLocalStorageItemAsyncMock).toHaveBeenCalledWith(SEASONS_LIST_KEY_CONFIG);
    expect(mockOnComplete).toHaveBeenCalledTimes(1);
    expect(mockOnError).not.toHaveBeenCalled();
  });

  it('should complete immediately if no local seasons are found', async () => {
    getLocalSeasonsMock.mockResolvedValue([]);
    removeLocalStorageItemAsyncMock.mockResolvedValue(undefined);

    render(
      <SeasonsMigration
        userId={mockUserId}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    );

    await waitFor(() => {
        expect(screen.getByText('Seasons migrated successfully!')).toBeInTheDocument();
    });
    
    expect(createSupabaseSeasonMock).not.toHaveBeenCalled();
    expect(removeLocalStorageItemAsyncMock).not.toHaveBeenCalled();
    expect(mockOnComplete).toHaveBeenCalledTimes(1);
    expect(mockOnError).not.toHaveBeenCalled();
  });

  it('should call onError and display error if getLocalSeasons fails', async () => {
    const migrationError = new Error('Failed to get local seasons');
    getLocalSeasonsMock.mockRejectedValue(migrationError);

    render(
      <SeasonsMigration
        userId={mockUserId}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(`Error migrating seasons: ${migrationError.message}`)).toBeInTheDocument();
    });

    expect(mockOnError).toHaveBeenCalledWith(migrationError);
    expect(mockOnComplete).not.toHaveBeenCalled();
  });
  
  it('should display error and call onError if userId is not provided', async () => {
    render(
      <SeasonsMigration
        userId="" // Empty userId
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Error migrating seasons: Migration cannot start without a valid user ID.')).toBeInTheDocument();
    });
    expect(mockOnError).toHaveBeenCalledWith(new Error("Migration cannot start without a valid user ID."));
    expect(mockOnComplete).not.toHaveBeenCalled();
  });

  it('should continue migrating other seasons and log errors if one createSupabaseSeason call fails', async () => {
    const mockLocalSeasons = [
      { id: 's1', name: 'Good Season' },
      { id: 's2', name: 'Bad Season (fails)' },
      { id: 's3', name: 'Another Good Season' },
    ];
    getLocalSeasonsMock.mockResolvedValue(mockLocalSeasons);
    
    const individualError = new Error('Failed to save Bad Season');
    createSupabaseSeasonMock
      .mockResolvedValueOnce({ id: 'gs1', name: 'Good Season' })
      .mockRejectedValueOnce(individualError)
      .mockResolvedValueOnce({ id: 'gs3', name: 'Another Good Season' });
      
    removeLocalStorageItemAsyncMock.mockResolvedValue(undefined);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <SeasonsMigration
        userId={mockUserId}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Progress: 3 / 3')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('Seasons migrated successfully!')).toBeInTheDocument();
    });

    expect(createSupabaseSeasonMock).toHaveBeenCalledTimes(3);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to migrate season "Bad Season (fails)":', individualError);
    expect(removeLocalStorageItemAsyncMock).toHaveBeenCalledTimes(1);
    expect(mockOnComplete).toHaveBeenCalledTimes(1);
    expect(mockOnError).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  // This test simulates the more accurate current behavior of createSupabaseSeason, 
  // where it throws an auth error because getCurrentSupabaseUserId in seasons.ts returns null.
  it('should log errors and complete if createSupabaseSeason consistently throws auth error', async () => {
    const mockLocalSeasons = [{ id: 's1', name: 'Test Season' }];
    getLocalSeasonsMock.mockResolvedValue(mockLocalSeasons);
    const authError = new Error("User not authenticated or Supabase user ID not found for creating season.");
    createSupabaseSeasonMock.mockRejectedValue(authError);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <SeasonsMigration
        userId={mockUserId}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Seasons migrated successfully!')).toBeInTheDocument();
    }, { timeout: 2000 }); // Increased timeout for slower operations

    expect(mockOnComplete).toHaveBeenCalledTimes(1);
    expect(createSupabaseSeasonMock).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to migrate season "Test Season":', authError);
    expect(mockOnError).not.toHaveBeenCalled(); 
    consoleErrorSpy.mockRestore();
  });

}); 