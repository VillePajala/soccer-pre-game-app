import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') ?? '/';

  console.log('[Auth Callback] Received request with:', { code: code?.substring(0, 10) + '...', type, next });

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
    
    console.log('[Auth Callback] Exchange code result:', { error: error?.message });
    
    if (!error) {
      // Always redirect to password reset page after successful code exchange
      // The reset password page will verify if this is a valid recovery session
      const redirectUrl = new URL('/auth/reset-password', requestUrl.origin);
      console.log('[Auth Callback] Redirecting to:', redirectUrl.toString());
      return NextResponse.redirect(redirectUrl);
    }
  }

  // If there's an error or no code, redirect to home with error
  const redirectUrl = new URL('/', requestUrl.origin);
  redirectUrl.searchParams.set('error', 'auth_callback_error');
  return NextResponse.redirect(redirectUrl);
}