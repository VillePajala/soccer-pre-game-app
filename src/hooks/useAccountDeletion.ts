import { useCallback, useMemo } from 'react';
import { 
  requestAccountDeletion, 
  cancelAccountDeletion, 
  confirmAccountDeletion,
  canConfirmDeletion,
  type AccountDeletionResult 
} from '@/lib/supabase/accountDeletion';
import { supabase } from '@/lib/supabase';

export interface AccountDeletionState {
  hasPendingDeletion: boolean;
  scheduledDate?: string;
  daysRemaining?: number;
}

export function useAccountDeletion() {
  const getState = useCallback(async (): Promise<AccountDeletionState> => {
    const { data, error } = await supabase
      .from('account_deletion_requests')
      .select('scheduled_deletion_at, status')
      .maybeSingle();
    if (error || !data) return { hasPendingDeletion: false };
    const scheduled = data.scheduled_deletion_at as string | null;
    const pending = data.status === 'pending' && !!scheduled;
    const days = scheduled ? Math.ceil((new Date(scheduled).getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : undefined;
    return { hasPendingDeletion: pending, scheduledDate: scheduled || undefined, daysRemaining: days };
  }, []);

  const request = useCallback(async (userId: string, immediate = false): Promise<AccountDeletionResult> => {
    return requestAccountDeletion(userId, immediate);
  }, []);

  const cancel = useCallback(async (userId: string): Promise<boolean> => {
    return cancelAccountDeletion(userId);
  }, []);

  const confirm = useCallback(async (userId: string): Promise<AccountDeletionResult> => {
    return confirmAccountDeletion(userId);
  }, []);

  const checkCanConfirm = useCallback(async (userId: string) => {
    return canConfirmDeletion(userId);
  }, []);

  return useMemo(() => ({ 
    getState, 
    request, 
    cancel, 
    confirm, 
    checkCanConfirm 
  }), [getState, request, cancel, confirm, checkCanConfirm]);
}


