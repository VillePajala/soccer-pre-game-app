import React, { useState } from 'react';
import { useAccountDeletion } from '@/hooks/useAccountDeletion';
import { useAuth } from '@/context/AuthContext';

interface AccountDeletionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountDeletionModal: React.FC<AccountDeletionModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { request, getState, cancel, confirm, checkCanConfirm } = useAccountDeletion();
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingInfo, setPendingInfo] = useState<{ scheduled?: string; days?: number; canConfirm?: boolean } | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [immediateMode, setImmediateMode] = useState(false);

  if (!isOpen) return null;

  const onConfirm = async () => {
    if (!user?.id) return;
    setSubmitting(true);
    setError(null);
    try {
      // Optionally re-authenticate with password here (Supabase signInWithPassword)
      const res = await request(user.id, immediateMode);
      if (!res.success) throw new Error(res.errors?.join('; ') || 'Unknown error');
      const state = await getState();
      const canConfirmResult = await checkCanConfirm(user.id);
      setPendingInfo({ 
        scheduled: state.scheduledDate, 
        days: state.daysRemaining,
        canConfirm: canConfirmResult.canConfirm
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const onCancelRequest = async () => {
    if (!user?.id) return;
    setSubmitting(true);
    setError(null);
    try {
      const success = await cancel(user.id);
      if (success) {
        setPendingInfo(null);
        setConfirmChecked(false);
        setPassword('');
      } else {
        throw new Error('Failed to cancel deletion request');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const onFinalConfirm = async () => {
    if (!user?.id) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await confirm(user.id);
      if (!result.success) {
        throw new Error(result.errors?.join('; ') || 'Deletion failed');
      }
      
      // Show success message and close modal
      setShowConfirmation(true);
      
      // After 3 seconds, the user will be logged out automatically
      // since their account no longer exists
      setTimeout(() => {
        onClose();
        // The auth context will handle the logout when it detects the user is gone
      }, 3000);
      
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (showConfirmation) {
    return (
      <div role="dialog" aria-labelledby="success-title" className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6 text-center">
          <h2 id="success-title" className="text-lg font-semibold text-green-600">Account Deleted Successfully</h2>
          <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
            Your account and all associated data have been permanently deleted. 
            You will be automatically logged out.
          </p>
          <div className="mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-2 text-xs text-gray-500">Logging out...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div role="dialog" aria-labelledby="delete-title" className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 id="delete-title" className="text-lg font-semibold">Delete Account</h2>
        <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
          {immediateMode 
            ? "Deleting your account will permanently remove all your data immediately. This cannot be undone."
            : "Deleting your account will permanently remove all your data after a 7-day grace period. You can cancel within the grace period."
          }
        </p>

        {pendingInfo && (
          <div className={`mt-3 p-3 border rounded ${
            pendingInfo.canConfirm 
              ? 'bg-red-50 border-red-200' 
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <p className="text-sm">Deletion scheduled for: {pendingInfo.scheduled || 'Unknown'}</p>
            <p className="text-sm">Days remaining: {pendingInfo.days ?? 'N/A'}</p>
            {pendingInfo.canConfirm && (
              <p className="text-sm font-semibold text-red-600 mt-2">
                Grace period has expired. Account deletion can now be finalized.
              </p>
            )}
          </div>
        )}

        <div className="mt-4 space-y-3">
          {!pendingInfo && (
            <label className="flex items-start space-x-2">
              <input 
                type="checkbox" 
                aria-label="Delete immediately without grace period" 
                checked={immediateMode} 
                onChange={(e) => setImmediateMode(e.target.checked)} 
              />
              <span className="text-sm text-red-600">Delete immediately (no 7-day grace period)</span>
            </label>
          )}
          
          <label className="flex items-start space-x-2">
            <input 
              type="checkbox" 
              aria-label="I understand this cannot be undone" 
              checked={confirmChecked} 
              onChange={(e) => setConfirmChecked(e.target.checked)} 
            />
            <span className="text-sm">
              {immediateMode 
                ? "I understand this will permanently delete all my data immediately"
                : "I understand this cannot be undone after the grace period"
              }
            </span>
          </label>
          
          <label className="block">
            <span className="text-sm">Confirm password</span>
            <input 
              aria-label="Confirm password" 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="mt-1 w-full border rounded p-2" 
            />
          </label>
        </div>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          {pendingInfo ? (
            <>
              {pendingInfo.canConfirm ? (
                <>
                  <button 
                    onClick={onFinalConfirm} 
                    disabled={submitting} 
                    className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {submitting ? 'Deleting...' : 'Finalize Deletion'}
                  </button>
                  <button onClick={onClose} className="px-4 py-2 rounded border">Cancel</button>
                </>
              ) : (
                <>
                  <button 
                    onClick={onCancelRequest} 
                    disabled={submitting} 
                    className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                  >
                    {submitting ? 'Canceling...' : 'Cancel Deletion Request'}
                  </button>
                  <button onClick={onClose} className="px-4 py-2 rounded border">Close</button>
                </>
              )}
            </>
          ) : (
            <>
              <button 
                onClick={onConfirm} 
                disabled={!confirmChecked || !password || submitting} 
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? 'Processing...' : (immediateMode ? 'Delete Now' : 'Request Deletion')}
              </button>
              <button onClick={onClose} className="px-4 py-2 rounded border">Close</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountDeletionModal;


