-- Fix missing profile for any authenticated users
-- Run this in Supabase SQL Editor

-- First, check what columns exist in profiles table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Disable RLS temporarily to allow profile creation
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Create/update profiles for all users (using only existing columns)
-- Note: Adjust columns based on what actually exists in your profiles table
INSERT INTO public.profiles (id, email, full_name, updated_at)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', email),
  now()
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = now();

-- If you have different columns, adjust this query. For example:
-- If only id and email exist:
-- INSERT INTO public.profiles (id, email) 
-- SELECT id, email FROM auth.users 
-- WHERE id NOT IN (SELECT id FROM public.profiles);

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