import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This is a server-side only file.
// The environment variables will be available here.

// Add more detailed logging for environment variables on the server
console.log('[API Route] SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Loaded' : 'MISSING');
console.log('[API Route] SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Loaded' : 'MISSING');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { clerkUserId, email } = await request.json();

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Clerk user ID is required' }, { status: 400 });
    }

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('clerk_auth_id', clerkUserId)
      .single();

    if (existingUser && !fetchError) {
      // Update last login
      await supabaseAdmin
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', existingUser.id);
      
      return NextResponse.json({ supabaseUserId: existingUser.id });
    }

    // Create new user if they don't exist
    const { data: newUser, error: createError } = await supabaseAdmin
      .from('users')
      .insert({
        clerk_auth_id: clerkUserId,
        email: email,
      })
      .select('id')
      .single();

    if (createError) {
      console.error('API Error - Failed to create Supabase user:', createError);
      return NextResponse.json({ error: `Failed to create Supabase user: ${createError.message}` }, { status: 500 });
    }

    if (!newUser?.id) {
      console.error('API Error - User created but failed to retrieve ID.');
      return NextResponse.json({ error: 'User created but failed to retrieve ID.' }, { status: 500 });
    }
    
    return NextResponse.json({ supabaseUserId: newUser.id });

  } catch (error) {
    console.error('API Error - General failure in sync-user route:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred on the server.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 