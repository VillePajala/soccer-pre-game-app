// Unit tests for AuthGuard component
import { render, screen } from '@testing-library/react';
import { AuthGuard } from '../AuthGuard';

// Mock the AuthContext
const mockAuth = {
  user: null as any,
  session: null as any,
  loading: false,
  signUp: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  resetPassword: jest.fn(),
};

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

// Mock useAuthHelpers
jest.mock('@/hooks/useAuthHelpers', () => ({
  useAuthHelpers: () => ({
    isAnonymous: () => mockAuth.user === null,
    isAuthenticated: () => mockAuth.user !== null,
    loading: mockAuth.loading,
    user: mockAuth.user,
    getUserId: () => (mockAuth.user as any)?.id || null,
    getUserEmail: () => (mockAuth.user as any)?.email || null,
    isEmailVerified: () => false,
  }),
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock AuthModal
jest.mock('../AuthModal', () => ({
  AuthModal: ({ isOpen }: { isOpen: boolean }) => 
    isOpen ? <div data-testid="auth-modal">Auth Modal</div> : null,
}));

const TestChildComponent = () => (
  <div data-testid="protected-content">Protected Content</div>
);

describe('AuthGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication States', () => {
    it('should show loading spinner when auth is loading', () => {
      mockAuth.loading = true;
      mockAuth.user = null;
      mockAuth.session = null;
      
      render(
        <AuthGuard requireAuth>
          <TestChildComponent />
        </AuthGuard>
      );
      
      expect(screen.getByText('', { selector: '.animate-spin' })).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should show sign in prompt when user is not authenticated and requireAuth is true', () => {
      mockAuth.loading = false;
      mockAuth.user = null;
      mockAuth.session = null;
      
      render(
        <AuthGuard requireAuth>
          <TestChildComponent />
        </AuthGuard>
      );
      
      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      expect(screen.getByText('You need to sign in to access this feature.')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should render children when user is authenticated', () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const mockSession = { access_token: 'token-123', user: mockUser };
      
      mockAuth.loading = false;
      mockAuth.user = mockUser;
      mockAuth.session = mockSession;
      
      render(
        <AuthGuard requireAuth>
          <TestChildComponent />
        </AuthGuard>
      );
      
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
    });

    it('should render children when requireAuth is false regardless of auth state', () => {
      mockAuth.loading = false;
      mockAuth.user = null;
      mockAuth.session = null;
      
      render(
        <AuthGuard>
          <TestChildComponent />
        </AuthGuard>
      );
      
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });


  describe('Show Auth Modal', () => {
    it('should show sign in button when showAuthModal is true and user is not authenticated', () => {
      mockAuth.loading = false;
      mockAuth.user = null;
      mockAuth.session = null;
      
      render(
        <AuthGuard requireAuth showAuthModal={true}>
          <TestChildComponent />
        </AuthGuard>
      );
      
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    });

    it('should not show sign in button when showAuthModal is false', () => {
      mockAuth.loading = false;
      mockAuth.user = null;
      mockAuth.session = null;
      
      render(
        <AuthGuard requireAuth showAuthModal={false}>
          <TestChildComponent />
        </AuthGuard>
      );
      
      expect(screen.queryByRole('button', { name: 'Sign In' })).not.toBeInTheDocument();
    });

    it('should not show auth UI when user is authenticated', () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const mockSession = { access_token: 'token-123', user: mockUser };
      
      mockAuth.loading = false;
      mockAuth.user = mockUser;
      mockAuth.session = mockSession;
      
      render(
        <AuthGuard requireAuth showAuthModal={true}>
          <TestChildComponent />
        </AuthGuard>
      );
      
      expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  describe('Fallback UI', () => {
    it('should render custom fallback when user is not authenticated', () => {
      const CustomFallback = () => (
        <div data-testid="custom-fallback">Custom fallback content</div>
      );
      
      mockAuth.loading = false;
      mockAuth.user = null;
      mockAuth.session = null;
      
      render(
        <AuthGuard requireAuth fallback={<CustomFallback />}>
          <TestChildComponent />
        </AuthGuard>
      );
      
      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should not render fallback when user is authenticated', () => {
      const CustomFallback = () => (
        <div data-testid="custom-fallback">Custom fallback content</div>
      );
      
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const mockSession = { access_token: 'token-123', user: mockUser };
      
      mockAuth.loading = false;
      mockAuth.user = mockUser;
      mockAuth.session = mockSession;
      
      render(
        <AuthGuard requireAuth fallback={<CustomFallback />}>
          <TestChildComponent />
        </AuthGuard>
      );
      
      expect(screen.queryByTestId('custom-fallback')).not.toBeInTheDocument();
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });


  describe('Multiple Children', () => {
    it('should render multiple children when no auth is required', () => {
      mockAuth.loading = false;
      mockAuth.user = null;
      mockAuth.session = null;
      
      render(
        <AuthGuard>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
          <div data-testid="child-3">Child 3</div>
        </AuthGuard>
      );
      
      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('child-3')).toBeInTheDocument();
    });

    it('should render multiple children when authenticated and auth is required', () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const mockSession = { access_token: 'token-123', user: mockUser };
      
      mockAuth.loading = false;
      mockAuth.user = mockUser;
      mockAuth.session = mockSession;
      
      render(
        <AuthGuard requireAuth>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
          <div data-testid="child-3">Child 3</div>
        </AuthGuard>
      );
      
      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('child-3')).toBeInTheDocument();
    });
  });
});