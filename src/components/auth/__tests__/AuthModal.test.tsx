// Unit tests for AuthModal component
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthModal } from '../AuthModal';

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

describe('AuthModal', () => {
  const mockOnClose = jest.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.signUp.mockResolvedValue(undefined);
    mockAuth.signIn.mockResolvedValue(undefined);
    mockAuth.resetPassword.mockResolvedValue(undefined);
  });

  describe('Modal Visibility', () => {
    it('should render when isOpen is true', () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<AuthModal isOpen={false} onClose={mockOnClose} />);
      
      expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      const closeButton = screen.getByTestId('close-modal-btn');
      await user.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when clicking outside the modal', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      const backdrop = screen.getByTestId('modal-backdrop');
      await user.click(backdrop);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Sign In Mode', () => {
    it('should render sign in form by default', () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByTestId('signin-form')).toBeInTheDocument();
      expect(screen.getByTestId('email-input')).toBeInTheDocument();
      expect(screen.getByTestId('password-input')).toBeInTheDocument();
      expect(screen.getByTestId('signin-submit-btn')).toBeInTheDocument();
    });

    it('should handle successful sign in', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const submitButton = screen.getByTestId('signin-submit-btn');
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockAuth.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('should display loading state during sign in', async () => {
      let resolveSignIn: () => void;
      mockAuth.signIn.mockReturnValue(
        new Promise<void>(resolve => {
          resolveSignIn = resolve;
        })
      );
      
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const submitButton = screen.getByTestId('signin-submit-btn');
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      
      // Resolve the promise to clean up
      resolveSignIn();
    });

    it('should handle sign in errors', async () => {
      const errorMessage = 'Invalid credentials';
      mockAuth.signIn.mockRejectedValue(new Error(errorMessage));
      
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const submitButton = screen.getByTestId('signin-submit-btn');
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent(errorMessage);
      });
    });
  });

  describe('Sign Up Mode', () => {
    it('should switch to sign up mode when link is clicked', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      const switchToSignUpLink = screen.getByTestId('switch-to-signup');
      await user.click(switchToSignUpLink);
      
      expect(screen.getByTestId('signup-form')).toBeInTheDocument();
      expect(screen.getByTestId('signup-submit-btn')).toBeInTheDocument();
    });

    it('should handle successful sign up', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      // Switch to sign up mode
      await user.click(screen.getByTestId('switch-to-signup'));
      
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const confirmPasswordInput = screen.getByTestId('confirm-password-input');
      const submitButton = screen.getByTestId('signup-submit-btn');
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockAuth.signUp).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('should validate password confirmation', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      // Switch to sign up mode
      await user.click(screen.getByTestId('switch-to-signup'));
      
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const confirmPasswordInput = screen.getByTestId('confirm-password-input');
      const submitButton = screen.getByTestId('signup-submit-btn');
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'differentpassword');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('auth.passwordMismatch');
      });
      
      expect(mockAuth.signUp).not.toHaveBeenCalled();
    });

    it('should handle sign up errors', async () => {
      const errorMessage = 'Email already registered';
      mockAuth.signUp.mockRejectedValue(new Error(errorMessage));
      
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      // Switch to sign up mode
      await user.click(screen.getByTestId('switch-to-signup'));
      
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const confirmPasswordInput = screen.getByTestId('confirm-password-input');
      const submitButton = screen.getByTestId('signup-submit-btn');
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent(errorMessage);
      });
    });
  });

  describe('Password Reset Mode', () => {
    it('should switch to password reset mode when link is clicked', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      const forgotPasswordLink = screen.getByTestId('forgot-password-link');
      await user.click(forgotPasswordLink);
      
      expect(screen.getByTestId('reset-password-form')).toBeInTheDocument();
      expect(screen.getByTestId('reset-submit-btn')).toBeInTheDocument();
    });

    it('should handle successful password reset', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      // Switch to password reset mode
      await user.click(screen.getByTestId('forgot-password-link'));
      
      const emailInput = screen.getByTestId('email-input');
      const submitButton = screen.getByTestId('reset-submit-btn');
      
      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockAuth.resetPassword).toHaveBeenCalledWith('test@example.com');
      });
      
      expect(screen.getByTestId('success-message')).toBeInTheDocument();
    });

    it('should handle password reset errors', async () => {
      const errorMessage = 'Email not found';
      mockAuth.resetPassword.mockRejectedValue(new Error(errorMessage));
      
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      // Switch to password reset mode
      await user.click(screen.getByTestId('forgot-password-link'));
      
      const emailInput = screen.getByTestId('email-input');
      const submitButton = screen.getByTestId('reset-submit-btn');
      
      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent(errorMessage);
      });
    });
  });

  describe('Form Validation', () => {
    it('should require email field', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      const submitButton = screen.getByTestId('signin-submit-btn');
      await user.click(submitButton);
      
      expect(screen.getByTestId('email-input')).toBeInvalid();
      expect(mockAuth.signIn).not.toHaveBeenCalled();
    });

    it('should require password field', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      const emailInput = screen.getByTestId('email-input');
      const submitButton = screen.getByTestId('signin-submit-btn');
      
      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);
      
      expect(screen.getByTestId('password-input')).toBeInvalid();
      expect(mockAuth.signIn).not.toHaveBeenCalled();
    });

    it('should validate email format', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const submitButton = screen.getByTestId('signin-submit-btn');
      
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
      await user.click(screen.getByTestId('switch-to-signup'));
      expect(screen.getByTestId('signup-form')).toBeInTheDocument();
      
      // Switch back to sign in
      await user.click(screen.getByTestId('switch-to-signin'));
      expect(screen.getByTestId('signin-form')).toBeInTheDocument();
    });

    it('should switch back to sign in from password reset', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      // Switch to password reset
      await user.click(screen.getByTestId('forgot-password-link'));
      expect(screen.getByTestId('reset-password-form')).toBeInTheDocument();
      
      // Switch back to sign in
      await user.click(screen.getByTestId('back-to-signin'));
      expect(screen.getByTestId('signin-form')).toBeInTheDocument();
    });

    it('should clear form data when switching modes', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      
      // Fill in form data
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      
      // Switch modes
      await user.click(screen.getByTestId('switch-to-signup'));
      await user.click(screen.getByTestId('switch-to-signin'));
      
      // Form should be cleared
      expect(emailInput).toHaveValue('');
      expect(passwordInput).toHaveValue('');
    });
  });
});