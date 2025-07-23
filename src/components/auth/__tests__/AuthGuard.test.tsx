// Unit tests for AuthGuard component
import { render, screen } from '@testing-library/react';
import { AuthGuard } from '../AuthGuard';

// Mock the AuthContext
const mockAuth = {
  user: null,
  session: null,
  loading: false,
  signUp: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  resetPassword: jest.fn(),
};

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
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
        <AuthGuard>
          <TestChildComponent />
        </AuthGuard>
      );
      
      expect(screen.getByTestId('auth-loading')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should show sign in prompt when user is not authenticated', () => {
      mockAuth.loading = false;
      mockAuth.user = null;
      mockAuth.session = null;
      
      render(
        <AuthGuard>
          <TestChildComponent />
        </AuthGuard>
      );
      
      expect(screen.getByTestId('auth-required')).toBeInTheDocument();
      expect(screen.getByText('auth.signInRequired')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should render children when user is authenticated with session', () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const mockSession = { access_token: 'token-123', user: mockUser };
      
      mockAuth.loading = false;
      mockAuth.user = mockUser;
      mockAuth.session = mockSession;
      
      render(
        <AuthGuard>
          <TestChildComponent />
        </AuthGuard>
      );
      
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.queryByTestId('auth-loading')).not.toBeInTheDocument();
      expect(screen.queryByTestId('auth-required')).not.toBeInTheDocument();
    });

    it('should render children when user is authenticated without session', () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      
      mockAuth.loading = false;
      mockAuth.user = mockUser;
      mockAuth.session = null;
      
      render(
        <AuthGuard>
          <TestChildComponent />
        </AuthGuard>
      );
      
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  describe('Custom Messages', () => {
    it('should use custom loading message when provided', () => {
      const customLoadingMessage = 'Custom loading message';
      
      mockAuth.loading = true;
      mockAuth.user = null;
      mockAuth.session = null;
      
      render(
        <AuthGuard loadingMessage={customLoadingMessage}>
          <TestChildComponent />
        </AuthGuard>
      );
      
      expect(screen.getByText(customLoadingMessage)).toBeInTheDocument();
    });

    it('should use custom auth required message when provided', () => {
      const customAuthMessage = 'Custom auth required message';
      
      mockAuth.loading = false;
      mockAuth.user = null;
      mockAuth.session = null;
      
      render(
        <AuthGuard authRequiredMessage={customAuthMessage}>
          <TestChildComponent />
        </AuthGuard>
      );
      
      expect(screen.getByText(customAuthMessage)).toBeInTheDocument();
    });
  });

  describe('Show Auth Modal', () => {
    it('should show auth modal when showAuthModal is true and user is not authenticated', () => {
      mockAuth.loading = false;
      mockAuth.user = null;
      mockAuth.session = null;
      
      render(
        <AuthGuard showAuthModal={true}>
          <TestChildComponent />
        </AuthGuard>
      );
      
      expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
    });

    it('should not show auth modal by default', () => {
      mockAuth.loading = false;
      mockAuth.user = null;
      mockAuth.session = null;
      
      render(
        <AuthGuard>
          <TestChildComponent />
        </AuthGuard>
      );
      
      expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument();
    });

    it('should not show auth modal when user is authenticated', () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const mockSession = { access_token: 'token-123', user: mockUser };
      
      mockAuth.loading = false;
      mockAuth.user = mockUser;
      mockAuth.session = mockSession;
      
      render(
        <AuthGuard showAuthModal={true}>
          <TestChildComponent />
        </AuthGuard>
      );
      
      expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument();
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
        <AuthGuard fallback={<CustomFallback />}>
          <TestChildComponent />
        </AuthGuard>
      );
      
      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.queryByTestId('auth-required')).not.toBeInTheDocument();
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
        <AuthGuard fallback={<CustomFallback />}>
          <TestChildComponent />
        </AuthGuard>
      );
      
      expect(screen.queryByTestId('custom-fallback')).not.toBeInTheDocument();
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  describe('Role-based Access', () => {
    it('should render children when no required role is specified', () => {
      const mockUser = { id: 'user-1', email: 'test@example.com', role: 'user' };
      const mockSession = { access_token: 'token-123', user: mockUser };
      
      mockAuth.loading = false;
      mockAuth.user = mockUser;
      mockAuth.session = mockSession;
      
      render(
        <AuthGuard>
          <TestChildComponent />
        </AuthGuard>
      );
      
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should render children when user has required role', () => {
      const mockUser = { id: 'user-1', email: 'test@example.com', role: 'admin' };
      const mockSession = { access_token: 'token-123', user: mockUser };
      
      mockAuth.loading = false;
      mockAuth.user = mockUser;
      mockAuth.session = mockSession;
      
      render(
        <AuthGuard requiredRole="admin">
          <TestChildComponent />
        </AuthGuard>
      );
      
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should not render children when user lacks required role', () => {
      const mockUser = { id: 'user-1', email: 'test@example.com', role: 'user' };
      const mockSession = { access_token: 'token-123', user: mockUser };
      
      mockAuth.loading = false;
      mockAuth.user = mockUser;
      mockAuth.session = mockSession;
      
      render(
        <AuthGuard requiredRole="admin">
          <TestChildComponent />
        </AuthGuard>
      );
      
      expect(screen.getByTestId('insufficient-permissions')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should handle user without role property', () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const mockSession = { access_token: 'token-123', user: mockUser };
      
      mockAuth.loading = false;
      mockAuth.user = mockUser;
      mockAuth.session = mockSession;
      
      render(
        <AuthGuard requiredRole="admin">
          <TestChildComponent />
        </AuthGuard>
      );
      
      expect(screen.getByTestId('insufficient-permissions')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('Multiple Children', () => {
    it('should render multiple children when authenticated', () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const mockSession = { access_token: 'token-123', user: mockUser };
      
      mockAuth.loading = false;
      mockAuth.user = mockUser;
      mockAuth.session = mockSession;
      
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
  });
});