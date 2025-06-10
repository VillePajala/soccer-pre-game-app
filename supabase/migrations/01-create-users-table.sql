-- Create internal users table for vendor-agnostic user management
CREATE TABLE public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_auth_id TEXT UNIQUE NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  last_login_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for faster lookups
CREATE INDEX idx_users_clerk_auth_id ON public.users(clerk_auth_id);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policy (users can only see their own data)
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid()::text = clerk_auth_id); 