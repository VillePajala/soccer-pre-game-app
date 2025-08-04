'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { sessionManager } from '../lib/security/sessionManager';
import { SecureAuthService } from '../lib/security/rateLimiter';
import logger from '@/utils/logger';

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
        logger.info('Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          logger.error('Error getting session:', error);
        } else {
          logger.info('Initial session:', session ? 'Found session' : 'No session', session?.user?.email);
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`
        }
      });
      
      // Log for debugging
      logger.debug('Supabase signup response:', { data, error });
      
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
      logger.info('Starting sign out process...');
      
      // Cleanup session manager
      sessionManager.cleanup();
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        logger.error('Supabase sign out error:', error);
      } else {
        logger.info('Supabase sign out successful');
      }
      
      // Force clear local state
      setSession(null);
      setUser(null);
      setLoading(false);
      
      // Clear only Supabase auth storage (not all auth-related keys)
      if (typeof window !== 'undefined') {
        // Clear only specific Supabase auth storage keys to avoid clearing game data
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('sb-') && key.includes('supabase')) {
            logger.info('Clearing Supabase auth key:', key);
            localStorage.removeItem(key);
          }
        });
      }
      
      logger.info('Sign out process completed');
      return { error };
    } catch (error) {
      logger.error('Sign out error:', error);
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
      const { error } = await supabase.auth.resetPasswordForEmail(email);
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