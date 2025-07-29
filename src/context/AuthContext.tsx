'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { sessionManager } from '../lib/security/sessionManager';
import { SecureAuthService } from '../lib/security/rateLimiter';
import logger from '../utils/logger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null; rateLimited?: boolean; retryAfter?: number }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null; rateLimited?: boolean; retryAfter?: number; progressiveDelay?: number }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null; rateLimited?: boolean; retryAfter?: number }>;
  extendSession: () => void;
  sessionInfo: {
    isActive: boolean;
    lastActivity?: number;
    sessionStart?: number;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionInfo, setSessionInfo] = useState(() => sessionManager.getSessionInfo());

  useEffect(() => {
    // Initialize session manager
    sessionManager.initialize();

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          logger.error('Error getting session:', error);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
          if (session) {
            // Record activity for existing session
            sessionManager.recordActivity();
          }
        }
      } catch (error) {
        logger.error('Error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        logger.info('Auth state changed:', event);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Update session info
        setSessionInfo(sessionManager.getSessionInfo());
      }
    );

    // Update session info periodically
    const sessionInfoInterval = setInterval(() => {
      setSessionInfo(sessionManager.getSessionInfo());
    }, 30000); // Every 30 seconds

    return () => {
      subscription.unsubscribe();
      clearInterval(sessionInfoInterval);
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      // Use secure auth service with rate limiting
      const result = await SecureAuthService.signUp(email, password);
      
      if (!result.success) {
        return { 
          error: { message: result.error || 'Signup failed' } as AuthError,
          rateLimited: result.rateLimited,
          retryAfter: result.retryAfter
        };
      }

      // If rate limiting passed, proceed with actual Supabase signup
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // For production, we'd get the client IP from a server-side endpoint
      // For now, we'll pass undefined
      const clientIP = undefined;
      
      // Use secure auth service with rate limiting
      const result = await SecureAuthService.signIn(email, password, clientIP);
      
      if (!result.success) {
        return { 
          error: { message: result.error || 'Sign in failed' } as AuthError,
          rateLimited: result.rateLimited,
          retryAfter: result.retryAfter,
          progressiveDelay: result.progressiveDelay
        };
      }

      // If rate limiting passed, proceed with actual Supabase sign in
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (!error) {
        // Record activity on successful sign in
        sessionManager.recordActivity();
      }
      
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const signOut = async () => {
    try {
      // Cleanup session manager
      sessionManager.cleanup();
      
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      // Use secure auth service with rate limiting
      const result = await SecureAuthService.resetPassword(email);
      
      if (!result.success) {
        return { 
          error: { message: result.error || 'Password reset failed' } as AuthError,
          rateLimited: result.rateLimited,
          retryAfter: result.retryAfter
        };
      }

      // If rate limiting passed, proceed with actual Supabase password reset
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const extendSession = () => {
    sessionManager.extendSession();
    setSessionInfo(sessionManager.getSessionInfo());
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    extendSession,
    sessionInfo,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}