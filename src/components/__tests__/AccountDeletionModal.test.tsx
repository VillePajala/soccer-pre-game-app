import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountDeletionModal } from '../AccountDeletionModal';
import { useAccountDeletion } from '@/hooks/useAccountDeletion';
import { useAuth } from '@/context/AuthContext';

// Mock dependencies
jest.mock('@/hooks/useAccountDeletion');
jest.mock('@/context/AuthContext');

const mockUseAccountDeletion = useAccountDeletion as jest.MockedFunction<typeof useAccountDeletion>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('AccountDeletionModal', () => {
  const mockOnClose = jest.fn();
  const mockRequest = jest.fn();
  const mockGetState = jest.fn();
  const mockCancel = jest.fn();
  const mockConfirm = jest.fn();
  const mockCheckCanConfirm = jest.fn();
  const user = userEvent.setup();

  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup auth context mock
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      login: jest.fn(),
      logout: jest.fn(),
      isLoading: false,
    });

    // Setup account deletion hook mock
    mockUseAccountDeletion.mockReturnValue({
      request: mockRequest,
      getState: mockGetState,
      cancel: mockCancel,
      confirm: mockConfirm,
      checkCanConfirm: mockCheckCanConfirm,
    });
  });

  describe('Modal Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<AccountDeletionModal isOpen={false} onClose={mockOnClose} />);
      
      expect(screen.queryByText(/delete account/i)).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByText(/delete account/i)).toBeInTheDocument();
    });

    it('should show warning about permanent deletion', () => {
      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument();
    });
  });

  describe('Account Deletion Request Flow', () => {
    it('should successfully request account deletion', async () => {
      // Arrange
      mockRequest.mockResolvedValue({ success: true });
      mockGetState.mockResolvedValue({
        scheduledDate: '2025-09-01',
        daysRemaining: 30,
      });
      mockCheckCanConfirm.mockResolvedValue({ canConfirm: false });

      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);

      const confirmCheckbox = screen.getByRole('checkbox', { name: /i understand/i });
      const deleteButton = screen.getByRole('button', { name: /request deletion/i });

      // Act
      await user.click(confirmCheckbox);
      await user.click(deleteButton);

      // Assert
      await waitFor(() => {
        expect(mockRequest).toHaveBeenCalledWith('test-user-123', false);
      });

      await waitFor(() => {
        expect(screen.getByText(/deletion request submitted/i)).toBeInTheDocument();
        expect(screen.getByText(/september 1, 2025/i)).toBeInTheDocument();
        expect(screen.getByText(/30 days/i)).toBeInTheDocument();
      });
    });

    it('should handle immediate deletion mode', async () => {
      // Arrange
      mockRequest.mockResolvedValue({ success: true });
      mockGetState.mockResolvedValue({
        scheduledDate: new Date().toISOString(),
        daysRemaining: 0,
      });
      mockCheckCanConfirm.mockResolvedValue({ canConfirm: true });

      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);

      const immediateCheckbox = screen.getByRole('checkbox', { name: /delete immediately/i });
      const confirmCheckbox = screen.getByRole('checkbox', { name: /i understand/i });
      const deleteButton = screen.getByRole('button', { name: /request deletion/i });

      // Act
      await user.click(immediateCheckbox);
      await user.click(confirmCheckbox);
      await user.click(deleteButton);

      // Assert
      await waitFor(() => {
        expect(mockRequest).toHaveBeenCalledWith('test-user-123', true);
      });
    });

    it('should handle deletion request errors', async () => {
      // Arrange
      const errorMessage = 'Account deletion failed due to server error';
      mockRequest.mockResolvedValue({ 
        success: false, 
        errors: [errorMessage] 
      });

      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);

      const confirmCheckbox = screen.getByRole('checkbox', { name: /i understand/i });
      const deleteButton = screen.getByRole('button', { name: /request deletion/i });

      // Act
      await user.click(confirmCheckbox);
      await user.click(deleteButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should handle network errors during deletion request', async () => {
      // Arrange
      mockRequest.mockRejectedValue(new Error('Network connection failed'));

      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);

      const confirmCheckbox = screen.getByRole('checkbox', { name: /i understand/i });
      const deleteButton = screen.getByRole('button', { name: /request deletion/i });

      // Act
      await user.click(confirmCheckbox);
      await user.click(deleteButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/network connection failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should require confirmation checkbox to be checked', async () => {
      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);

      const deleteButton = screen.getByRole('button', { name: /request deletion/i });

      // Act - Try to submit without checking confirmation
      await user.click(deleteButton);

      // Assert - Should not call deletion request
      expect(mockRequest).not.toHaveBeenCalled();
      expect(deleteButton).toBeDisabled();
    });

    it('should enable delete button when confirmation is checked', async () => {
      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);

      const confirmCheckbox = screen.getByRole('checkbox', { name: /i understand/i });
      const deleteButton = screen.getByRole('button', { name: /request deletion/i });

      // Initially disabled
      expect(deleteButton).toBeDisabled();

      // Act
      await user.click(confirmCheckbox);

      // Assert
      expect(deleteButton).toBeEnabled();
    });

    it('should require user to be authenticated', () => {
      // Arrange - No authenticated user
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        login: jest.fn(),
        logout: jest.fn(),
        isLoading: false,
      });

      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);

      // Assert - Should show authentication required message
      expect(screen.getByText(/you must be logged in/i)).toBeInTheDocument();
    });
  });

  describe('Cancellation Flow', () => {
    it('should allow cancelling pending deletion', async () => {
      // Arrange - Show existing pending deletion
      mockGetState.mockResolvedValue({
        scheduledDate: '2025-09-01',
        daysRemaining: 25,
        status: 'pending'
      });
      mockCancel.mockResolvedValue({ success: true });

      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);

      // Simulate having an existing pending request
      const cancelButton = screen.getByRole('button', { name: /cancel deletion/i });

      // Act
      await user.click(cancelButton);

      // Assert
      await waitFor(() => {
        expect(mockCancel).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText(/deletion cancelled successfully/i)).toBeInTheDocument();
      });
    });

    it('should handle cancellation errors', async () => {
      // Arrange
      mockCancel.mockRejectedValue(new Error('Unable to cancel deletion'));

      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);

      const cancelButton = screen.getByRole('button', { name: /cancel deletion/i });

      // Act
      await user.click(cancelButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/unable to cancel deletion/i)).toBeInTheDocument();
      });
    });
  });

  describe('Confirmation Flow', () => {
    it('should show confirmation step for eligible deletions', async () => {
      // Arrange
      mockCheckCanConfirm.mockResolvedValue({ canConfirm: true });

      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);

      // Act - Navigate to confirmation step
      const showConfirmationButton = screen.getByRole('button', { name: /proceed to confirmation/i });
      await user.click(showConfirmationButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/final confirmation/i)).toBeInTheDocument();
        expect(screen.getByText(/type.*delete.*to confirm/i)).toBeInTheDocument();
      });
    });

    it('should require exact confirmation text', async () => {
      // Arrange
      mockCheckCanConfirm.mockResolvedValue({ canConfirm: true });
      mockConfirm.mockResolvedValue({ success: true });

      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);

      // Navigate to confirmation
      const showConfirmationButton = screen.getByRole('button', { name: /proceed to confirmation/i });
      await user.click(showConfirmationButton);

      await waitFor(() => {
        expect(screen.getByText(/final confirmation/i)).toBeInTheDocument();
      });

      const confirmationInput = screen.getByRole('textbox');
      const confirmDeleteButton = screen.getByRole('button', { name: /permanently delete/i });

      // Act - Try with wrong text
      await user.type(confirmationInput, 'wrong text');
      
      // Assert - Button should be disabled
      expect(confirmDeleteButton).toBeDisabled();

      // Act - Enter correct text
      await user.clear(confirmationInput);
      await user.type(confirmationInput, 'DELETE');

      // Assert - Button should be enabled
      expect(confirmDeleteButton).toBeEnabled();

      // Act - Confirm deletion
      await user.click(confirmDeleteButton);

      // Assert
      await waitFor(() => {
        expect(mockConfirm).toHaveBeenCalledWith('test-user-123');
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during deletion request', async () => {
      // Arrange
      mockRequest.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);

      const confirmCheckbox = screen.getByRole('checkbox', { name: /i understand/i });
      const deleteButton = screen.getByRole('button', { name: /request deletion/i });

      // Act
      await user.click(confirmCheckbox);
      await user.click(deleteButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/processing/i)).toBeInTheDocument();
        expect(deleteButton).toBeDisabled();
      });
    });

    it('should disable form elements during submission', async () => {
      // Arrange
      mockRequest.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);

      const confirmCheckbox = screen.getByRole('checkbox', { name: /i understand/i });
      const immediateCheckbox = screen.getByRole('checkbox', { name: /delete immediately/i });
      const deleteButton = screen.getByRole('button', { name: /request deletion/i });

      // Act
      await user.click(confirmCheckbox);
      await user.click(deleteButton);

      // Assert
      await waitFor(() => {
        expect(confirmCheckbox).toBeDisabled();
        expect(immediateCheckbox).toBeDisabled();
        expect(deleteButton).toBeDisabled();
      });
    });
  });

  describe('Modal Controls', () => {
    it('should close modal when close button is clicked', async () => {
      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);

      const closeButton = screen.getByRole('button', { name: /close/i });

      // Act
      await user.click(closeButton);

      // Assert
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close modal when cancel button is clicked', async () => {
      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      // Act
      await user.click(cancelButton);

      // Assert
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should handle escape key to close modal', () => {
      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);

      // Act
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

      // Assert
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);

      // Check for modal role
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      
      // Check for proper labeling
      expect(screen.getByLabelText(/account deletion/i)).toBeInTheDocument();
    });

    it('should trap focus within modal', () => {
      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
    });

    it('should announce important status changes to screen readers', async () => {
      mockRequest.mockResolvedValue({ success: true });
      mockGetState.mockResolvedValue({
        scheduledDate: '2025-09-01',
        daysRemaining: 30,
      });

      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);

      const confirmCheckbox = screen.getByRole('checkbox', { name: /i understand/i });
      await user.click(confirmCheckbox);

      // Check for live region announcements
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });
});