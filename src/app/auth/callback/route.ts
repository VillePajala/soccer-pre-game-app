import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') ?? '/';

  if (code) {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: Record<string, unknown>) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

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