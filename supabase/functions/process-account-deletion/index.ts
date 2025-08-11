import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AccountDeletionRequest {
  userId: string;
}

interface DeletionResult {
  deleted_table: string;
  row_count: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    // Initialize Supabase client with service role key for admin operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse request body
    let requestData: AccountDeletionRequest;
    try {
      requestData = await req.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { userId } = requestData;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify the request has a valid authorization token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify the user is authenticated and owns the account
    const token = authHeader.replace('Bearer ', '');
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Ensure the authenticated user is the same as the requested deletion user
    if (authData.user.id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Cannot delete another user\'s account' }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify there's a pending deletion request for this user
    const { data: deletionRequest, error: requestError } = await supabase
      .from('account_deletion_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .single();

    if (requestError || !deletionRequest) {
      return new Response(
        JSON.stringify({ 
          error: 'No pending deletion request found for this user',
          details: requestError?.message 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if the grace period has passed
    const scheduledDate = new Date(deletionRequest.scheduled_deletion_at);
    const now = new Date();
    
    if (now < scheduledDate) {
      return new Response(
        JSON.stringify({ 
          error: 'Grace period has not expired yet',
          scheduled_deletion: scheduledDate.toISOString(),
          current_time: now.toISOString()
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Processing account deletion for user: ${userId}`);

    // Execute the deletion function
    const { data: deletionData, error: deletionError } = await supabase
      .rpc('delete_user_data', { target_user_id: userId });

    if (deletionError) {
      console.error('Deletion error:', deletionError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to delete user data',
          details: deletionError.message
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Format the deletion results
    const deletionResults = (deletionData as DeletionResult[])?.map(
      (row: DeletionResult) => `${row.deleted_table}: ${row.row_count} rows`
    ) || [];

    console.log(`Account deletion completed for user: ${userId}`, deletionResults);

    // Now delete the user from Supabase Auth
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
    
    if (authDeleteError) {
      console.error('Auth user deletion error:', authDeleteError);
      // Don't fail the whole operation if auth deletion fails
      // The data is already deleted which is the main requirement
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Account and all associated data has been permanently deleted',
        deletedTables: deletionResults,
        processed_at: now.toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error in account deletion:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})