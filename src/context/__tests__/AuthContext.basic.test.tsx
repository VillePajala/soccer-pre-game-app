// Basic unit tests for AuthContext
import { render, screen, waitFor, act } from '@testing-library/react';
import { useAuth, AuthProvider } from '../AuthContext';

// Mock Supabase using the same approach as the main test
jest.mock('../../lib/supabase');

// Import after mock
import { supabase } from '../../lib/supabase';

// Simple test component
const TestComponent = () => {
  const { user, loading } = useAuth();
  
  return (
    <div>
      <div data-testid="user">{user ? 'authenticated' : 'unauthenticated'}</div>
      <div data-testid="loading">{loading.toString()}</div>
    </div>
  );
};

describe('AuthContext', () => {
  const mockSupabaseAuth = supabase.auth as {
    getSession: jest.Mock;
    onAuthStateChange: jest.Mock;
    signUp: jest.Mock;
    signInWithPassword: jest.Mock;
    signOut: jest.Mock;
    resetPasswordForEmail: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocks
    mockSupabaseAuth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    
    mockSupabaseAuth.onAuthStateChange.mockReturnValue({
      data: { 
        subscription: { 
          unsubscribe: jest.fn() 
        } 
      },
    });
  });

  it('should provide authentication context', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    
    expect(screen.getByTestId('user')).toHaveTextContent('unauthenticated');
  });

  it('should initialize auth state', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });
    
    await waitFor(() => {
      expect(mockSupabaseAuth.getSession).toHaveBeenCalled();
      expect(mockSupabaseAuth.onAuthStateChange).toHaveBeenCalled();
    });
  });

  it('should handle authenticated user', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' };
    const mockSession = { user: mockUser, access_token: 'token' };
    
    mockSupabaseAuth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });
    
    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('authenticated');
    });
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');
    
    console.error = originalError;
  });
});