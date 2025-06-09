import { getSupabaseClient } from '@/lib/supabase';
import {
  getTournaments,
  addTournament,
  updateTournament,
  deleteTournament,
} from './tournaments';
import {
  getSupabaseTournaments,
  createSupabaseTournament,
  updateSupabaseTournament,
  deleteSupabaseTournament,
} from './supabase/tournaments';
import { Tournament } from '@/types';

// Mock the Supabase client and the Supabase service functions
jest.mock('@/lib/supabase');
jest.mock('./supabase/tournaments');

const mockGetSupabaseClient = getSupabaseClient as jest.Mock;
const mockGetSupabaseTournaments = getSupabaseTournaments as jest.Mock;
const mockCreateSupabaseTournament = createSupabaseTournament as jest.Mock;
const mockUpdateSupabaseTournament = updateSupabaseTournament as jest.Mock;
const mockDeleteSupabaseTournament = deleteSupabaseTournament as jest.Mock;

describe('Tournaments Utility', () => {
  const mockClerkToken = 'test-clerk-token';
  const mockInternalSupabaseUserId = 'test-user-id';
  const mockSupabaseClient = {}; // Mock client object

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSupabaseClient.mockResolvedValue(mockSupabaseClient);
  });

  // Test getTournaments
  describe('getTournaments', () => {
    it('should call the Supabase service to get tournaments', async () => {
      const mockTournaments: Tournament[] = [{ id: 't1', name: 'Test Tournament' }];
      mockGetSupabaseTournaments.mockResolvedValue(mockTournaments);

      const result = await getTournaments(mockClerkToken, mockInternalSupabaseUserId);

      expect(mockGetSupabaseClient).toHaveBeenCalledWith(mockClerkToken);
      expect(mockGetSupabaseTournaments).toHaveBeenCalledWith(mockSupabaseClient, mockInternalSupabaseUserId);
      expect(result).toEqual(mockTournaments);
    });

    it('should throw an error if token is missing', async () => {
      await expect(getTournaments('', mockInternalSupabaseUserId)).rejects.toThrow('Clerk token is required.');
    });
  });

  // Test addTournament
  describe('addTournament', () => {
    it('should call the Supabase service to create a tournament', async () => {
      const newTournamentData = { name: 'New Tournament' };
      const createdTournament = { id: 't2', ...newTournamentData };
      mockCreateSupabaseTournament.mockResolvedValue(createdTournament);

      const result = await addTournament(mockClerkToken, mockInternalSupabaseUserId, newTournamentData);

      expect(mockCreateSupabaseTournament).toHaveBeenCalledWith(mockSupabaseClient, mockInternalSupabaseUserId, newTournamentData);
      expect(result).toEqual(createdTournament);
    });

    it('should return null if creation fails', async () => {
      mockCreateSupabaseTournament.mockRejectedValue(new Error('DB error'));
      const result = await addTournament(mockClerkToken, mockInternalSupabaseUserId, { name: 'Fail Tournament' });
      expect(result).toBeNull();
    });
  });

  // Test updateTournament
  describe('updateTournament', () => {
    it('should call the Supabase service to update a tournament', async () => {
      const tournamentToUpdate: Tournament = { id: 't1', name: 'Updated Name' };
      mockUpdateSupabaseTournament.mockResolvedValue(tournamentToUpdate);

      const result = await updateTournament(mockClerkToken, mockInternalSupabaseUserId, tournamentToUpdate);

      expect(mockUpdateSupabaseTournament).toHaveBeenCalledWith(mockSupabaseClient, mockInternalSupabaseUserId, tournamentToUpdate);
      expect(result).toEqual(tournamentToUpdate);
    });
  });

  // Test deleteTournament
  describe('deleteTournament', () => {
    it('should call the Supabase service to delete a tournament', async () => {
      const tournamentId = 't1';
      mockDeleteSupabaseTournament.mockResolvedValue(true);

      const result = await deleteTournament(mockClerkToken, mockInternalSupabaseUserId, tournamentId);

      expect(mockDeleteSupabaseTournament).toHaveBeenCalledWith(mockSupabaseClient, mockInternalSupabaseUserId, tournamentId);
      expect(result).toBe(true);
    });
  });
}); 