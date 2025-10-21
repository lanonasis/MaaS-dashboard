-- Fix missing profile for admin@lanonasis.com
-- Run this in Supabase SQL Editor

-- First, disable RLS temporarily to allow profile creation
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Create/update profile for admin user
INSERT INTO public.profiles (id, email, full_name, role, updated_at)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', 'Admin User'),
  'admin',
  now()
FROM auth.users
WHERE email = 'admin@lanonasis.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = 'admin',
  updated_at = now();

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Add missing INSERT policy if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Users can insert own profile'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id)';
  END IF;
END $$;