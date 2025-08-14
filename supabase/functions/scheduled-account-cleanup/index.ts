import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ProcessedUser {
  processed_user_id: string;
  deletion_summary: string;
}

serve(async (req) => {
  // This function should only be called by scheduled tasks or system administrators
  // Verify the request has the correct API key for scheduled functions
  const apiKey = req.headers.get('x-scheduled-function-key');
  const expectedKey = Deno.env.get('SCHEDULED_FUNCTION_SECRET_KEY');
  
  if (!expectedKey || apiKey !== expectedKey) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized: Invalid or missing scheduled function key' }),
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    // Initialize Supabase client with service role key for admin operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting scheduled account deletion cleanup...');

    // Execute the scheduled deletion processor
    const { data: processedUsers, error: processingError } = await supabase
      .rpc('process_expired_account_deletions');

    if (processingError) {
      console.error('Error processing expired account deletions:', processingError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to process expired account deletions',
          details: processingError.message
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    const processed = processedUsers as ProcessedUser[] || [];
    
    console.log(`Scheduled cleanup completed. Processed ${processed.length} expired account deletions.`);

    // For each processed user, also delete from Supabase Auth
    for (const processedUser of processed) {
      try {
        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
          processedUser.processed_user_id
        );
        
        if (authDeleteError) {
          console.error(`Failed to delete auth user ${processedUser.processed_user_id}:`, authDeleteError);
        } else {
          console.log(`Successfully deleted auth user ${processedUser.processed_user_id}`);
        }
      } catch (authError) {
        console.error(`Error deleting auth user ${processedUser.processed_user_id}:`, authError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Processed ${processed.length} expired account deletions`,
        processed_users: processed.map(user => ({
          user_id: user.processed_user_id,
          summary: user.deletion_summary
        })),
        processed_at: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error in scheduled account cleanup:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})