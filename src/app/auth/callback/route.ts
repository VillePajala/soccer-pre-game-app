import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Get the session to check if it's a recovery session
      const { data: { session } } = await supabase.auth.getSession();
      
      // If it's a password reset or we detect a recovery session
      if (type === 'recovery' || session?.user?.recovery_sent_at) {
        const redirectUrl = new URL('/auth/reset-password', requestUrl.origin);
        return NextResponse.redirect(redirectUrl);
      }
      
      // Otherwise redirect to the next URL or home
      const redirectUrl = new URL(next, requestUrl.origin);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // If there's an error or no code, redirect to home with error
  const redirectUrl = new URL('/', requestUrl.origin);
  redirectUrl.searchParams.set('error', 'auth_callback_error');
  return NextResponse.redirect(redirectUrl);
}