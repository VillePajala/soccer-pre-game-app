// Basic unit tests for AuthGuard component  
import { render, screen } from '@testing-library/react';
import { AuthGuard } from '../AuthGuard';

// Mock the AuthHelpers hook instead
const mockAuthHelpers = {
  isAnonymous: jest.fn(() => true),
  isAuthenticated: jest.fn(() => false),
  loading: false,
  user: null,
  getUserId: jest.fn(() => null),
  getUserEmail: jest.fn(() => null),
  isEmailVerified: jest.fn(() => false),
};

jest.mock('../../../hooks/useAuthHelpers', () => ({
  useAuthHelpers: () => mockAuthHelpers,
}));

// Mock AuthModal to avoid complex auth context dependencies
jest.mock('../AuthModal', () => ({
  AuthModal: ({ isOpen }: { isOpen: boolean; onClose: () => void }) => (
    isOpen ? <div data-testid="auth-modal">Auth Modal</div> : null
  ),
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
    // Reset mock auth helpers state
    mockAuthHelpers.loading = false;
    mockAuthHelpers.user = null;
    mockAuthHelpers.isAnonymous.mockReturnValue(true);
    mockAuthHelpers.isAuthenticated.mockReturnValue(false);
  });

  it('should render children when user is authenticated', () => {
    mockAuthHelpers.user = { id: 'user-1', email: 'test@example.com' };
    mockAuthHelpers.isAnonymous.mockReturnValue(false);
    mockAuthHelpers.isAuthenticated.mockReturnValue(true);
    
    render(
      <AuthGuard>
        <TestChildComponent />
      </AuthGuard>
    );
    
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('should show auth required when requireAuth=true and user is not authenticated', () => {
    mockAuthHelpers.user = null;
    mockAuthHelpers.isAnonymous.mockReturnValue(true);
    mockAuthHelpers.isAuthenticated.mockReturnValue(false);
    
    render(
      <AuthGuard requireAuth={true}>
        <TestChildComponent />
      </AuthGuard>
    );
    
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByText('Authentication Required')).toBeInTheDocument();
    expect(screen.getByText('You need to sign in to access this feature.')).toBeInTheDocument();
  });

  it('should show loading state when auth is loading', () => {
    mockAuthHelpers.loading = true;
    
    render(
      <AuthGuard>
        <TestChildComponent />
      </AuthGuard>
    );
    
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    // AuthGuard shows a spinner
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should render children when requireAuth=false (default)', () => {
    mockAuthHelpers.user = null;
    mockAuthHelpers.isAnonymous.mockReturnValue(true);
    
    render(
      <AuthGuard>
        <TestChildComponent />
      </AuthGuard>
    );
    
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('should render custom fallback when provided', () => {
    const CustomFallback = () => <div data-testid="custom-fallback">Custom fallback</div>;
    mockAuthHelpers.user = null;
    mockAuthHelpers.isAnonymous.mockReturnValue(true);
    
    render(
      <AuthGuard requireAuth={true} fallback={<CustomFallback />}>
        <TestChildComponent />
      </AuthGuard>
    );
    
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
  });
});