-- Migration: Add organization_id to profiles table
-- Date: 2026-03-27
-- Issue: profiles table missing organization_id column (multi-tenancy support)
-- Impact: Dashboard UserProfile doesn't show org, profiles incomplete
--
-- This migration:
-- 1. Adds organization_id column to public.profiles
-- 2. Backfills from public.users.organization_id
-- 3. Creates index for performance
-- 4. Updates RLS policies if needed

-- ============================================================================
-- STEP 1: Add organization_id column if it doesn't exist
-- ============================================================================

DO $$
BEGIN
  -- Check if column already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    
    RAISE NOTICE 'Added organization_id column to public.profiles';
  ELSE
    RAISE NOTICE 'organization_id column already exists in public.profiles';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Backfill organization_id from public.users
-- ============================================================================

UPDATE public.profiles p
SET organization_id = u.organization_id,
    updated_at = NOW()
FROM public.users u
WHERE p.id = u.id
  AND p.organization_id IS NULL
  AND u.organization_id IS NOT NULL;

-- Report how many were updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled organization_id for % profiles', updated_count;
END $$;

-- ============================================================================
-- STEP 3: Create index for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_organization_id 
ON public.profiles(organization_id);

-- ============================================================================
-- STEP 4: Update RLS policies (if RLS is enabled)
-- ============================================================================

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view own profile (including org_id)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Users can insert own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- STEP 5: Verify migration
-- ============================================================================

DO $$
DECLARE
  total_profiles INTEGER;
  profiles_with_org INTEGER;
  profiles_without_org INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_profiles FROM public.profiles;
  SELECT COUNT(*) INTO profiles_with_org FROM public.profiles WHERE organization_id IS NOT NULL;
  SELECT COUNT(*) INTO profiles_without_org FROM public.profiles WHERE organization_id IS NULL;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Profiles Migration Complete!';
  RAISE NOTICE '  Total profiles: %', total_profiles;
  RAISE NOTICE '  Profiles with org: %', profiles_with_org;
  RAISE NOTICE '  Profiles without org: %', profiles_without_org;
  RAISE NOTICE '========================================';
END $$;

-- Verification query
SELECT 
  'Migration Results' as report,
  (SELECT COUNT(*) FROM public.profiles) as total_profiles,
  (SELECT COUNT(*) FROM public.profiles WHERE organization_id IS NOT NULL) as profiles_with_org,
  (SELECT COUNT(*) FROM public.profiles WHERE organization_id IS NULL) as profiles_without_org;

-- Show sample data
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.organization_id,
  o.name as org_name,
  o.slug as org_slug
FROM public.profiles p
LEFT JOIN public.organizations o ON p.organization_id = o.id
ORDER BY p.created_at DESC
LIMIT 20;
