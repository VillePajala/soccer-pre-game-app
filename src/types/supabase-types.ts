/**
 * Lightweight Supabase type definitions to avoid importing the full @supabase/supabase-js library
 * This prevents the 515KB bundle size issue while maintaining type safety
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Core auth types that don't require the full Supabase bundle
export interface LightweightUser {
  id: string;
  email?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
  email_confirmed_at?: string;
  phone_confirmed_at?: string;
  last_sign_in_at?: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
}

export interface LightweightSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user: LightweightUser;
}

export interface LightweightAuthError {
  message: string;
  status?: number;
}

// Re-export common interfaces for backward compatibility
export type User = LightweightUser;
export type Session = LightweightSession;
export type AuthError = LightweightAuthError;

// Database operation types (minimal)
export interface SupabaseResponse<T> {
  data: T | null;
  error: Error | null;
}

export interface QueryBuilder {
  select: (columns?: string) => QueryBuilder;
  eq: (column: string, value: any) => QueryBuilder;
  limit: (count: number) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  single: () => Promise<SupabaseResponse<any>>;
}

// Auth method signatures (for type safety without full import)
export interface AuthMethods {
  getSession: () => Promise<{ data: { session: Session | null }, error: AuthError | null }>;
  getUser: () => Promise<{ data: { user: User | null }, error: AuthError | null }>;
  onAuthStateChange: (callback: (event: string, session: Session | null) => void) => { data: { subscription: { unsubscribe: () => void } } };
  signUp: (credentials: { email: string; password: string }) => Promise<{ data: any, error: AuthError | null }>;
  signInWithPassword: (credentials: { email: string; password: string }) => Promise<{ data: any, error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ data: any, error: AuthError | null }>;
  updateUser: (attributes: Partial<User>) => Promise<{ data: any, error: AuthError | null }>;
  setSession: (session: Session) => Promise<{ data: any, error: AuthError | null }>;
}

// Minimal client interface
export interface LightweightSupabaseClient {
  auth: AuthMethods;
  from: (table: string) => QueryBuilder;
}