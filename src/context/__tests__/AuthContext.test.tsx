// Unit tests for AuthContext
import { render, screen, waitFor, act } from '@testing-library/react';
import { useAuth, AuthProvider } from '../AuthContext';
import { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';

// Manual mock
jest.mock('../../lib/supabase');

// Import after mock
import { supabase } from '../../lib/supabase';

// Test component to access auth context
const TestComponent = ({ testId = 'test-component' }: { testId?: string }) => {
  const auth = useAuth();
  
  return (
    <div data-testid={testId}>
      <div data-testid="user">{auth.user ? JSON.stringify(auth.user) : 'null'}</div>
      <div data-testid="session">{auth.session ? JSON.stringify(auth.session) : 'null'}</div>
      <div data-testid="loading">{auth.loading.toString()}</div>
      <button 
        data-testid="signup-btn" 
        onClick={() => auth.signUp('test@example.com', 'password123')}
      >
        Sign Up
      </button>
      <button 
        data-testid="signin-btn" 
        onClick={() => auth.signIn('test@example.com', 'password123')}
      >
        Sign In
      </button>
      <button data-testid="signout-btn" onClick={() => auth.signOut()}>
        Sign Out
      </button>
      <button 
        data-testid="reset-btn" 
        onClick={() => auth.resetPassword('test@example.com')}
      >
        Reset Password
      </button>
    </div>
  );
};

const renderWithAuthProvider = async (children: ReactNode) => {
  let utils: ReturnType<typeof render> | undefined;
  await act(async () => {
    utils = render(<AuthProvider>{children}</AuthProvider>);
  });
  return utils as ReturnType<typeof render>;
};

describe('AuthContext', () => {
  let mockUnsubscribe: jest.Mock;
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUnsubscribe = jest.fn();
    
    // Setup auth mocks
    mockSupabase.auth = {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      resetPasswordForEmail: jest.fn(),
    } as any;
    
    // Default mock implementations
    (mockSupabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });
    
    (mockSupabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });
    
    (mockSupabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    });
    
    (mockSupabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    });
    
    (mockSupabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });
    
    (mockSupabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({ error: null });
  });

  describe('Initialization', () => {
    it('should initialize with null user and session, and loading becomes false', async () => {
      await renderWithAuthProvider(<TestComponent />);
      
      // Since useEffect runs immediately, loading should already be false after render
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('null');
        expect(screen.getByTestId('session')).toHaveTextContent('null');
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });
    });

    it('should call getSession on mount', async () => {
      await renderWithAuthProvider(<TestComponent />);
      
      await waitFor(() => {
        expect(mockSupabase.auth.getSession).toHaveBeenCalled();
      });
    });

    it('should set up auth state change listener', async () => {
      await renderWithAuthProvider(<TestComponent />);
      
      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();
    });
  });

  describe('Auth State Management', () => {
    it('should update state when session is available', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const mockSession = { access_token: 'token-123', user: mockUser };
      
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      
      await renderWithAuthProvider(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser));
        expect(screen.getByTestId('session')).toHaveTextContent(JSON.stringify(mockSession));
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });
    });

    it('should handle auth state changes', async () => {
      let authStateCallback: (event: string, session: Session | null) => void;
      
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      });
      
      await renderWithAuthProvider(<TestComponent />);
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });
      
      // Simulate auth state change
      const newUser = { id: 'user-2', email: 'new@example.com' };
      const newSession = { access_token: 'new-token', user: newUser } as unknown as Session;
      
      act(() => {
        authStateCallback('SIGNED_IN', newSession);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(newUser));
        expect(screen.getByTestId('session')).toHaveTextContent(JSON.stringify(newSession));
      });
    });
  });

  describe('Authentication Methods', () => {
    it('should handle successful sign up', async () => {
      const mockUser = { id: 'new-user', email: 'test@example.com' };
      const mockSession = { access_token: 'token', user: mockUser };
      
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });
      
      await renderWithAuthProvider(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });
      
      act(() => {
        screen.getByTestId('signup-btn').click();
      });
      
      await waitFor(() => {
        expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    it('should handle sign up errors', async () => {
      const mockError = { message: 'Invalid email' };
      
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });
      
      await renderWithAuthProvider(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });
      
      act(() => {
        screen.getByTestId('signup-btn').click();
      });
      
      await waitFor(() => {
        expect(mockSupabase.auth.signUp).toHaveBeenCalled();
      });
    });

    it('should handle successful sign in', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const mockSession = { access_token: 'token', user: mockUser };
      
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });
      
      await renderWithAuthProvider(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });
      
      act(() => {
        screen.getByTestId('signin-btn').click();
      });
      
      await waitFor(() => {
        expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    it('should handle sign out', async () => {
      await renderWithAuthProvider(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });
      
      act(() => {
        screen.getByTestId('signout-btn').click();
      });
      
      await waitFor(() => {
        expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      });
    });

    it('should handle password reset', async () => {
      await renderWithAuthProvider(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });
      
      act(() => {
        screen.getByTestId('reset-btn').click();
      });
      
      await waitFor(() => {
        expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
          'test@example.com',
          expect.objectContaining({
            redirectTo: expect.stringContaining('/auth/reset-password'),
          })
        );
      });
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe from auth state changes on unmount', async () => {
      const { unmount } = await renderWithAuthProvider(<TestComponent />);
      
      unmount();
      
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle getSession errors gracefully', async () => {
      mockSupabase.auth.getSession.mockRejectedValue(new Error('Session error'));
      
      await renderWithAuthProvider(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
        expect(screen.getByTestId('user')).toHaveTextContent('null');
        expect(screen.getByTestId('session')).toHaveTextContent('null');
      });
    });
  });

  describe('Hook Usage', () => {
    it('should throw error when useAuth is used outside AuthProvider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();
      
      expect(() => {
        render(<TestComponent testId="outside-provider" />);
      }).toThrow('useAuth must be used within an AuthProvider');
      
      console.error = originalError;
    });
  });
});