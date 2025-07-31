// Unit tests for AuthModal component
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthModal } from '../AuthModal';

// Mock scrollIntoView (not available in jsdom)
Element.prototype.scrollIntoView = jest.fn();

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

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('AuthModal', () => {
  const mockOnClose = jest.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.signUp.mockResolvedValue({ error: null });
    mockAuth.signIn.mockResolvedValue({ error: null });
    mockAuth.resetPassword.mockResolvedValue({ error: null });
  });

  describe('Modal Visibility', () => {
    it('should render when isOpen is true', () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<AuthModal isOpen={false} onClose={mockOnClose} />);
      
      expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      const closeButton = screen.getByText('✕');
      await user.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

  });

  describe('Sign In Mode', () => {
    it('should render sign in form by default', () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    });

    it('should handle successful sign in', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Sign In' });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockAuth.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should display loading state during sign in', async () => {
      let resolveSignIn: (value: { error: null }) => void;
      mockAuth.signIn.mockReturnValue(new Promise<{ error: null }>(resolve => {
        resolveSignIn = resolve;
      }));
      
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Sign In' });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      
      // Resolve the promise to clean up
      resolveSignIn({ error: null });
    });

    it('should handle sign in errors', async () => {
      const errorMessage = 'Invalid credentials';
      mockAuth.signIn.mockResolvedValue({ error: { message: errorMessage } });
      
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Sign In' });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });
  });

  describe('Sign Up Mode', () => {
    it('should switch to sign up mode when link is clicked', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      const switchToSignUpLink = screen.getByText('Sign up');
      await user.click(switchToSignUpLink);
      
      expect(screen.getByRole('heading', { name: 'Sign Up' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign Up' })).toBeInTheDocument();
    });

    it('should handle successful sign up', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      // Switch to sign up mode
      await user.click(screen.getByText('Sign up'));
      
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Sign Up' });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'SecurePass8!');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockAuth.signUp).toHaveBeenCalledWith('test@example.com', 'SecurePass8!');
        expect(screen.getByText(/Check your email for verification link!/)).toBeInTheDocument();
      });
    });


    it('should handle sign up errors', async () => {
      const errorMessage = 'Email already registered';
      mockAuth.signUp.mockResolvedValue({ error: { message: errorMessage } });
      
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      // Switch to sign up mode
      await user.click(screen.getByText('Sign up'));
      
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Sign Up' });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'SecurePass8!');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });
  });

  describe('Password Reset Mode', () => {
    it('should switch to password reset mode when link is clicked', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      const forgotPasswordLink = screen.getByText('Forgot password?');
      await user.click(forgotPasswordLink);
      
      expect(screen.getByText('Reset Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send Reset Link' })).toBeInTheDocument();
    });

    it('should handle successful password reset', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      // Switch to password reset mode
      await user.click(screen.getByText('Forgot password?'));
      
      const emailInput = screen.getByLabelText('Email');
      const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });
      
      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockAuth.resetPassword).toHaveBeenCalledWith('test@example.com');
        expect(screen.getByText('Password reset link sent to your email!')).toBeInTheDocument();
      });
    });

    it('should handle password reset errors', async () => {
      const errorMessage = 'Email not found';
      mockAuth.resetPassword.mockResolvedValue({ error: { message: errorMessage } });
      
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      // Switch to password reset mode
      await user.click(screen.getByText('Forgot password?'));
      
      const emailInput = screen.getByLabelText('Email');
      const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });
      
      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should require email field', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      const submitButton = screen.getByRole('button', { name: 'Sign In' });
      await user.click(submitButton);
      
      expect(screen.getByLabelText('Email')).toBeInvalid();
      expect(mockAuth.signIn).not.toHaveBeenCalled();
    });

    it('should require password field', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      const emailInput = screen.getByLabelText('Email');
      const submitButton = screen.getByRole('button', { name: 'Sign In' });
      
      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);
      
      expect(screen.getByLabelText('Password')).toBeInvalid();
      expect(mockAuth.signIn).not.toHaveBeenCalled();
    });

    it('should validate email format', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Sign In' });
      
      await user.type(emailInput, 'invalid-email');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      expect(emailInput).toBeInvalid();
      expect(mockAuth.signIn).not.toHaveBeenCalled();
    });
  });

  describe('Mode Switching', () => {
    it('should switch back to sign in from sign up', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      // Switch to sign up
      await user.click(screen.getByText('Sign up'));
      expect(screen.getByRole('heading', { name: 'Sign Up' })).toBeInTheDocument();
      
      // Switch back to sign in
      await user.click(screen.getByText('Sign in'));
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
    });

    it('should switch back to sign in from password reset', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      // Switch to password reset
      await user.click(screen.getByText('Forgot password?'));
      expect(screen.getByRole('heading', { name: 'Reset Password' })).toBeInTheDocument();
      
      // Switch back to sign in
      await user.click(screen.getByText('Sign in'));
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
    });

    it('should clear form data when switching modes', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      
      // Fill in form data
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      
      // Switch modes
      await user.click(screen.getByText('Sign up'));
      await user.click(screen.getByText('Sign in'));
      
      // Form should be cleared
      expect(screen.getByLabelText('Email')).toHaveValue('');
      expect(screen.getByLabelText('Password')).toHaveValue('');
    });
  });
});