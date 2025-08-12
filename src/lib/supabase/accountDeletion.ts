import { supabase } from '../supabase';

export interface AccountDeletionResult {
  success: boolean;
  deletedTables?: string[];
  errors?: string[];
  gracePeriodExpiry?: string;
}

export async function requestAccountDeletion(userId: string, immediate = false): Promise<AccountDeletionResult> {
  // Soft request: create or upsert into account_deletion_requests with scheduled date
  try {
    // If immediate deletion requested, schedule for right now, otherwise 7 days
    const scheduledDate = immediate 
      ? new Date().toISOString()
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      
    const { error } = await supabase
      .from('account_deletion_requests')
      .upsert({ user_id: userId, scheduled_deletion_at: scheduledDate, status: 'pending' });
    if (error) throw error;
    return { success: true, gracePeriodExpiry: scheduledDate };
  } catch (e) {
    return { success: false, errors: [e instanceof Error ? e.message : String(e)] };
  }
}

export async function cancelAccountDeletion(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('account_deletion_requests')
      .update({ status: 'cancelled' })
      .eq('user_id', userId)
      .not('status', 'eq', 'completed');
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}

// Confirm account deletion - calls secure edge function to actually delete all data
export async function confirmAccountDeletion(userId: string): Promise<AccountDeletionResult> {
  try {
    // Get the current user's access token for authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    // Call the secure edge function to process the actual deletion
    // Check if functions are available (not in lightweight client)
    if (!('functions' in supabase)) {
      throw new Error('Account deletion not available in lightweight mode');
    }
    const { data, error } = await (supabase as { functions: { invoke: (name: string, options: { body: unknown; headers: Record<string, string> }) => Promise<{ data?: unknown; error?: Error }> } }).functions.invoke('process-account-deletion', {
      body: { userId },
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (error) {
      throw error;
    }

    if (!data.success) {
      throw new Error(data.error || 'Account deletion failed');
    }

    return { 
      success: true, 
      deletedTables: data.deletedTables || [],
      gracePeriodExpiry: data.processed_at
    };
  } catch (e) {
    return { 
      success: false, 
      errors: [e instanceof Error ? e.message : String(e)] 
    };
  }
}

// New function to check if grace period has expired and deletion can be confirmed
export async function canConfirmDeletion(userId: string): Promise<{ canConfirm: boolean; reason?: string; scheduledDate?: string }> {
  try {
    const { data, error } = await supabase
      .from('account_deletion_requests')
      .select('scheduled_deletion_at, status')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return { canConfirm: false, reason: 'No deletion request found' };
    }

    if (data.status !== 'pending') {
      return { canConfirm: false, reason: `Deletion request is ${data.status}` };
    }

    const scheduledDate = new Date(data.scheduled_deletion_at);
    const now = new Date();

    if (now < scheduledDate) {
      return { 
        canConfirm: false, 
        reason: 'Grace period has not expired yet',
        scheduledDate: scheduledDate.toISOString()
      };
    }

    return { canConfirm: true, scheduledDate: scheduledDate.toISOString() };
  } catch (e) {
    return { 
      canConfirm: false, 
      reason: e instanceof Error ? e.message : String(e) 
    };
  }
}

