import { SupabaseClient } from '@supabase/supabase-js';
import {
  getSupabaseTournaments,
  createSupabaseTournament,
  updateSupabaseTournament,
  deleteSupabaseTournament,
  SupabaseTournament,
} from './tournaments';
import { Tournament } from '@/types';

// Mock the Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(),
  })),
}));

describe('Supabase Tournaments Service', () => {
  let supabase: SupabaseClient;
  const mockUserId = 'test-user-id-123';

  beforeEach(() => {
    // Re-create a mock client for each test to ensure isolation
    supabase = new (jest.requireMock('@supabase/supabase-js').createClient)();
    jest.clearAllMocks();
  });

  // Test getSupabaseTournaments
  describe('getSupabaseTournaments', () => {
    it('should fetch and transform tournaments correctly', async () => {
      const mockSupabaseTournaments: SupabaseTournament[] = [
        { id: 't1', name: 'Summer Cup', user_id: mockUserId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 't2', name: 'Winter Shield', user_id: mockUserId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ];
      
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockSupabaseTournaments, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await getSupabaseTournaments(supabase, mockUserId);

      expect(supabase.from).toHaveBeenCalledWith('tournaments');
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', mockUserId);
      expect(result).toEqual([
        { id: 't1', name: 'Summer Cup' },
        { id: 't2', name: 'Winter Shield' },
      ]);
    });

    it('should throw an error if the query fails', async () => {
      const mockError = new Error('DB Connection Failed');
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: mockError }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      await expect(getSupabaseTournaments(supabase, mockUserId)).rejects.toThrow(mockError);
    });
  });

  // Test createSupabaseTournament
  describe('createSupabaseTournament', () => {
    it('should create a new tournament and return it transformed', async () => {
      const newTournamentData: Omit<Tournament, 'id'> = { name: 'Spring Invitational' };
      const mockCreatedTournament: SupabaseTournament = {
        id: 'new-t1',
        name: 'Spring Invitational',
        user_id: mockUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockCreatedTournament, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await createSupabaseTournament(supabase, mockUserId, newTournamentData);

      expect(supabase.from).toHaveBeenCalledWith('tournaments');
      expect(mockQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
        user_id: mockUserId,
        name: 'Spring Invitational',
      }));
      expect(result).toEqual({ id: 'new-t1', name: 'Spring Invitational' });
    });
  });

  // Test updateSupabaseTournament
  describe('updateSupabaseTournament', () => {
    it('should update an existing tournament', async () => {
      const tournamentToUpdate: Tournament = { id: 't1', name: 'Summer Cup Updated' };
      const mockUpdatedTournament: SupabaseTournament = {
        id: 't1',
        name: 'Summer Cup Updated',
        user_id: mockUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUpdatedTournament, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await updateSupabaseTournament(supabase, mockUserId, tournamentToUpdate);

      expect(supabase.from).toHaveBeenCalledWith('tournaments');
      expect(mockQuery.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'Summer Cup Updated' }));
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 't1');
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', mockUserId);
      expect(result).toEqual({ id: 't1', name: 'Summer Cup Updated' });
    });
  });

  // Test deleteSupabaseTournament
  describe('deleteSupabaseTournament', () => {
    it('should delete a tournament and return true', async () => {
      const tournamentIdToDelete = 't1';
      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await deleteSupabaseTournament(supabase, mockUserId, tournamentIdToDelete);

      expect(supabase.from).toHaveBeenCalledWith('tournaments');
      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', tournamentIdToDelete);
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', mockUserId);
      expect(result).toBe(true);
    });
  });
}); 