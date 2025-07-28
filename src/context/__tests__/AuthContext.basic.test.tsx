// Basic unit tests for AuthContext
import { render, screen, waitFor, act } from '@testing-library/react';
import { useAuth, AuthProvider } from '../AuthContext';

// Mock Supabase client
const mockSupabase = {
  auth: {
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(),
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    resetPasswordForEmail: jest.fn(),
  },
};

jest.mock('../../lib/supabase', () => ({
  supabase: mockSupabase,
}));

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

describe.skip('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocks
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
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
      expect(mockSupabase.auth.getSession).toHaveBeenCalled();
      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();
    });
  });

  it('should handle authenticated user', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' };
    const mockSession = { user: mockUser, access_token: 'token' };
    
    mockSupabase.auth.getSession.mockResolvedValue({
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